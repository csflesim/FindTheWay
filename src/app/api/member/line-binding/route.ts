import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// 會員 LINE 綁定／解綁（寫入會員表；同一 LINE 可同時綁在教師表／人員表，互不影響）

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 })

  const { lineUserId } = await req.json() as { lineUserId?: string }
  if (!lineUserId || !/^U[0-9a-f]{32}$/i.test(lineUserId)) {
    return NextResponse.json({ error: "LINE ID 格式不正確" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (me?.role !== "member") return NextResponse.json({ error: "僅會員帳號可在此綁定" }, { status: 403 })

  // 同一 LINE 在會員表內只能綁一個帳號
  const { data: taken } = await admin.from("profiles")
    .select("id").eq("role", "member").eq("line_user_id", lineUserId).neq("id", user.id).maybeSingle()
  if (taken) return NextResponse.json({ error: "此 LINE 已綁定其他會員帳號" }, { status: 400 })

  const { error } = await admin.from("profiles").update({ line_user_id: lineUserId }).eq("id", user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 })

  const admin = createAdminClient()
  const { error } = await admin.from("profiles").update({ line_user_id: null }).eq("id", user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
