import { NextResponse } from "next/server"
import crypto from "crypto"
import { getLineLoginConfig } from "@/lib/line-config"
import { buildLineAuthUrl } from "@/lib/line"

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"

export async function GET(req: Request) {
  const config = await getLineLoginConfig()
  if (!config.channelId) {
    return NextResponse.json(
      { error: "尚未設定 LINE Channel ID，請至後台「參數管理」填入。" },
      { status: 503 },
    )
  }

  const state = crypto.randomBytes(16).toString("hex")
  const redirectUri = `${BASE}/api/auth/line/callback`
  const authUrl = buildLineAuthUrl(config.channelId, redirectUri, state)

  const res = NextResponse.redirect(authUrl)
  res.cookies.set("line_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  })

  // 登入成功後要導回的頁面（僅允許站內路徑）
  const url = new URL(req.url)
  const next = url.searchParams.get("next")
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    res.cookies.set("line_next", next, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 300,
      path: "/",
    })
  }

  // whoami 模式：只取 LINE User ID 帶回頁面，不建立/切換登入 session
  if (url.searchParams.get("mode") === "whoami") {
    res.cookies.set("line_mode", "whoami", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 300,
      path: "/",
    })
  }
  return res
}
