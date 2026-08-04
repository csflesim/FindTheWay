import { createAdminClient } from "@/lib/supabase/admin"
import { fetchMsgTemplates, buildLineMessage, emailHtmlOf, fillVars, type MsgTemplate } from "@/lib/msg-templates"
import { pushLineMessage } from "@/lib/line"
import { getLineMsgConfig } from "@/lib/line-config"
import { sendEmail } from "@/lib/email"

// 工作流事件引擎（伺服器端）：
// 訂單事件發生時，找出「啟用中且觸發條件相符」的工作流，沿節點執行寄信/推播。
// 時間控制節點（delay/cron）在無排程器的情況下視為直通（立即執行下一步）。

export type WorkflowEvent =
  | { type: "payment"; subtype: "paid" | "pending" | "failed"; orderId: string }
  | { type: "order"; subtype: "created" | "confirmed" | "cancelled" | "completed"; orderId: string }

type FlowNode = {
  id: string; kind: string
  triggerType?: string; paymentEvent?: string; orderEvent?: string
  template?: string; emailTemplate?: string; lineTemplate?: string
  condField?: "payStatus" | "isRead" | "amount"; condOp?: "eq" | "neq" | "gt" | "lt"
  condValue?: string
}
type Edge = { id: string; from: string; fromPort: string; to: string }

type OrderCtx = {
  id: string
  order_no: string
  item_name: string
  amount: number
  status: string
  course_id: string | null
  member: { id: string; name: string; line_user_id: string | null } | null
  student: { name: string } | null
  course: { title: string; schedule: string } | null
  memberEmail: string | null
}

async function loadOrderCtx(orderId: string): Promise<OrderCtx | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("orders")
    .select("id, order_no, item_name, amount, status, course_id, member:profiles!member_id(id, name, line_user_id), student:students!student_id(name), course:courses!course_id(title, schedule)")
    .eq("id", orderId)
    .maybeSingle()
  if (!data) return null
  const ctx = data as unknown as Omit<OrderCtx, "memberEmail">
  let memberEmail: string | null = null
  if (ctx.member?.id) {
    const { data: u } = await admin.auth.admin.getUserById(ctx.member.id)
    const email = u?.user?.email ?? null
    memberEmail = email && !email.endsWith("@findtheway.app") ? email : null
  }
  return { ...ctx, memberEmail }
}

