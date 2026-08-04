import { NextRequest, NextResponse } from "next/server"
import { requireStaff } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

// 後台會員管理：profiles 沒有 email（在 auth.users），故列表/建立/刪除經此 API。

export async function GET() {
  if (!(await requireStaff())) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const admin = createAdminClient()

  const [profilesRes, usersRes] = await Promise.all([
    admin.from("profiles").select("id, name, phone, role, line_user_id, avatar_url, created_at"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])
  const emailById = new Map((usersRes.data?.users ?? []).map(u => [u.id, u.email ?? ""]))

  const members = (profilesRes.data ?? [])
    .filter(p => p.role === "member")
    .map(p => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      email: emailById.get(p.id) ?? "",
      lineUserId: p.line_user_id,
      avatarUrl: p.avatar_url,
      createdAt: p.created_at,
    }))
  return NextResponse.json({ members })
}

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { name, email, phone, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: "Email 與密碼為必填" }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: name ?? "" },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // trigger 已建 profile，補上姓名/電話
  await admin.from("profiles")
    .update({ name: name ?? "", phone: phone || null, role: "member" })
    .eq("id", data.user.id)

  return NextResponse.json({ ok: true, id: data.user.id })
}

export async function PATCH(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id, name, phone, password } = await req.json()
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from("profiles")
    .update({ name: name ?? "", phone: phone || null })
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (password) {
    const { error: pwErr } = await admin.auth.admin.updateUserById(id, { password })
    if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
