import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// 解析目前登入者對應的教師身分：
// 1. teachers.profile_id 已綁定 → 直接回傳
// 2. 未綁定 → 以 email 或 LINE userId 比對教師檔，比對成功即自動綁定
//    並把 profiles.role 升級為 teacher（staff/admin 不降級），讓 RLS 放行點名等操作。
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ teacher: null }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("id, name, role, line_user_id, avatar_url")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile) return NextResponse.json({ teacher: null }, { status: 401 })

  // 已綁定
  let { data: teacher } = await admin
    .from("teachers")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle()

  // 未綁定 → 用 email / LINE userId 比對
  if (!teacher) {
    const ors: string[] = []
    if (user.email && !user.email.endsWith("@findtheway.app")) ors.push(`email.eq.${user.email}`)
    if (profile.line_user_id) ors.push(`line_user_id.eq.${profile.line_user_id}`)
    if (ors.length > 0) {
      const { data: matched } = await admin
        .from("teachers")
        .select("*")
        .or(ors.join(","))
        .is("profile_id", null)
        .limit(1)
        .maybeSingle()
      if (matched) {
        await admin.from("teachers").update({ profile_id: user.id }).eq("id", matched.id)
        teacher = { ...matched, profile_id: user.id }
      }
    }
  }

  if (!teacher) return NextResponse.json({ teacher: null })

  // 讓 RLS 認得教師身分
  if (profile.role === "member") {
    await admin.from("profiles").update({ role: "teacher" }).eq("id", user.id)
  }

  return NextResponse.json({
    teacher: {
      id: teacher.id,
      name: teacher.name,
      specialty: teacher.specialty ?? "",
      email: teacher.email ?? user.email ?? "",
      phone: teacher.phone ?? "",
      bio: teacher.bio ?? "",
      photoUrl: teacher.photo_url ?? profile.avatar_url ?? null,
      isLineAccount: (user.email ?? "").endsWith("@findtheway.app"),
    },
  })
}