function varsFrom(o: OrderCtx): Record<string, string> {
  const [date, time] = (o.course?.schedule ?? "").split(" ")
  return {
    studentName: o.student?.name ?? o.member?.name ?? "會員",
    courseName: o.course?.title ?? o.item_name,
    courseDate: date ?? "",
    courseTime: time ?? "",
    teacherName: "",
    ticketCount: "",
    studioName: "忙碌不迷路藝術工作坊",
    loginUrl: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/m`,
    orderNo: o.order_no,
    amount: `NT$ ${o.amount.toLocaleString()}`,
  }
}

async function logSend(channel: "line" | "email", recipient: string, body: string, ok: boolean, error?: string) {
  try {
    await createAdminClient().from("message_logs").insert({
      channel, recipient, body,
      status: ok ? "sent" : "failed",
      error: error ?? null,
    })
  } catch { /* ignore */ }
}

/** 依訂單狀態異動同步課程已報名人數（enrolled = 該課程已付款/已售後訂單數） */
export async function syncCourseEnrollment(courseId: string | null | undefined) {
  if (!courseId) return
  const admin = createAdminClient()
  const { count } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)
    .in("status", ["已付款", "已售後"])
  await admin.from("courses").update({ enrolled: count ?? 0 }).eq("id", courseId)
}

async function execTemplateSends(
  tpl: MsgTemplate | undefined,
  channels: { email: boolean; line: boolean },
  ctx: OrderCtx,
  vars: Record<string, string>,
) {
  if (!tpl) return
  if (channels.email && ctx.memberEmail) {
    const r = await sendEmail({
      to: ctx.memberEmail,
      subject: fillVars(tpl.email.subject, vars) || tpl.name,
      html: emailHtmlOf(tpl, vars),
    })
    await logSend("email", ctx.memberEmail, `[工作流] ${tpl.name}`, r.ok, r.ok ? undefined : r.error)
  }
  if (channels.line && ctx.member?.line_user_id) {
    const cfg = await getLineMsgConfig()
    if (cfg.accessToken) {
      try {
        const msg = buildLineMessage(tpl.line, vars)
        const result = await pushLineMessage(cfg.accessToken, ctx.member.line_user_id, [msg])
        const ok = !result.message || result.message === "ok"
        await logSend("line", ctx.member.line_user_id, `[工作流] ${tpl.name}`, ok, ok ? undefined : result.message)
      } catch (e) {
        await logSend("line", ctx.member.line_user_id, `[工作流] ${tpl.name}`, false, String(e))
      }
    }
  }
}

function evalCondition(node: FlowNode, ctx: OrderCtx): boolean {
  const op = node.condOp ?? "eq"
  let left: string | number = ""
  if (node.condField === "amount") left = ctx.amount
  else if (node.condField === "payStatus") left = ctx.status === "已付款" ? "paid" : ctx.status
  else return true   // isRead 等無法在伺服器端判定 → 視為成立
  const right = node.condField === "amount" ? Number(node.condValue ?? 0) : (node.condValue ?? "")
  if (op === "eq") return left === right || String(left) === String(right)
  if (op === "neq") return String(left) !== String(right)
  if (op === "gt") return Number(left) > Number(right)
  if (op === "lt") return Number(left) < Number(right)
  return true
}

/** 觸發符合條件的工作流（BFS 執行所有分支） */
export async function fireWorkflows(event: WorkflowEvent): Promise<{ fired: number }> {
  const admin = createAdminClient()
  const [wfRes, ctx, templates] = await Promise.all([
    admin.from("workflows").select("id, name, enabled, nodes, edges").eq("variant", "general").eq("enabled", true),
    loadOrderCtx(event.orderId),
    fetchMsgTemplates(admin),
  ])
  if (!ctx) return { fired: 0 }
  const vars = varsFrom(ctx)
  const tplByName = new Map(templates.map(t => [t.name, t]))

  let fired = 0
  for (const wf of wfRes.data ?? []) {
    const nodes = (wf.nodes ?? []) as FlowNode[]
    const edges = (wf.edges ?? []) as Edge[]
    const trigger = nodes.find(n => n.kind === "trigger")
    if (!trigger) continue

    const matches =
      (event.type === "payment" && trigger.triggerType === "payment" && (trigger.paymentEvent ?? "paid") === event.subtype) ||
      (event.type === "order" && trigger.triggerType === "order" && (trigger.orderEvent ?? "created") === event.subtype)
    if (!matches) continue

    fired++
    const executed = new Set<string>()
    const queue: FlowNode[] = [trigger]
    let steps = 0
    while (queue.length > 0 && steps < 50) {
      const current = queue.shift()!
      if (executed.has(current.id)) continue
      executed.add(current.id); steps++

      let followPort = "out"
      if (current.kind === "email") {
        await execTemplateSends(tplByName.get(current.template ?? ""), { email: true, line: false }, ctx, vars)
      } else if (current.kind === "line") {
        await execTemplateSends(tplByName.get(current.template ?? ""), { email: false, line: true }, ctx, vars)
      } else if (current.kind === "notify") {
        await execTemplateSends(tplByName.get(current.emailTemplate ?? ""), { email: true, line: false }, ctx, vars)
        await execTemplateSends(tplByName.get(current.lineTemplate ?? ""), { email: false, line: true }, ctx, vars)
      } else if (current.kind === "condition") {
        followPort = evalCondition(current, ctx) ? "true" : "false"
      }
      // trigger / delay / social → 直通

      for (const e of edges.filter(e => e.from === current.id && e.fromPort === followPort)) {
        const n = nodes.find(x => x.id === e.to)
        if (n && !executed.has(n.id)) queue.push(n)
      }
    }
  }
  return { fired }
}
