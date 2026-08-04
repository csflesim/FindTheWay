import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"

// 寄送 Email 綁定驗證碼（LINE 註冊後綁定真實信箱用）。
// 驗證碼雜湊存在 app_metadata（僅 service role 可寫，使用者無法竄改）。

const COOLDOWN_MS = 60_000
const EXPIRES_MS = 10 * 60_000

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 })

  const { email } = await req.json() as { email?: string }
  const target = (email ?? "").trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
    return NextResponse.json({ error: "Email 格式不正確" }, { status: 400 })
  }
  if (target.endsWith("@findtheway.app")) {
    return NextResponse.json({ error: "請使用你自己的 Email" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: u } = await admin.auth.admin.getUserById(user.id)
  const meta = (u?.user?.app_metadata ?? {}) as Record<string, unknown>

  // 冷卻：60 秒內不重複寄送
  const lastSent = Number(meta.email_code_sent_at ?? 0)
  if (Date.now() - lastSent < COOLDOWN_MS) {
    return NextResponse.json({ error: "驗證碼已寄出，請稍候再重新發送" }, { status: 429 })
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const hash = crypto.createHash("sha256").update(code).digest("hex")

  const result = await sendEmail({
    to: target,
    subject: "【忙碌不迷路藝術工作坊】Email 驗證碼",
    text: `您的驗證碼是：${code}\n\n請在 10 分鐘內回到頁面輸入完成綁定。若非本人操作請忽略此信。`,
  })
  // 記入發送紀錄（不含驗證碼內容）
  try {
    await admin.from("message_logs").insert({
      channel: "email", recipient: target, subject: "Email 綁定驗證碼",
      status: result.ok ? "sent" : "failed",
      error: result.ok ? null : result.error,
    })
  } catch { /* ignore */ }
  if (!result.ok) {
    return NextResponse.json({ error: `寄送失敗：${result.error}` }, { status: 502 })
  }

  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...meta,
      pending_email: target,
      email_code_hash: hash,
      email_code_expires: Date.now() + EXPIRES_MS,
      email_code_sent_at: Date.now(),
    },
  })

  return NextResponse.json({ ok: true })
}
