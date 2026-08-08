import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// 點名名冊：
// - 內部課程：名冊＝綁定該課程＋該日期的券（待使用/已使用），合併既有點名紀錄狀態
// - 外部課程：純點名，回傳既有紀錄，由前端手動增減名單
// 權限：後台人員或該課程授課教師。

type SavedRecord = { name: string; status: string; ticketId?: string | null }

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const courseId = req.nextUrl.searchParams.get("courseId")
  const date = req.nextUrl.searchParams.get("date")
  if (!courseId || !date) return NextResponse.json({ error: "參數不完整" }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle()
  const isStaff = !!profile && ["staff", "admin"].includes(profile.role)
  if (!isStaff) {
    const { data: teacher } = await admin.from("teachers").select("id").eq("profile_id", user.id).maybeSingle()
    if (!teacher) return NextResponse.json({ error: "forbidden" }, { status: 403 })
    const { data: link } = await admin.from("course_teachers")
      .select("course_id").eq("course_id", courseId).eq("teacher_id", teacher.id).maybeSingle()
    if (!link) return NextResponse.json({ error: "非此課程授課教師" }, { status: 403 })
  }

  const { data: course } = await admin.from("courses").select("types").eq("id", courseId).maybeSingle()
  if (!course) return NextResponse.json({ error: "找不到課程" }, { status: 404 })
  const internal = (course.types ?? []).includes("內部")

  const { data: existing } = await admin
    .from("course_attendance")
    .select("id, records")
    .eq("course_id", courseId)
    .eq("date", date)
    .maybeSingle()
  const saved = ((existing?.records ?? []) as SavedRecord[])

  if (!internal) {
    return NextResponse.json({ internal: false, rowId: existing?.id ?? null, records: saved })
  }

  // 綁定此堂的券
  const { data: bound } = await admin
    .from("tickets")
    .select("id, ticket_no, status, student:students!student_id(name), transferee:students!transferred_to(name), orders!inner(member:profiles!member_id(name))")
    .eq("course_id", courseId)
    .eq("session_date", date)
    .in("status", ["待使用", "已使用"])
    .order("ticket_no")

  const savedByTicket = new Map(saved.filter(r => r.ticketId).map(r => [r.ticketId as string, r]))
  const records = ((bound ?? []) as unknown as {
    id: string; ticket_no: string; status: string
    student: { name: string } | null
    transferee: { name: string } | null
    orders: { member: { name: string } | null }
  }[]).map(t => ({
    name: t.transferee?.name ?? t.student?.name ?? t.orders.member?.name ?? "—",
    ticketId: t.id,
    ticketNo: t.ticket_no,
    status: savedByTicket.get(t.id)?.status ?? "出席",
  }))

  return NextResponse.json({ internal: true, rowId: existing?.id ?? null, records })
}
