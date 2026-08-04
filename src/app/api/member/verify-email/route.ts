import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { createServerClient } from "@supabase/ssr"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  PENDING_COOKIE, CODE_COOKIE, verifyToken,
  type LinePending, type EmailCodeState,
} from "@/lib/line-pending"

// 驗證 Email 驗證碼：通過後才正式建立帳號（真實信箱 + LINE 身分）並簽入 session。
export async function POST(req: NextRequest) {
  const pending = verifyToken<LinePending>(req.cookies.get(PENDING_COOKIE)?.value)
  if (!pending) {
    return NextResponse.json({ error: "LINE 登入已逾時，請重新用 LINE 登入" }, { status: 401 })
  }

  const state = verifyToken<EmailCodeState>(req.cookies.get(CODE_COOKIE)?.value)
  if (!state) {
    return NextResponse.json({ error: "請先寄送驗證碼" }, { status: 400 })
  }

  const { code } = await req.json() as { code?: string }
  if (!code || !/^\d{6}$/.test(code.trim())) {
    return NextResponse.json({ error: "請輸入 6 位數驗證碼" }, { status: 400 })
  }
  if (Date.now() > state.expires) {
    return NextResponse.json({ error: "驗證碼已過期，請重新寄送" }, { status: 400 })
  }
  const hash = crypto.createHash("sha256").update(code.trim()).digest("hex")
  if (hash !== state.hash) {
    return NextResponse.json({ error: "驗證碼錯誤" }, { status: 400 })
  }

  const admin = createAdminClient()

  // 正式建立帳號——trigger 會自動建 profile（含 LINE 頭貼與 line_user_id）
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: state.email,
    email_confirm: true,
    user_metadata: {
      line_user_id: pending.lineUserId,
      display_name: pending.name,
      picture_url: pending.avatar,
      registered_via: "line",
    },
  })
  if (createErr || !created?.user) {
    const msg = /already|registered|exists|duplicate/i.test(createErr?.message ?? "")
      ? "此 Email 已被其他帳號使用，請改用其他信箱"
      : createErr?.message ?? "建立帳號失敗"
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // 簽入 session：magiclink token 直接換 session cookie
  const res = NextResponse.json({ ok: true, email: state.email })
  res.cookies.delete(PENDING_COOKIE)
  res.cookies.delete(CODE_COOKIE)

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: state.email,
  })
  if (linkErr || !linkData?.properties?.hashed_token) {
    // 帳號已建立，只是自動登入失敗——請使用者再用 LINE 登入一次即可直接進入
    console.error("generateLink error after signup:", linkErr)
    return res
  }

  const ssrClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(list) {
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
        },
      },
    },
  )
  const { error: verifyErr } = await ssrClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  })
  if (verifyErr) console.error("verifyOtp error after signup:", verifyErr)

  return res
}
