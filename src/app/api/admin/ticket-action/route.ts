import { NextRequest, NextResponse } from "next/server"
import { requireStaff } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { withEvent } from "@/lib/ticket-history"
import { syncCourseEnrollment } from "@/lib/workflow-engine"

// 後台卡券人工操作：
// - extend：人工延期（改效期）——過期棄權的券可救回
// - restore：人工回復——已使用（含缺席核銷）退回未使用、已預約解除綁定退回未使用
export async function POST(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { ticketId, action, expiresAt } = await req.json() as {
    ticketId?: string; action?: "extend" | "restore"; expiresAt?: string
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
    if (!expiresAt || !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
      return NextResponse.json({ error: "請提供新效期（YYYY-MM-DD）" }, { status: 400 })
    }
    const { error } = await admin.from("tickets").update({
      expires_at: expiresAt,
      history: withEvent(t.history, "人工延期", `效期 ${t.expires_at ?? "—"} → ${expiresAt}`.replace(/-/g, "/")),
    }).eq("id", ticketId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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
    history: withEvent(t.history, "人工回復", "後台退回未使用"),
  }).eq("id", ticketId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await syncCourseEnrollment(courseId)
  return NextResponse.json({ ok: true })
}
