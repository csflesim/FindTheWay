import { NextRequest, NextResponse } from "next/server"
import { requireStaffUser } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

// 後台人員個人設定：聯絡電話／Email（另兩種登入的查表鍵）與 LINE 綁定

export async function GET() {
  const staff = await requireStaffUser()
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const [{ data: p }, { data: u }] = await Promise.all([
    admin.from("profiles").select("name, role, phone, contact_email, line_user_id").eq("id", staff.id).maybeSingle(),
    admin.auth.admin.getUserById(staff.id),
  ])
  return NextResponse.json({
    name: p?.name ?? "",
    role: p?.role ?? "",
    account: u?.user?.email ?? "",
    phone: p?.phone ?? "",
    contactEmail: p?.contact_email ?? "",
    lineBound: !!p?.line_user_id,
  })
}

export async function PATCH(req: NextRequest) {
  const staff = await requireStaffUser()
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { phone, contactEmail, lineUserId, unbindLine } = await req.json() as {
    phone?: string; contactEmail?: string; lineUserId?: string; unbindLine?: boolean
  }

  const admin = createAdminClient()
  const patch: Record<string, unknown> = {}

  if (phone !== undefined) patch.phone = phone.replace(/[- ]/g, "") || null
  if (contactEmail !== undefined) {
    const v = contactEmail.trim().toLowerCase()
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      return NextResponse.json({ error: "Email 格式不正確" }, { status: 400 })
    }
    patch.contact_email = v || null
  }
  if (unbindLine) patch.line_user_id = null
  if (lineUserId) {
    if (!/^U[0-9a-f]{32}$/i.test(lineUserId)) {
      return NextResponse.json({ error: "LINE ID 格式不正確" }, { status: 400 })
    }
    const { data: taken } = await admin.from("profiles")
      .select("id").in("role", ["staff", "admin"])
      .eq("line_user_id", lineUserId).neq("id", staff.id).maybeSingle()
    if (taken) return NextResponse.json({ error: "此 LINE 已綁定其他後台人員" }, { status: 400 })
    patch.line_user_id = lineUserId
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true })
  const { error } = await admin.from("profiles").update(patch).eq("id", staff.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
