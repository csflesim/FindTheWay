import { NextRequest, NextResponse } from "next/server"
import { getLineMsgConfig } from "@/lib/line-config"
import { pushLineMessage, broadcastLineMessage } from "@/lib/line"
import { requireStaff } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

function summarize(messages: object[]): string {
  const m = messages[0] as { type?: string; text?: string; altText?: string } | undefined
  if (!m) return "—"
  if (m.type === "text") return m.text ?? "—"
  if (m.type === "flex") return `[Flex] ${m.altText ?? ""}`
  return `[${m.type ?? "message"}]`
}

async function logSend(recipient: string, body: string, ok: boolean, error?: string) {
  try {
    await createAdminClient().from("message_logs").insert({
      channel: "line", recipient, body,
      status: ok ? "sent" : "failed",
      error: error ?? null,
    })
  } catch { /* 記錄失敗不影響發送結果 */ }
}

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { to, messages, broadcast } = body as {
    to?: string
    messages: object[]
    broadcast?: boolean
  }
  const recipient = broadcast ? "全體推播" : (to ?? "—")
  const summary = summarize(messages ?? [])

  const config = await getLineMsgConfig()
  if (!config.accessToken) {
    return NextResponse.json(
      { error: "尚未設定 LINE Channel Access Token，請至後台「參數管理」填入。" },
      { status: 503 },
    )
  }

  try {
    const result = broadcast
      ? await broadcastLineMessage(config.accessToken, messages)
      : await pushLineMessage(config.accessToken, to!, messages)

    if (result.message && result.message !== "ok") {
      await logSend(recipient, summary, false, result.message)
      return NextResponse.json({ error: result.message, detail: result }, { status: 400 })
    }

    await logSend(recipient, summary, true)
    return NextResponse.json({ ok: true })
  } catch (err) {
    await logSend(recipient, summary, false, String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
