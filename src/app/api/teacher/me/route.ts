import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// 解析目前登入者的教師身分——只認「獨立教師帳號」：
// profiles.role 必須是 teacher，且 teachers.profile_id 指向此帳號。
// 不再以 Email / LINE 比對放行其他帳號，也不再自動改動任何帳號角色。
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ teacher: null }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("id, name, role, avatar_url")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile || profile.role !== "teacher") {
    return NextResponse.json({ teacher: null })
  }

  const { data: teacher } = await admin
    .from("teachers")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!teacher) return NextResponse.json({ teacher: null })

  return NextResponse.json({
    teacher: {
      id: teacher.id,
      name: teacher.name,
      specialty: teacher.specialty ?? "",
      email: teacher.email ?? "",
      phone: teacher.phone ?? "",
      bio: teacher.bio ?? "",
      photoUrl: teacher.photo_url ?? profile.avatar_url ?? null,
      isLineAccount: false,   // 教師帳號皆有密碼
      lineBound: !!teacher.line_user_id,
    },
  })
}
