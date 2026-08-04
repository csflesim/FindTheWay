import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// 會員轉讓課堂券：把自己訂單內的未使用票券 transferred_to 設為名下學員。
// 票券寫入權限僅後台，故經此 API 驗證擁有權後以 service role 執行。
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 })
  }

  const { orderId, toStudentId, qty } = await req.json() as {
    orderId?: string; toStudentId?: string; qty?: number
  }
  const count = Math.floor(Number(qty))
  if (!orderId || !toStudentId || !count || count < 1) {
    return NextResponse.json({ error: "參數不完整" }, { status: 400 })
  }

  const admin = createAdminClient()

  // 訂單必須是自己的且已付款
  const { data: order } = await admin
    .from("orders")
    .select("id, member_id, status, tickets(id, status, transferred_to, student_id)")
    .eq("id", orderId)
    .maybeSingle()
  if (!order || order.member_id !== user.id) {
    return NextResponse.json({ error: "找不到訂單" }, { status: 404 })
  }
  if (order.status !== "已付款") {
    return NextResponse.json({ error: "此訂單無可轉讓票券" }, { status: 400 })
  }

  // 轉讓對象必須是自己名下已核准的學員
  const { data: student } = await admin
    .from("students")
    .select("id, owner_id, status")
    .eq("id", toStudentId)
    .maybeSingle()
  if (!student || student.owner_id !== user.id || student.status !== "已核准") {
    return NextResponse.json({ error: "轉讓對象無效" }, { status: 400 })
  }

  const transferable = (order.tickets as { id: string; status: string; transferred_to: string | null }[])
    .filter(t => t.status === "未使用" && !t.transferred_to)
  if (transferable.length < count) {
    return NextResponse.json({ error: `可轉讓票券不足（剩 ${transferable.length} 張）` }, { status: 400 })
  }

  const ids = transferable.slice(0, count).map(t => t.id)
  const { error } = await admin
    .from("tickets")
    .update({ transferred_to: toStudentId })
    .in("id", ids)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, transferred: ids.length })
}
