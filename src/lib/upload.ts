import type { SupabaseClient } from "@supabase/supabase-js"

// 將 FileReader 產生的 dataURL 上傳到 Storage images bucket，回傳 public URL。
// 若傳入值不是 dataURL（已是網址或空字串）則原樣回傳。
export async function uploadImage(
  supabase: SupabaseClient,
  dataUrl: string,
  folder: string,
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith("data:")) return dataUrl
  const blob = await (await fetch(dataUrl)).blob()
  const ext = (blob.type.split("/")[1] ?? "png").replace("jpeg", "jpg")
  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from("images").upload(path, blob, { contentType: blob.type })
  if (error) throw new Error(`圖片上傳失敗：${error.message}`)
  return supabase.storage.from("images").getPublicUrl(path).data.publicUrl
}
