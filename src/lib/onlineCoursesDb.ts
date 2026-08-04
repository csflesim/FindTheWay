import type { SupabaseClient } from "@supabase/supabase-js"

// 線上課程共用資料層（online_courses + online_sections）

export type OnlineSection = {
  id: string
  title: string
  videoUrl: string
  label: string
  sort: number
  freePreview: boolean
}

export type OnlineCourseData = {
  id: string
  title: string
  subtitle: string
  desc: string
  type: "免費課程" | "系列課"
  price: number
  rating: number
  sort: number
  publishDate: string
  published: boolean
  coverUrl: string
  recommendedIds: string[]
  categories: string[]
  sections: OnlineSection[]
}

type SectionRow = {
  id: string
  title: string
  video_url: string
  label: string | null
  free_preview: boolean
  sort_order: number
}

type CourseRow = {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  type: OnlineCourseData["type"]
  price: number
  rating: number
  sort_order: number
  publish_date: string | null
  published: boolean
  cover_url: string | null
  recommended_ids: string[]
  categories: string[]
  online_sections: SectionRow[]
}

function fromRow(r: CourseRow): OnlineCourseData {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle ?? "",
    desc: r.description ?? "",
    type: r.type,
    price: r.price,
    rating: Number(r.rating),
    sort: r.sort_order,
    publishDate: r.publish_date ?? "",
    published: r.published,
    coverUrl: r.cover_url ?? "",
    recommendedIds: r.recommended_ids ?? [],
    categories: r.categories ?? [],
    sections: (r.online_sections ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(s => ({
        id: s.id, title: s.title, videoUrl: s.video_url,
        label: s.label ?? "", sort: s.sort_order, freePreview: s.free_preview,
      })),
  }
}

export async function fetchOnlineCourses(
  supabase: SupabaseClient,
  opts: { publishedOnly?: boolean } = {},
): Promise<OnlineCourseData[]> {
  let q = supabase.from("online_courses").select("*, online_sections(*)").order("sort_order")
  if (opts.publishedOnly) q = q.eq("published", true)
  const { data, error } = await q
  if (error) {
    console.error("載入線上課程失敗:", error.message)
    return []
  }
  return (data as unknown as CourseRow[]).map(fromRow)
}

/** 從 YouTube 網址取出影片 ID（支援 watch?v= / youtu.be / embed / 純 ID） */
export function videoIdFrom(url: string): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed
  const m = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}

export const ONLINE_CATEGORIES = ["AI諮詢", "直播營銷", "創造力", "實體零售"]
