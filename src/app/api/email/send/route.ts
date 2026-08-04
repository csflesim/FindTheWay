import { NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"
import { requireStaff } from "@/lib/admin-guard"

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }
  try {
    const body = await req.json()
    const { to, subject, html, text, from, replyTo, cc, bcc } = body

    if (!to || !subject) {
      return NextResponse.json({ ok: false, error: "缺少必要欄位：to、subject" }, { status: 400 })
    }
    if (!html && !text) {
      return NextResponse.json({ ok: false, error: "html 與 text 至少需提供一項" }, { status: 400 })
    }

    const result = await sendEmail({ to, subject, html, text, from, replyTo, cc, bcc })
    return NextResponse.json(result, { status: result.ok ? 200 : 502 })
  } catch {
    return NextResponse.json({ ok: false, error: "伺服器錯誤" }, { status: 500 })
  }
}
