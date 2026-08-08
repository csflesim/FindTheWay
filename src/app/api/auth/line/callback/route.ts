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

    // 端口分流：每個端只查自己的表（member 預設 / teacher / staff）
    const portal = req.cookies.get("line_portal")?.value ?? "member"
    const loginPage = portal === "teacher" ? "/m/teacher/login"
      : portal === "staff" ? "/sys-admin/login" : "/m/login"
    const defaultNext = portal === "teacher" ? "/m/teacher"
      : portal === "staff" ? "/sys-admin" : "/m"
    const rawNext = req.cookies.get("line_next")?.value
    const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : defaultNext

    // 以 magiclink token 換 session，cookie 寫在導向回應上
    async function signInAs(uid: string): Promise<NextResponse> {
      const { data: authUser } = await admin.auth.admin.getUserById(uid)
      const accountEmail = authUser?.user?.email
      if (!accountEmail) throw new Error("account email missing")
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink", email: accountEmail,
      })
      if (linkErr || !linkData?.properties?.hashed_token) throw new Error(linkErr?.message ?? "generateLink failed")
      const res = NextResponse.redirect(new URL(next, BASE))
      res.cookies.delete("line_state")
      res.cookies.delete("line_next")
      res.cookies.delete("line_portal")
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
      if (verifyErr) throw new Error(verifyErr.message)
      return res
    }

    // ── 教師端：只對照教師表的 LINE 綁定 ──
    if (portal === "teacher") {
      const { data: t } = await admin.from("teachers")
        .select("id, profile_id").eq("line_user_id", profile.userId).maybeSingle()
      if (!t?.profile_id) {
        return NextResponse.redirect(new URL(`${loginPage}?error=line_unbound`, BASE))
      }
      return await signInAs(t.profile_id as string)
    }

    // ── 後台：只對照人員表（staff/admin）的 LINE 綁定 ──
    if (portal === "staff") {
      const { data: p } = await admin.from("profiles")
        .select("id").in("role", ["staff", "admin"])
        .eq("line_user_id", profile.userId).maybeSingle()
      if (!p?.id) {
        return NextResponse.redirect(new URL(`${loginPage}?error=line_unbound`, BASE))
      }
      return await signInAs(p.id as string)
    }

    // ── 會員端：只對照會員表 ──
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("line_user_id", profile.userId)
      .eq("role", "member")
      .maybeSingle()

    // 首次 LINE 登入：不建帳號——LINE 只做身份驗證，身分暫存簽章 cookie（30 分鐘），
    // 到綁定頁完成 Email 驗證碼後才正式建立帳號（見 /api/member/verify-email）
    if (!existingProfile?.id) {
      const res = NextResponse.redirect(
        new URL(`/m/bind-email?next=${encodeURIComponent(next)}`, BASE),
      )
      res.cookies.delete("line_state")
      res.cookies.delete("line_next")
      res.cookies.delete("line_portal")
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
    return await signInAs(supabaseUid)
  } catch (err) {
    console.error("LINE callback error:", err)
    return NextResponse.redirect(new URL("/m/login?error=line_failed", BASE))
  }
}
