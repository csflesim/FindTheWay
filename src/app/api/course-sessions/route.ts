import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { upcomingSessions } from "@/lib/schedule"

// 課程接下來的場次與各堂剩餘名額（公開查詢，報名選日期用）。
// 名額 = capacity − 該堂已綁定（待使用＋已使用）的券數；RLS 擋會員互看票券，故由伺服器端計算。
export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get("courseId")
  if (!courseId) return NextResponse.json({ error: "缺少 courseId" }, { status: 400 })

  const admin = createAdminClient()
  const { data: course } = await admin
    .from("courses")
    .select("id, schedule, capacity, types")
    .eq("id", courseId)
    .maybeSingle()
  if (!course) return NextResponse.json({ error: "找不到課程" }, { status: 404 })

  const sessions = upcomingSessions(course.schedule, 8)
  if (sessions.length === 0) return NextResponse.json({ sessions: [] })

  const { data: bound } = await admin
    .from("tickets")
    .select("session_date")
    .eq("course_id", courseId)
    .in("status", ["待使用", "已使用"])
    .in("session_date", sessions.map(s => s.date))
  const countBy = new Map<string, number>()
  for (const t of bound ?? []) {
    countBy.set(t.session_date, (countBy.get(t.session_date) ?? 0) + 1)
  }

  return NextResponse.json({
    sessions: sessions.map(s => ({
      ...s,
      remaining: Math.max(0, (course.capacity ?? 0) - (countBy.get(s.date) ?? 0)),
    })),
  })
}
