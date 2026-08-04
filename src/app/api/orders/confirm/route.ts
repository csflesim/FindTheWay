import { NextRequest, NextResponse } from "next/server"
import { requireStaff } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { fireWorkflows, syncCourseEnrollment } from "@/lib/workflow-engine"

// 確認付款（後台）：
// 1. 課堂券扣抵訂單 → 自動把來源券包的一張未使用票券標記「已使用」
// 2. 券包訂單 → 依商品效期發券
// 3. 課程訂單 → 同步課程已報名人數
// 4. 觸發工作流事件（付款成功 / 報名確認）

function pad(n: number) { return String(n).padStart(2, "0") }

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { orderId, payMethod } = await req.json() as { orderId?: string; payMethod?: string }
  if (!orderId) return NextResponse.json({ error: "缺少 orderId" }, { status: 400 })

  const admin = createAdminClient()
  const { data: order } = await admin
    .from("orders")
    .select("id, order_no, status, qty, notes, course_id, product_id, student_id, tickets(id)")
    .eq("id", orderId)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: "找不到訂單" }, { status: 404 })
  if (order.status !== "待確認") return NextResponse.json({ error: "此訂單不是待確認狀態" }, { status: 400 })

  // ── 課堂券扣抵：核銷來源券包的一張票 ──
  const deductMatch = (order.notes ?? "").match(/課堂券扣抵（(ORD-\d+)）/)
  if (deductMatch) {
    const { data: source } = await admin
      .from("orders")
      .select("id, student_id, tickets(id, status, transferred_to, student_id, expires_at)")
      .eq("order_no", deductMatch[1])
      .maybeSingle()
    const candidates = ((source?.tickets ?? []) as {
      id: string; status: string; transferred_to: string | null; student_id: string | null; expires_at: string | null
    }[])
      .filter(t => t.status === "未使用" && !t.transferred_to)
      .sort((a, b) => (a.expires_at ?? "9999").localeCompare(b.expires_at ?? "9999"))
    if (candidates.length === 0) {
      return NextResponse.json({ error: `來源券包 ${deductMatch[1]} 已無可用票券，無法扣抵` }, { status: 400 })
    }
    // 優先扣持有人與本單學員相同的票
    const preferred = candidates.find(t => t.student_id === order.student_id) ?? candidates[0]
    const { error: tErr } = await admin
      .from("tickets")
      .update({ status: "已使用", used_at: new Date().toISOString() })
      .eq("id", preferred.id)
    if (tErr) return NextResponse.json({ error: `核銷票券失敗：${tErr.message}` }, { status: 500 })
  }

  // ── 訂單標記已付款 ──
  const { error: oErr } = await admin
    .from("orders")
    .update({ status: "已付款", pay_method: payMethod ?? null, paid_at: new Date().toISOString() })
    .eq("id", orderId)
  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 })

  // ── 券包訂單：發券 ──
  if (order.product_id && (order.tickets ?? []).length === 0) {
    const { data: product } = await admin
      .from("products")
      .select("validity_months")
      .eq("id", order.product_id)
      .maybeSingle()
    let expiresAt: string | null = null
    if (product?.validity_months) {
      const d = new Date()
      d.setMonth(d.getMonth() + product.validity_months)
      expiresAt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }
    const num = order.order_no.replace("ORD-", "")
    const rows = Array.from({ length: order.qty }, (_, i) => ({
      ticket_no: `TK-${num}-${pad(i + 1)}`,
      order_id: order.id,
      student_id: order.student_id,
      status: "未使用",
      expires_at: expiresAt,
    }))
    const { error: insErr } = await admin.from("tickets").insert(rows)
    if (insErr) return NextResponse.json({ error: `發券失敗：${insErr.message}` }, { status: 500 })
  }

  // ── 課程報名人數同步 + 工作流觸發 ──
  await syncCourseEnrollment(order.course_id)
  try {
    await fireWorkflows({ type: "payment", subtype: "paid", orderId })
    if (order.course_id) {
      await fireWorkflows({ type: "order", subtype: "confirmed", orderId })
    }
  } catch (e) {
    console.error("workflow fire error:", e)
  }

  return NextResponse.json({ ok: true })
}
