import { NextRequest, NextResponse } from "next/server"
import { requireStaff } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

// 為教師建立 / 重設「獨立教師帳號」：
// 教師身分有專屬識別碼帳號（teacher-<教師ID>@login.findtheway.app），
// 與會員／後台帳號完全獨立——同一個 Email 可同時存在三端。
// 登入時輸入的 Email／電話只是查教師表的鍵，實際驗證走此專屬帳號。

const teacherAuthEmail = (teacherId: string) => `teacher-${teacherId.toLowerCase()}@login.findtheway.app`

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { teacherId, email, password } = await req.json() as {
    teacherId?: string; email?: string; password?: string
  }
  if (!teacherId || !password) {
    return NextResponse.json({ error: "教師與密碼為必填" }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "密碼至少 8 碼" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: teacher } = await admin.from("teachers")
    .select("id, name, profile_id, photo_url").eq("id", teacherId).maybeSingle()
  if (!teacher) return NextResponse.json({ error: "找不到教師" }, { status: 404 })

  const authEmail = teacherAuthEmail(teacher.id)

  // 既有專屬帳號 → 重設密碼；否則建立
  let userId: string | null = null
  if (teacher.profile_id) {
    const { data: u } = await admin.auth.admin.getUserById(teacher.profile_id as string)
    if (u?.user?.email === authEmail) userId = u.user.id
  }
  let created = false
  if (userId) {
    const { error } = await admin.auth.admin.updateUserById(userId, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: authEmail, password, email_confirm: true,
      user_metadata: { display_name: teacher.name, registered_via: "teacher" },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    userId = data.user.id
    created = true
    // trigger 已建 profile → 設為教師角色並同步頭貼
    await admin.from("profiles").update({
      role: "teacher", name: teacher.name,
      ...(teacher.photo_url ? { avatar_url: teacher.photo_url } : {}),
    }).eq("id", userId)
    // 綁定教師檔（取代舊的共用帳號連結）
    await admin.from("teachers").update({ profile_id: userId }).eq("id", teacherId)
  }

  // 順帶更新教師聯絡 Email（登入查表鍵）
  if (email && email.includes("@")) {
    await admin.from("teachers").update({ email: email.trim().toLowerCase() }).eq("id", teacherId)
  }

  return NextResponse.json({ ok: true, created })
}
