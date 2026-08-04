import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// 驗證 Email 綁定驗證碼：通過後把帳號 email 換成真實信箱
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 })
  // 只有 LINE 註冊的合成帳號需要綁定，避免一般帳號（含管理員）誤觸換信箱
  if (!(user.email ?? "").endsWith("@findtheway.app")) {
    return NextResponse.json({ error: "此帳號已綁定 Email，不需重新綁定" }, { status: 403 })
  }

  const { code } = await req.json() as { code?: string }
  if (!code || !/^\d{6}$/.test(code.trim())) {
    return NextResponse.json({ error: "請輸入 6 位數驗證碼" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: u } = await admin.auth.admin.getUserById(user.id)
  const meta = (u?.user?.app_metadata ?? {}) as Record<string, unknown>

  const pendingEmail = String(meta.pending_email ?? "")
  const codeHash = String(meta.email_code_hash ?? "")
  const expires = Number(meta.email_code_expires ?? 0)

  if (!pendingEmail || !codeHash) {
    return NextResponse.json({ error: "請先寄送驗證碼" }, { status: 400 })
  }
  if (Date.now() > expires) {
    return NextResponse.json({ error: "驗證碼已過期，請重新寄送" }, { status: 400 })
  }
  const hash = crypto.createHash("sha256").update(code.trim()).digest("hex")
  if (hash !== codeHash) {
    return NextResponse.json({ error: "驗證碼錯誤" }, { status: 400 })
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email: pendingEmail,
    email_confirm: true,
    app_metadata: {
      ...meta,
      pending_email: null,
      email_code_hash: null,
      email_code_expires: null,
      email_verified: true,
    },
  })
  if (error) {
    const msg = /already|registered|exists/i.test(error.message)
      ? "此 Email 已被其他帳號使用"
      : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  return NextResponse.json({ ok: true, email: pendingEmail })
}
