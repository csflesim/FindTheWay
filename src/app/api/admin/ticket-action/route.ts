import { NextRequest, NextResponse } from "next/server"
import { requireStaffUser } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { withEvent, twToday } from "@/lib/ticket-history"
import { syncCourseEnrollment } from "@/lib/workflow-engine"

// 後台卡券人工操作：
// - extend：人工延期（在原效期上加 N 天；已過期則從今天起算）——過期棄權的券可救回
// - restore：人工回復——已使用（含缺席核銷）退回未使用、已預約解除綁定退回未使用
// - redeem：人工核銷——補登舊紀錄用（實際已上過課的券直接標已使用）
export async function POST(req: NextRequest) {
  const staff = await requireStaffUser()
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const actor = `${staff.name}（後台）`

  const { ticketId, action, days, note } = await req.json() as {
    ticketId?: string; action?: "extend" | "restore" | "redeem"; days?: number; note?: string
  }
  if (!ticketId || !action) return NextResponse.json({ error: "參數不完整" }, { status: 400 })

  const admin = createAdminClient()
  const { data: t } = await admin
    .from("tickets")
    .select("id, ticket_no, status, expires_at, course_id, session_date, history")
    .eq("id", ticketId)
    .maybeSingle()
  if (!t) return NextResponse.json({ error: "找不到課堂券" }, { status: 404 })

  if (action === "extend") {
    const n = Math.floor(Number(days))
    if (!n || n < 1 || n > 3650) {
      return NextResponse.json({ error: "請輸入要延長的天數（1–3650）" }, { status: 400 })
    }
    // 基準日：原效期；已過期或無效期則從今天起算（只會往後，不可能倒退）
    const today = twToday()
    const base = t.expires_at && t.expires_at >= today ? t.expires_at : today
    const d = new Date(`${base}T12:00:00`)
    d.setDate(d.getDate() + n)
    const newExpiry = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    const { error } = await admin.from("tickets").update({
      expires_at: newExpiry,
      history: withEvent(t.history, "人工延期", `效期 ${t.expires_at ?? "—"} → ${newExpiry}（+${n} 天）`.replace(/-/g, "/"), actor),
    }).eq("id", ticketId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, expiresAt: newExpiry })
  }

  // redeem：人工核銷（未使用/已預約 → 已使用），補登實際已上過的舊券
  if (action === "redeem") {
    if (t.status !== "未使用" && t.status !== "待使用") {
      return NextResponse.json({ error: "只有未使用或已預約的券能核銷" }, { status: 400 })
    }
    const courseId = t.course_id
    const { error } = await admin.from("tickets").update({
      status: "已使用",
      used_at: new Date().toISOString(),
      history: withEvent(t.history, "人工核銷", note?.trim() || "補登紀錄", actor),
    }).eq("id", ticketId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (courseId) await syncCourseEnrollment(courseId)
    return NextResponse.json({ ok: true })
  }

  // restore：退回未使用
  if (t.status !== "已使用" && t.status !== "待使用") {
    return NextResponse.json({ error: "只有已使用或已預約的券能回復" }, { status: 400 })
  }
  const courseId = t.course_id
  const { error } = await admin.from("tickets").update({
    status: "未使用",
    used_at: null,
    course_id: null,
    session_date: null,
    history: withEvent(t.history, "人工回復", "退回未使用", actor),
  }).eq("id", ticketId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await syncCourseEnrollment(courseId)
  return NextResponse.json({ ok: true })
}
