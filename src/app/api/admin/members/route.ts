import { NextRequest, NextResponse } from "next/server"
import { requireStaff } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

// 後台會員管理：profiles 沒有 email（在 auth.users），故列表/建立/刪除經此 API。

export async function GET(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const admin = createAdminClient()

  // scope=staff → 系統人員（staff/admin/teacher）；預設 → 會員
  const scope = req.nextUrl.searchParams.get("scope")
  const roles = scope === "staff" ? ["staff", "admin", "teacher"] : ["member"]

  const [profilesRes, usersRes, teachersRes] = await Promise.all([
    admin.from("profiles").select("id, name, phone, role, line_user_id, avatar_url, created_at"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("teachers").select("profile_id, photo_url"),
  ])
  const userById = new Map((usersRes.data?.users ?? []).map(u => [u.id, u]))
  const teacherPhotoById = new Map(
    (teachersRes.data ?? []).filter(t => t.profile_id && t.photo_url).map(t => [t.profile_id as string, t.photo_url as string])
  )

  // 代用帳號（無 Email 的會員）不對外顯示
  const displayEmail = (e: string | undefined) =>
    !e || e.endsWith("@login.findtheway.app") ? "" : e

  const members = (profilesRes.data ?? [])
    .filter(p => roles.includes(p.role))
    .map(p => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      role: p.role,
      email: displayEmail(userById.get(p.id)?.email),
      lastSignInAt: userById.get(p.id)?.last_sign_in_at ?? null,
      lineUserId: p.line_user_id,
      avatarUrl: p.avatar_url ?? teacherPhotoById.get(p.id) ?? null,   // 教師頭貼作為 fallback
      createdAt: p.created_at,
    }))
  return NextResponse.json({ members })
}

const ALLOWED_ROLES = ["member", "teacher", "staff", "admin"]

// 電話在端內（同角色群組）必須唯一，否則電話＋密碼登入會對不到人
function roleGroup(role: string): string[] {
  if (role === "staff" || role === "admin") return ["staff", "admin"]
  return [role]
}
async function phoneTaken(admin: ReturnType<typeof createAdminClient>, tel: string, role: string, excludeId?: string): Promise<boolean> {
  let q = admin.from("profiles").select("id").in("role", roleGroup(role)).eq("phone", tel).limit(1)
  if (excludeId) q = q.neq("id", excludeId)
  const { data } = await q.maybeSingle()
  return !!data
}

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { name, email, phone, password, role } = await req.json()
  const mail = (email ?? "").trim().toLowerCase()
  const tel = (phone ?? "").replace(/[- ]/g, "")
  if ((!mail && !tel) || !password) {
    return NextResponse.json({ error: "電話或 Email 至少填一項，密碼為必填" }, { status: 400 })
  }
  const finalRole = ALLOWED_ROLES.includes(role) ? role : "member"

  const admin = createAdminClient()
  if (tel && await phoneTaken(admin, tel, finalRole)) {
    return NextResponse.json({ error: "此電話已被使用" }, { status: 400 })
  }

  // 沒填 Email → 產生系統代用帳號；本人以電話＋密碼或 LINE 登入
  const authEmail = mail || `member-${crypto.randomUUID()}@login.findtheway.app`
  const { data, error } = await admin.auth.admin.createUser({
    email: authEmail, password, email_confirm: true,
    user_metadata: { full_name: name ?? "" },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // trigger 已建 profile，補上姓名/電話/角色
  await admin.from("profiles")
    .update({ name: name ?? "", phone: tel || null, role: finalRole })
    .eq("id", data.user.id)

  return NextResponse.json({ ok: true, id: data.user.id })
}

export async function PATCH(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id, name, email, phone, password, role } = await req.json()
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 })

  const admin = createAdminClient()
  const { data: current } = await admin.from("profiles").select("role, phone").eq("id", id).maybeSingle()
  if (!current) return NextResponse.json({ error: "找不到帳號" }, { status: 404 })

  const tel = phone === undefined ? undefined : (phone ?? "").replace(/[- ]/g, "")
  const mail = email === undefined ? undefined : (email ?? "").trim().toLowerCase()

  // 電話與 Email 至少要留一個（避免改到兩者皆空、無法登入）
  const { data: u } = await admin.auth.admin.getUserById(id)
  const hasRealEmail = mail !== undefined
    ? !!mail
    : !!u?.user?.email && !u.user.email.endsWith("@login.findtheway.app")
  const hasPhone = tel !== undefined ? !!tel : !!current.phone
  if (!hasRealEmail && !hasPhone) {
    return NextResponse.json({ error: "電話或 Email 至少保留一項" }, { status: 400 })
  }

  if (tel && await phoneTaken(admin, tel, current.role, id)) {
    return NextResponse.json({ error: "此電話已被使用" }, { status: 400 })
  }

  const patch: Record<string, unknown> = { name: name ?? "" }
  if (tel !== undefined) patch.phone = tel || null
  if (role && ALLOWED_ROLES.includes(role)) patch.role = role
  const { error } = await admin.from("profiles")
    .update(patch)
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Email 後補／變更（登入帳號跟著換）
  if (mail && mail !== u?.user?.email) {
    const { error: mErr } = await admin.auth.admin.updateUserById(id, { email: mail, email_confirm: true })
    if (mErr) {
      const msg = /already|registered|exists|duplicate/i.test(mErr.message) ? "此 Email 已被其他帳號使用" : mErr.message
      return NextResponse.json({ error: msg }, { status: 400 })
    }
  }

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
