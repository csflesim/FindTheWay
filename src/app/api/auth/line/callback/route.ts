import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { getLineLoginConfig } from "@/lib/line-config"
import { exchangeLineToken, getLineProfile } from "@/lib/line"
import { createAdminClient } from "@/lib/supabase/admin"
import { PENDING_COOKIE, signToken } from "@/lib/line-pending"

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const storedState = req.cookies.get("line_state")?.value

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL("/m/login?error=invalid_state", BASE))
  }

  const config = await getLineLoginConfig()
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

    // whoami 模式：不動現有 session，直接把 LINE User ID 帶回來源頁面
    if (req.cookies.get("line_mode")?.value === "whoami") {
      const rawNext = req.cookies.get("line_next")?.value
      const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/sys-admin"
      const dest = new URL(next, BASE)
      dest.searchParams.set("lineUserId", profile.userId)
      dest.searchParams.set("lineName", profile.displayName ?? "")
      const res = NextResponse.redirect(dest)
      res.cookies.delete("line_state")
      res.cookies.delete("line_next")
      res.cookies.delete("line_mode")
      return res
    }

    const admin = createAdminClient()

    // 既有帳號：用 profiles.line_user_id 直查（unique）
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("line_user_id", profile.userId)
      .maybeSingle()

    // 首次 LINE 登入：不建帳號——LINE 只做身份驗證，身分暫存簽章 cookie（30 分鐘），
    // 到綁定頁完成 Email 驗證碼後才正式建立帳號（見 /api/member/verify-email）
    if (!existingProfile?.id) {
      const rawNext = req.cookies.get("line_next")?.value
      const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/m"
      const res = NextResponse.redirect(
        new URL(`/m/bind-email?next=${encodeURIComponent(next)}`, BASE),
      )
      res.cookies.delete("line_state")
      res.cookies.delete("line_next")
      res.cookies.set(
        PENDING_COOKIE,
        signToken({
          lineUserId: profile.userId,
          name: profile.displayName ?? "",
          avatar: profile.pictureUrl ?? "",
          exp: Date.now() + 30 * 60_000,
        }),
        { httpOnly: true, sameSite: "lax", secure: BASE.startsWith("https"), path: "/", maxAge: 1800 },
      )
      return res
    }

    const supabaseUid = existingProfile.id as string
    await admin.auth.admin.updateUserById(supabaseUid, {
      user_metadata: {
        line_user_id: profile.userId,
        display_name: profile.displayName,
        picture_url: profile.pictureUrl ?? "",
      },
    })

    // --- Generate a magic link token and exchange it for a real session ---
    const { data: authUser } = await admin.auth.admin.getUserById(supabaseUid)
    const accountEmail = authUser?.user?.email
    if (!accountEmail) {
      console.error("LINE user has no account email:", profile.userId)
      return NextResponse.redirect(new URL("/m/login?error=line_failed", BASE))
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: accountEmail,
    })

    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error("generateLink error:", linkErr)
      return NextResponse.redirect(new URL("/m/login?error=line_failed", BASE))
    }

    // Build response redirect first, then let the SSR client write session cookies onto it
    const rawNext = req.cookies.get("line_next")?.value
    const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/m"
    const res = NextResponse.redirect(new URL(next, BASE))
    res.cookies.delete("line_state")
    res.cookies.delete("line_next")

    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll() },
          setAll(list) {
            list.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
          },
        },
      },
    )

    const { error: verifyErr } = await ssrClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    })

    if (verifyErr) {
      console.error("verifyOtp error:", verifyErr)
      return NextResponse.redirect(new URL("/m/login?error=line_failed", BASE))
    }

    return res
  } catch (err) {
    console.error("LINE callback error:", err)
    return NextResponse.redirect(new URL("/m/login?error=line_failed", BASE))
  }
}
