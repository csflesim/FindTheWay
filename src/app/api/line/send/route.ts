import { NextRequest, NextResponse } from "next/server"
import { getLineMsgConfig } from "@/lib/line-config"
import { pushLineMessage, broadcastLineMessage } from "@/lib/line"
import { requireStaff } from "@/lib/admin-guard"

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

  const config = getLineMsgConfig()
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
      return NextResponse.json({ error: result.message, detail: result }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
