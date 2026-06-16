import { NextRequest, NextResponse } from "next/server"
import { saveLineConfig } from "@/lib/line-config"

export async function POST(req: NextRequest) {
  const body = await req.json()
  saveLineConfig({
    channelId: body.line_channel_id ?? "",
    channelSecret: body.line_channel_secret ?? "",
    accessToken: body.line_access_token ?? "",
    liffId: body.line_liff_id ?? "",
  })
  return NextResponse.json({ ok: true })
}
