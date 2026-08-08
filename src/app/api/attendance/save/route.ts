import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { withEvent } from "@/lib/ticket-history"
import { syncCourseEnrollment } from "@/lib/workflow-engine"

// 儲存點名（券的唯一核銷路徑）：
// - 內部課程：名冊＝綁定該堂的券
//   出席 → 核銷（已使用）；缺席 → 照樣核銷（沒依期限取消＝視同使用）；延期 → 券退回未使用（解除綁定）
//   誤點修正：已核銷改回延期會退券；延期在畫面上改回出席會重新綁定核銷
// - 外部課程：純點名記錄，不碰券
// 權限：後台人員或該課程授課教師。

type InRecord = { name: string; status: string; ticketId?: string | null }

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { courseId, date, records } = await req.json() as {
    courseId?: string; date?: string; records?: InRecord[]
  }
  if (!courseId || !date || !Array.isArray(records)) {
    return NextResponse.json({ error: "參數不完整" }, { status: 400 })
  }

  const admin = createAdminClient()

  // ── 權限：staff/admin，或該課程授課教師 ──
  const { data: profile } = await admin.from("profiles").select("role, name").eq("id", user.id).maybeSingle()
  const isStaff = !!profile && ["staff", "admin"].includes(profile.role)
  let actor = `${profile?.name || "後台"}（後台）`
  if (!isStaff) {
    const { data: teacher } = await admin.from("teachers").select("id, name").eq("profile_id", user.id).maybeSingle()
    if (!teacher) return NextResponse.json({ error: "forbidden" }, { status: 403 })
    const { data: link } = await admin.from("course_teachers")
      .select("course_id").eq("course_id", courseId).eq("teacher_id", teacher.id).maybeSingle()
    if (!link) return NextResponse.json({ error: "非此課程授課教師" }, { status: 403 })
    actor = `${teacher.name}（教師）`
  }

  const { data: course } = await admin.from("courses").select("types, title").eq("id", courseId).maybeSingle()
  if (!course) return NextResponse.json({ error: "找不到課程" }, { status: 404 })
  const internal = (course.types ?? []).includes("內部")

  // ── 內部課程：依點名結果轉移券狀態 ──
  if (internal) {
    const ids = records.map(r => r.ticketId).filter(Boolean) as string[]
    if (ids.length > 0) {
      const { data: tickets } = await admin
        .from("tickets")
        .select("id, status, course_id, session_date, history")
        .in("id", ids)
      const byId = new Map((tickets ?? []).map(t => [t.id, t]))

      for (const r of records) {
        if (!r.ticketId) continue
        const t = byId.get(r.ticketId)
        if (!t) continue

        if (r.status === "出席" || r.status === "缺席") {
          // 要核銷：待使用（或誤退回的未使用）→ 已使用
          if (t.status !== "已使用") {
            const redeemEvent = r.status === "出席" ? "核銷（出席）" : "核銷（缺席）"
            const history = t.status === "未使用"
              ? withEvent(withEvent(t.history, "報名", `${course.title} ${date.replace(/-/g, "/")}`, actor), redeemEvent, undefined, actor)
              : withEvent(t.history, redeemEvent, undefined, actor)
            const { error } = await admin.from("tickets").update({
              status: "已使用",
              used_at: new Date().toISOString(),
              course_id: courseId,
              session_date: date,
              history,
            }).eq("id", t.id)
            if (error) return NextResponse.json({ error: `核銷失敗：${error.message}` }, { status: 500 })
          }
        } else if (r.status === "延期") {
          // 延期：券退回未使用、解除綁定，之後可重新報名任何場次
          if (t.status !== "未使用") {
            const { error } = await admin.from("tickets").update({
              status: "未使用",
              used_at: null,
              course_id: null,
              session_date: null,
              history: withEvent(t.history, "延期退回", `${course.title} ${date.replace(/-/g, "/")}`, actor),
            }).eq("id", t.id)
            if (error) return NextResponse.json({ error: `退回失敗：${error.message}` }, { status: 500 })
          }
        }
      }
    }
  }

  // ── 寫入點名紀錄 ──
  const outRecords = records.map(r => ({
    name: r.name, status: r.status,
    ...(r.ticketId ? { ticketId: r.ticketId } : {}),
  }))
  const { data: existing } = await admin
    .from("course_attendance")
    .select("id")
    .eq("course_id", courseId)
    .eq("date", date)
    .maybeSingle()
  let rowId = existing?.id ?? null
  if (rowId) {
    const { error } = await admin.from("course_attendance").update({ records: outRecords }).eq("id", rowId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { data, error } = await admin.from("course_attendance")
      .insert({ course_id: courseId, date, records: outRecords })
      .select("id").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    rowId = data.id
  }

  if (internal) await syncCourseEnrollment(courseId)

  const consumed = records.filter(r => r.ticketId && (r.status === "出席" || r.status === "缺席")).length
  return NextResponse.json({ ok: true, rowId, consumed })
}
