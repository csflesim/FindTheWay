import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sessionStartAt } from "@/lib/schedule"
import { withEvent, isExpired } from "@/lib/ticket-history"
import { syncCourseEnrollment } from "@/lib/workflow-engine"

// 取消上課：把「待使用」的券解除綁定退回「未使用」。
// 會員限制：券未過期、且距上課開始 > 商品取消期限（cancel_hours）。
// 後台（staff/admin）不受期限與過期限制，可代處理特殊狀況。
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 })

  const { ticketId } = await req.json() as { ticketId?: string }
  if (!ticketId) return NextResponse.json({ error: "缺少 ticketId" }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("role, name").eq("id", user.id).maybeSingle()
  const isStaff = !!profile && ["staff", "admin"].includes(profile.role)
  const actor = isStaff ? `${profile?.name || "後台"}（後台）` : `${profile?.name || "會員"}（會員）`

  const { data: t } = await admin
    .from("tickets")
    .select("id, ticket_no, status, expires_at, course_id, session_date, history, orders!inner(member_id, product:products!product_id(cancel_hours))")
    .eq("id", ticketId)
    .maybeSingle()
  if (!t) return NextResponse.json({ error: "找不到課堂券" }, { status: 404 })

  const order = t.orders as unknown as { member_id: string; product: { cancel_hours: number } | null }
  if (!isStaff && order.member_id !== user.id) {
    return NextResponse.json({ error: "課堂券不屬於你" }, { status: 403 })
  }
  if (t.status !== "待使用") {
    return NextResponse.json({ error: "此券不在報名狀態" }, { status: 400 })
  }

  if (!isStaff) {
    // 過期的待使用券鎖死：只能去上課（後台可人工處理）
    if (isExpired(t.expires_at)) {
      return NextResponse.json({ error: "此券已過期，報名資格保留但無法取消，僅能出席使用" }, { status: 400 })
    }
    // 取消期限：距上課開始須大於商品設定的小時數
    const { data: course } = await admin
      .from("courses").select("schedule").eq("id", t.course_id).maybeSingle()
    const start = course && t.session_date ? sessionStartAt(course.schedule, t.session_date) : null
    const hours = order.product?.cancel_hours ?? 24
    if (start && Date.now() > start.getTime() - hours * 3600_000) {
      return NextResponse.json({ error: `已超過取消期限（開課前 ${hours} 小時）` }, { status: 400 })
    }
  }

  const courseId = t.course_id
  const { error } = await admin.from("tickets").update({
    status: "未使用",
    course_id: null,
    session_date: null,
    history: withEvent(t.history, "取消上課", undefined, actor),
  }).eq("id", ticketId).eq("status", "待使用")
  if (error) return NextResponse.json({ error: `取消失敗：${error.message}` }, { status: 500 })

  await syncCourseEnrollment(courseId)
  return NextResponse.json({ ok: true })
}
