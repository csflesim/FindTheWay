import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { fireWorkflows, syncCourseEnrollment, type WorkflowEvent } from "@/lib/workflow-engine"

// 觸發工作流事件。允許：後台人員，或該訂單所屬會員（前台下單後觸發「報名建立」）。
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await req.json() as Partial<WorkflowEvent>
  if (!body.type || !body.subtype || !body.orderId) {
    return NextResponse.json({ error: "參數不完整" }, { status: 400 })
  }

  const admin = createAdminClient()
  const [{ data: order }, { data: profile }] = await Promise.all([
    admin.from("orders").select("id, member_id, course_id").eq("id", body.orderId).maybeSingle(),
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ])
  if (!order) return NextResponse.json({ error: "找不到訂單" }, { status: 404 })

  const isStaff = !!profile && ["staff", "admin"].includes(profile.role)
  if (!isStaff && order.member_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // 訂單狀態異動時順便同步課程人數
  await syncCourseEnrollment(order.course_id)
  const result = await fireWorkflows(body as WorkflowEvent)
  return NextResponse.json({ ok: true, ...result })
}
