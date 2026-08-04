import { NextRequest, NextResponse } from "next/server"
import { requireStaff } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

// 為教師建立 / 更新登入帳號：
// - Email 已有帳號 → 重設密碼，並確保角色為 teacher、綁定 teachers.profile_id
// - 沒有帳號 → 建立新帳號（免驗證），設角色 teacher 並綁定
export async function POST(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { teacherId, email, password } = await req.json() as {
    teacherId?: string; email?: string; password?: string
  }
  if (!teacherId || !email || !password) {
    return NextResponse.json({ error: "教師、Email 與密碼為必填" }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "密碼至少 8 碼" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: teacher } = await admin.from("teachers")
    .select("id, name, profile_id").eq("id", teacherId).maybeSingle()
  if (!teacher) return NextResponse.json({ error: "找不到教師" }, { status: 404 })

  // 找既有帳號
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = (list?.users ?? []).find(u => u.email?.toLowerCase() === email.toLowerCase())

  let userId: string
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    userId = existing.id
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: teacher.name },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    userId = data.user.id
  }

  // 角色升級為 teacher（不動 staff/admin），並綁定教師檔
  const { data: profile } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle()
  if (profile && profile.role === "member") {
    await admin.from("profiles").update({ role: "teacher", name: teacher.name }).eq("id", userId)
  }
  await admin.from("teachers").update({ profile_id: userId }).eq("id", teacherId)

  return NextResponse.json({ ok: true, created: !existing })
}
