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

    // Supabase 會把 email 轉小寫儲存，這裡必須先轉小寫，否則第二次登入比對不到
    const syntheticEmail = `line_${profile.userId}@findtheway.app`.toLowerCase()

    const admin = createAdminClient()

    // --- Find or create Supabase auth user ---
    let supabaseUid: string | undefined

    // 1) 既有帳號：用 profiles.line_user_id 直查（unique）
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("line_user_id", profile.userId)
      .maybeSingle()
    if (existingProfile?.id) {
      supabaseUid = existingProfile.id as string
      await admin.auth.admin.updateUserById(existingProfile.id as string, {
        user_metadata: {
          line_user_id: profile.userId,
          display_name: profile.displayName,
          picture_url: profile.pictureUrl ?? "",
        },
      })
    }

    // 2) 沒有 → 建新帳號
    if (!supabaseUid) {
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
        // Email 已存在但 profile 沒記到 line_user_id — 用 email（小寫比對）掃描補救
        let page = 1
        outer: while (true) {
          const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
          if (!list || list.users.length === 0) break
          for (const u of list.users) {
            if (u.email?.toLowerCase() === syntheticEmail) {
              supabaseUid = u.id
              await admin.auth.admin.updateUserById(u.id, {
                user_metadata: {
                  line_user_id: profile.userId,
                  display_name: profile.displayName,
                  picture_url: profile.pictureUrl ?? "",
                },
              })
              // 補寫 line_user_id 讓下次直查命中
              await admin.from("profiles").update({ line_user_id: profile.userId }).eq("id", u.id)
              break outer
            }
          }
          if (list.users.length < 1000) break
          page++
        }
      }
    }

    if (!supabaseUid) {
      console.error("Cannot find or create Supabase user for LINE ID:", profile.userId)
      return NextResponse.redirect(new URL("/m/login?error=line_failed", BASE))
    }

    // --- Generate a magic link token and exchange it for a real session ---
    // 綁定過真實 Email 的帳號，magiclink 必須用實際帳號 email 產生
    const { data: authUser } = await admin.auth.admin.getUserById(supabaseUid)
    const accountEmail = authUser?.user?.email ?? syntheticEmail

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
    // 尚未綁定真實 Email → 先到綁定頁（驗證碼驗證後才放行）
    const needsBind = accountEmail.endsWith("@findtheway.app")
    const dest = needsBind ? `/m/bind-email?next=${encodeURIComponent(next)}` : next
    const res = NextResponse.redirect(new URL(dest, BASE))
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
