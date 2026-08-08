import { NextRequest, NextResponse } from "next/server"
import { requireStaffUser } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { fireWorkflows, syncCourseEnrollment } from "@/lib/workflow-engine"
import { withEvent } from "@/lib/ticket-history"

// 確認付款（後台）：
// 1. 依商品發券（券包 = 未使用；單堂直購 = 發券後立即綁定課程日期 → 待使用）
// 2. 直購綁定前檢查各堂名額，額滿則擋下確認
// 3. 同步課程已報名數、觸發工作流事件（付款成功 / 報名確認）

function pad(n: number) { return String(n).padStart(2, "0") }

export async function POST(req: NextRequest) {
  const staff = await requireStaffUser()
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const actor = `${staff.name}（後台）`
  const { orderId, payMethod } = await req.json() as { orderId?: string; payMethod?: string }
  if (!orderId) return NextResponse.json({ error: "缺少 orderId" }, { status: 400 })

  const admin = createAdminClient()
  const { data: order } = await admin
    .from("orders")
    .select("id, order_no, status, qty, notes, course_id, product_id, student_id, booking_dates, tickets(id)")
    .eq("id", orderId)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: "找不到訂單" }, { status: 404 })
  if (order.status !== "待確認") return NextResponse.json({ error: "此訂單不是待確認狀態" }, { status: 400 })

  const bookingDates = (Array.isArray(order.booking_dates) ? order.booking_dates : []) as string[]

  // ── 直購綁定前：各堂名額檢查 ──
  if (order.course_id && bookingDates.length > 0) {
    const { data: course } = await admin
      .from("courses").select("capacity").eq("id", order.course_id).maybeSingle()
    const perDate = new Map<string, number>()
    for (const d of bookingDates) perDate.set(d, (perDate.get(d) ?? 0) + 1)
    for (const [d, cnt] of perDate) {
      const { count } = await admin
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("course_id", order.course_id)
        .eq("session_date", d)
        .in("status", ["待使用", "已使用"])
      if ((count ?? 0) + cnt > (course?.capacity ?? 0)) {
        return NextResponse.json({ error: `${d.replace(/-/g, "/")} 名額已滿，無法確認此報名，請與會員協調改期` }, { status: 400 })
      }
    }
  }

  // ── 訂單標記已付款 ──
  const { error: oErr } = await admin
    .from("orders")
    .update({ status: "已付款", pay_method: payMethod ?? null, paid_at: new Date().toISOString() })
    .eq("id", orderId)
  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 })

  // ── 發券（含單堂直購自動綁定）──
  if (order.product_id && (order.tickets ?? []).length === 0) {
    const [{ data: product }, { data: course }] = await Promise.all([
      admin.from("products").select("validity_months, name").eq("id", order.product_id).maybeSingle(),
      order.course_id
        ? admin.from("courses").select("title").eq("id", order.course_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    let expiresAt: string | null = null
    if (product?.validity_months) {
      const d = new Date()
      d.setMonth(d.getMonth() + product.validity_months)
      expiresAt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }
    const num = order.order_no.replace("ORD-", "")
    const rows = Array.from({ length: order.qty }, (_, i) => {
      const bindDate = bookingDates[i] ?? null
      const bound = !!(order.course_id && bindDate)
      let history = withEvent([], "發券", `訂單 ${order.order_no}`, actor)
      if (bound) {
        history = withEvent(history, "報名", `${(course as { title?: string } | null)?.title ?? ""} ${bindDate!.replace(/-/g, "/")}`.trim(), actor)
      }
      return {
        ticket_no: `TK-${num}-${pad(i + 1)}`,
        order_id: order.id,
        student_id: order.student_id,
        status: bound ? "待使用" : "未使用",
        course_id: bound ? order.course_id : null,
        session_date: bindDate,
        expires_at: expiresAt,
        history,
      }
    })
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
