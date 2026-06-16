import { NextRequest, NextResponse } from "next/server"
import { getLineConfig } from "@/lib/line-config"
import { exchangeLineToken, getLineProfile } from "@/lib/line"

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const storedState = req.cookies.get("line_state")?.value

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL("/m/login?error=invalid_state", BASE))
  }

  const config = getLineConfig()
  const redirectUri = `${BASE}/api/auth/line/callback`

  try {
    const tokenData = await exchangeLineToken(
      code,
      config.channelId,
      config.channelSecret,
      redirectUri,
    )

    if (tokenData.error) {
      console.error("LINE token error:", tokenData)
      return NextResponse.redirect(new URL("/m/login?error=token_failed", BASE))
    }

    const profile = await getLineProfile(tokenData.access_token)

    const session = JSON.stringify({
      lineUserId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl ?? "",
    })

    const res = NextResponse.redirect(new URL("/m", BASE))
    res.cookies.set("ftw_session", session, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    res.cookies.delete("line_state")
    return res
  } catch (err) {
    console.error("LINE callback error:", err)
    return NextResponse.redirect(new URL("/m/login?error=line_failed", BASE))
  }
}
