import { NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"
import { requireStaff } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

async function logSend(recipient: string, subject: string, ok: boolean, error?: string) {
  try {
    await createAdminClient().from("message_logs").insert({
      channel: "email", recipient, subject,
      status: ok ? "sent" : "failed",
      error: error ?? null,
    })
  } catch { /* 記錄失敗不影響發送結果 */ }
}

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }
  try {
    const body = await req.json()
    const { to, subject, html, text, from, replyTo, cc, bcc, broadcast } = body

    if (!subject) {
      return NextResponse.json({ ok: false, error: "缺少必要欄位：subject" }, { status: 400 })
    }
    if (!html && !text) {
      return NextResponse.json({ ok: false, error: "html 與 text 至少需提供一項" }, { status: 400 })
    }

    // 全體發信：寄給所有有真實 Email 的會員
    if (broadcast) {
      const admin = createAdminClient()
      const [profilesRes, usersRes] = await Promise.all([
        admin.from("profiles").select("id, role"),
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ])
      const memberIds = new Set((profilesRes.data ?? []).filter(p => p.role === "member").map(p => p.id))
      const emails = (usersRes.data?.users ?? [])
        .filter(u => memberIds.has(u.id) && u.email && !u.email.endsWith("@findtheway.app"))
        .map(u => u.email as string)
      if (emails.length === 0) {
        await logSend("全體發信", subject, false, "沒有可寄送的會員 Email（LINE 帳號無 Email）")
        return NextResponse.json({ ok: false, error: "沒有可寄送的會員 Email（LINE 註冊的帳號沒有信箱）" }, { status: 400 })
      }
      let sent = 0
      let lastError: string | undefined
      for (const email of emails) {
        const r = await sendEmail({ to: email, subject, html, text, from, replyTo })
        if (r.ok) sent++
        else lastError = r.error
      }
      await logSend(`全體發信（${sent}/${emails.length}）`, subject, sent > 0, lastError)
      return NextResponse.json({ ok: sent > 0, sent, total: emails.length, error: sent === 0 ? lastError : undefined })
    }

    if (!to) {
      return NextResponse.json({ ok: false, error: "缺少必要欄位：to" }, { status: 400 })
    }
    const recipient = Array.isArray(to) ? to.join(", ") : String(to)
    const result = await sendEmail({ to, subject, html, text, from, replyTo, cc, bcc })
    await logSend(recipient, subject, result.ok, result.ok ? undefined : result.error)
    return NextResponse.json(result, { status: result.ok ? 200 : 502 })
  } catch {
    return NextResponse.json({ ok: false, error: "伺服器錯誤" }, { status: 500 })
  }
}
