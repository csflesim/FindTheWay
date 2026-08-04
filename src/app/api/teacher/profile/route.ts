import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// 教師更新自己的個人資料（teachers 表寫入權限僅後台，故經此 API 以本人身分代寫）
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: teacher } = await admin
    .from("teachers")
    .select("id, photo_url")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!teacher) return NextResponse.json({ error: "非教師帳號" }, { status: 403 })

  const { name, specialty, phone, bio, photoDataUrl } = await req.json() as {
    name?: string; specialty?: string; phone?: string; bio?: string; photoDataUrl?: string
  }
  if (!name?.trim()) return NextResponse.json({ error: "姓名為必填" }, { status: 400 })

  // 頭貼：dataURL → Storage（service role 上傳，不受 staff-only 政策限制）
  let photoUrl = teacher.photo_url
  if (photoDataUrl?.startsWith("data:")) {
    const m = photoDataUrl.match(/^data:(image\/[\w+]+);base64,(.+)$/)
    if (!m) return NextResponse.json({ error: "圖片格式不正確" }, { status: 400 })
    const ext = (m[1].split("/")[1] ?? "png").replace("jpeg", "jpg")
    const path = `teachers/${crypto.randomUUID()}.${ext}`
    const bytes = Buffer.from(m[2], "base64")
    const { error: upErr } = await admin.storage.from("images")
      .upload(path, bytes, { contentType: m[1] })
    if (upErr) return NextResponse.json({ error: `頭貼上傳失敗：${upErr.message}` }, { status: 500 })
    photoUrl = admin.storage.from("images").getPublicUrl(path).data.publicUrl
  }

  const { error } = await admin.from("teachers").update({
    name: name.trim(),
    specialty: specialty || null,
    phone: phone || null,
    bio: bio || null,
    photo_url: photoUrl,
  }).eq("id", teacher.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 同步 profile 顯示名稱與頭貼
  await admin.from("profiles").update({
    name: name.trim(),
    ...(photoUrl ? { avatar_url: photoUrl } : {}),
  }).eq("id", user.id)

  return NextResponse.json({ ok: true, photoUrl })
}
