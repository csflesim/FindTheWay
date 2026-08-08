import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { upcomingSessions } from "@/lib/schedule"
import { withEvent, isExpired } from "@/lib/ticket-history"
import { syncCourseEnrollment } from "@/lib/workflow-engine"

// 用課堂券報名：把「未使用」的券綁定到課程＋日期（→ 待使用），立即生效不經後台。
// 一次可綁多堂：dates 與 ticketIds 一一對應。
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 })

  const { courseId, dates, ticketIds } = await req.json() as {
    courseId?: string; dates?: string[]; ticketIds?: string[]
  }
  if (!courseId || !Array.isArray(dates) || !Array.isArray(ticketIds) ||
      dates.length === 0 || dates.length !== ticketIds.length) {
    return NextResponse.json({ error: "參數不完整" }, { status: 400 })
  }
  if (new Set(ticketIds).size !== ticketIds.length) {
    return NextResponse.json({ error: "同一張券不能重複使用" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: course } = await admin
    .from("courses")
    .select("id, title, types, status, schedule, capacity, ticket_types")
    .eq("id", courseId)
    .maybeSingle()
  if (!course) return NextResponse.json({ error: "找不到課程" }, { status: 404 })
  if (!(course.types ?? []).includes("內部")) {
    return NextResponse.json({ error: "此課程不開放線上報名" }, { status: 400 })
  }
  if (course.status !== "開課中") {
    return NextResponse.json({ error: "課程目前未開放報名" }, { status: 400 })
  }

  // 日期必須是班表接下來的場次
  const valid = new Set(upcomingSessions(course.schedule, 60).map(s => s.date))
  for (const d of dates) {
    if (!valid.has(d)) return NextResponse.json({ error: `${d} 不是此課程的開課日` }, { status: 400 })
  }

  // 券必須是自己的、未使用、未過期、券種在課程允許清單
  const allowed = new Set((course.ticket_types ?? []) as string[])
  const { data: tickets } = await admin
    .from("tickets")
    .select("id, ticket_no, status, expires_at, history, orders!inner(member_id, product_id)")
    .in("id", ticketIds)
  const rows = (tickets ?? []) as unknown as {
    id: string; ticket_no: string; status: string; expires_at: string | null; history: unknown
    orders: { member_id: string; product_id: string | null }
  }[]
  if (rows.length !== ticketIds.length) {
    return NextResponse.json({ error: "找不到部分課堂券" }, { status: 400 })
  }
  for (const t of rows) {
    if (t.orders.member_id !== user.id) return NextResponse.json({ error: "課堂券不屬於你" }, { status: 403 })
    if (t.status !== "未使用") return NextResponse.json({ error: `${t.ticket_no} 不是未使用狀態` }, { status: 400 })
    if (isExpired(t.expires_at)) return NextResponse.json({ error: `${t.ticket_no} 已過期` }, { status: 400 })
    if (allowed.size > 0 && !allowed.has(t.orders.product_id ?? "")) {
      return NextResponse.json({ error: `${t.ticket_no} 的券種不適用此課程` }, { status: 400 })
    }
  }

  // 各堂名額檢查（含這次要佔的數量）
  const perDate = new Map<string, number>()
  for (const d of dates) perDate.set(d, (perDate.get(d) ?? 0) + 1)
  for (const [d, n] of perDate) {
    const { count } = await admin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId)
      .eq("session_date", d)
      .in("status", ["待使用", "已使用"])
    if ((count ?? 0) + n > (course.capacity ?? 0)) {
      return NextResponse.json({ error: `${d} 名額不足（剩 ${Math.max(0, (course.capacity ?? 0) - (count ?? 0))} 位）` }, { status: 400 })
    }
  }

  // 逐張綁定
  for (let i = 0; i < ticketIds.length; i++) {
    const t = rows.find(r => r.id === ticketIds[i])!
    const { error } = await admin.from("tickets").update({
      status: "待使用",
      course_id: courseId,
      session_date: dates[i],
      history: withEvent(t.history, "報名", `${course.title} ${dates[i].replace(/-/g, "/")}`),
    }).eq("id", ticketIds[i]).eq("status", "未使用")
    if (error) return NextResponse.json({ error: `綁定失敗：${error.message}` }, { status: 500 })
  }

  await syncCourseEnrollment(courseId)
  return NextResponse.json({ ok: true, booked: ticketIds.length })
}
