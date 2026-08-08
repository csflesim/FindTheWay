import { createClient } from "@/lib/supabase/server"

// API route 用的後台權限檢查（含操作者姓名，供異動紀錄使用）
export async function requireStaffUser(): Promise<{ id: string; name: string } | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from("profiles")
      .select("role, name")
      .eq("id", user.id)
      .maybeSingle()
    if (!data || !["staff", "admin"].includes(data.role)) return null
    return { id: user.id, name: data.name || "後台" }
  } catch {
    return null
  }
}

// API route 用的後台權限檢查：需已登入且 profiles.role 為 staff / admin
export async function requireStaff(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
    return !!data && ["staff", "admin"].includes(data.role)
  } catch {
    return false
  }
}
