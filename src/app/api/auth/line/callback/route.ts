import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { getLineLoginConfig } from "@/lib/line-config"
import { exchangeLineToken, getLineProfile } from "@/lib/line"
import { createAdminClient } from "@/lib/supabase/admin"

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

    const syntheticEmail = `line_${profile.userId}@findtheway.app`

    const admin = createAdminClient()

    // --- Find or create Supabase auth user ---
    let supabaseUid: string | undefined

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      email_confirm: true,
      user_metadata: {
        line_user_id: profile.userId,
        display_name: profile.displayName,
        picture_url: profile.pictureUrl ?? "",
      },
    })

    if (!createErr) {
      supabaseUid = created.user.id
    } else {
      // User already exists — scan by synthetic email (acceptable at workshop scale)
      let page = 1
      outer: while (true) {
        const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
        if (!list || list.users.length === 0) break
        for (const u of list.users) {
          if (u.email === syntheticEmail) {
            supabaseUid = u.id
            await admin.auth.admin.updateUserById(u.id, {
              user_metadata: {
                line_user_id: profile.userId,
                display_name: profile.displayName,
                picture_url: profile.pictureUrl ?? "",
              },
            })
            break outer
          }
        }
        if (list.users.length < 1000) break
        page++
      }
    }

    if (!supabaseUid) {
      console.error("Cannot find or create Supabase user for LINE ID:", profile.userId)
      return NextResponse.redirect(new URL("/m/login?error=line_failed", BASE))
    }

    // --- Generate a magic link token and exchange it for a real session ---
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: syntheticEmail,
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
