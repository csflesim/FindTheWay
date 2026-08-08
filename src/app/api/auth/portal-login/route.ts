import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createAdminClient } from "@/lib/supabase/admin"

// 三端統一登入：電話＋密碼 / Email＋密碼 /（後台）帳號＋密碼。
// 每個端只查自己的表：會員＝profiles(role=member)、教師＝teachers、後台＝profiles(staff/admin)。
// 找到該身分的「識別碼帳號」後驗證密碼並簽入 session；登入後再驗 role 與端口相符。

type Portal = "member" | "teacher" | "staff"

const STAFF_DOMAIN = "@findtheway.com"

function isEmail(s: string) { return s.includes("@") }
function isPhone(s: string) { return /^\d{8,15}$/.test(s.replace(/[- ]/g, "")) }

export async function POST(req: NextRequest) {
  const { portal, identifier, password } = await req.json() as {
    portal?: Portal; identifier?: string; password?: string
  }
  const id = (identifier ?? "").trim()
  if (!portal || !["member", "teacher", "staff"].includes(portal) || !id || !password) {
    return NextResponse.json({ error: "請輸入帳號與密碼" }, { status: 400 })
  }

  const admin = createAdminClient()
  const authEmailOf = async (profileId: string): Promise<string | null> => {
    const { data } = await admin.auth.admin.getUserById(profileId)
    return data?.user?.email ?? null
  }

  // ── 依端口查表，解析出識別碼帳號的 auth email ──
  let authEmail: string | null = null
  const notFoundMsg = "查無此帳號，請確認登入資訊"

  if (portal === "member") {
    if (isEmail(id)) {
      authEmail = id.toLowerCase()
    } else if (isPhone(id)) {
      const { data } = await admin.from("profiles")
        .select("id").eq("role", "member").eq("phone", id.replace(/[- ]/g, "")).limit(1).maybeSingle()
      if (data) authEmail = await authEmailOf(data.id)
    }
  } else if (portal === "teacher") {
    let q = admin.from("teachers").select("id, profile_id")
    if (isEmail(id)) q = q.ilike("email", id)
    else if (isPhone(id)) q = q.eq("phone", id.replace(/[- ]/g, ""))
    else return NextResponse.json({ error: "請輸入 Email 或電話" }, { status: 400 })
    const { data: teacher } = await q.limit(1).maybeSingle()
    if (teacher) {
      if (!teacher.profile_id) {
        return NextResponse.json({ error: "此教師尚未開通登入帳號，請聯繫工作室" }, { status: 403 })
      }
      authEmail = await authEmailOf(teacher.profile_id as string)
    }
  } else {
    // staff：帳號 / Email / 電話
    if (isEmail(id)) {
      if (id.toLowerCase().endsWith(STAFF_DOMAIN)) {
        authEmail = id.toLowerCase()
      } else {
        const { data } = await admin.from("profiles")
          .select("id").in("role", ["staff", "admin"]).ilike("contact_email", id).limit(1).maybeSingle()
        if (data) authEmail = await authEmailOf(data.id)
      }
    } else if (isPhone(id)) {
      const { data } = await admin.from("profiles")
        .select("id").in("role", ["staff", "admin"]).eq("phone", id.replace(/[- ]/g, "")).limit(1).maybeSingle()
      if (data) authEmail = await authEmailOf(data.id)
    } else {
      authEmail = `${id.toLowerCase()}${STAFF_DOMAIN}`
    }
  }

  if (!authEmail) return NextResponse.json({ error: notFoundMsg }, { status: 404 })

  // ── 簽入 session（cookie 寫在回應上）──
  const res = NextResponse.json({ ok: true })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(list) { list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)) },
      },
    },
  )
  const { data: signIn, error: signErr } = await supabase.auth.signInWithPassword({
    email: authEmail, password,
  })
  if (signErr || !signIn.user) {
    return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 })
  }

  // ── 端口與身分必須相符（識別碼＋角色）──
  const { data: profile } = await admin.from("profiles")
    .select("role").eq("id", signIn.user.id).maybeSingle()
  const role = profile?.role ?? ""
  const okRole = portal === "member" ? role === "member"
    : portal === "teacher" ? role === "teacher"
    : ["staff", "admin"].includes(role)
  if (!okRole) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: "此帳號不屬於這個登入端" }, { status: 403 })
  }

  return res
}
