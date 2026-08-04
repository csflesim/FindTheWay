import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"
import {
  PENDING_COOKIE, CODE_COOKIE, signToken, verifyToken,
  type LinePending, type EmailCodeState,
} from "@/lib/line-pending"

// 寄送 Email 驗證碼（LINE 首次登入註冊用）。
// 此時帳號尚未建立——LINE 身分在簽章 cookie 裡，驗證碼雜湊也放簽章 cookie（不可竄改）。

const COOLDOWN_MS = 60_000
const EXPIRES_MS = 10 * 60_000
const SECURE = (process.env.NEXT_PUBLIC_BASE_URL ?? "").startsWith("https")

// 綁定頁查詢暫存身分是否有效
export async function GET(req: NextRequest) {
  const pending = verifyToken<LinePending>(req.cookies.get(PENDING_COOKIE)?.value)
  return NextResponse.json({ pending: !!pending, name: pending?.name ?? "" })
}

export async function POST(req: NextRequest) {
  const pending = verifyToken<LinePending>(req.cookies.get(PENDING_COOKIE)?.value)
  if (!pending) {
    return NextResponse.json({ error: "LINE 登入已逾時，請重新用 LINE 登入" }, { status: 401 })
  }

  const { email } = await req.json() as { email?: string }
  const target = (email ?? "").trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
    return NextResponse.json({ error: "Email 格式不正確" }, { status: 400 })
  }
  if (target.endsWith("@findtheway.app")) {
    return NextResponse.json({ error: "請使用你自己的 Email" }, { status: 400 })
  }

  // 冷卻：60 秒內不重複寄送
  const prev = verifyToken<EmailCodeState>(req.cookies.get(CODE_COOKIE)?.value)
  if (prev && Date.now() - prev.sentAt < COOLDOWN_MS) {
    return NextResponse.json({ error: "驗證碼已寄出，請稍候再重新發送" }, { status: 429 })
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const hash = crypto.createHash("sha256").update(code).digest("hex")

  const result = await sendEmail({
    to: target,
    subject: "【忙碌不迷路藝術工作坊】Email 驗證碼",
    text: `您的驗證碼是：${code}\n\n請在 10 分鐘內回到頁面輸入完成註冊。若非本人操作請忽略此信。`,
  })
  // 記入發送紀錄（不含驗證碼內容）
  try {
    await createAdminClient().from("message_logs").insert({
      channel: "email", recipient: target, subject: "Email 綁定驗證碼",
      status: result.ok ? "sent" : "failed",
      error: result.ok ? null : result.error,
    })
  } catch { /* ignore */ }
  if (!result.ok) {
    return NextResponse.json({ error: `寄送失敗：${result.error}` }, { status: 502 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(
    CODE_COOKIE,
    signToken({
      email: target,
      hash,
      expires: Date.now() + EXPIRES_MS,
      sentAt: Date.now(),
      exp: Date.now() + EXPIRES_MS + COOLDOWN_MS,
    }),
    { httpOnly: true, sameSite: "lax", secure: SECURE, path: "/", maxAge: 660 },
  )
  return res
}
