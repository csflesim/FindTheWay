import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getLineMsgConfig } from "@/lib/line-config"

// LINE Messaging API Webhook 接收端。
// 目前僅驗證簽章後回 200（推播不需要 webhook，此端點供 Console 驗證與未來擴充：
// 自動回覆、加好友事件、取得 userId 等）。
export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get("x-line-signature") ?? ""

  const { channelSecret } = getLineMsgConfig()
  if (channelSecret) {
    const expected = crypto
      .createHmac("sha256", channelSecret)
      .update(body)
      .digest("base64")
    if (signature !== expected) {
      return NextResponse.json({ error: "invalid signature" }, { status: 403 })
    }
  }

  try {
    const payload = JSON.parse(body)
    // 開發期先記 log，之後可在此處理 follow / message 事件
    for (const event of payload.events ?? []) {
      console.log("[line-webhook]", event.type, event.source?.userId ?? "")
    }
  } catch {
    /* LINE 的驗證請求可能是空 body */
  }

  return NextResponse.json({ ok: true })
}
