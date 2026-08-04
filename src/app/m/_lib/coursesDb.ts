import type { SupabaseClient } from "@supabase/supabase-js"

// 前台課程資料（由 Supabase courses 表映射）
export type MemberCourse = {
  id: string
  title: string
  category: string
  age: string
  teachers: { name: string; photo: string | null }[]
  date: string      // "每週六" / "2026/06/10"
  time: string      // "10:00–12:00"
  studio: string
  spots: number     // 剩餘名額 = capacity - enrolled
  price: number
  desc: string
  highlights: string[]
  imgSquare?: string
  imgLandscape?: string
}

type CourseRow = {
  id: string
  title: string
  category: string | null
  age: string | null
  schedule: string
  capacity: number
  enrolled: number
  price: number
  description: string | null
  highlights: string[]
  cover_url: string | null
  banner_url: string | null
  classroom: { name: string } | null
  course_teachers: { teacher: { name: string; photo_url: string | null } | null }[]
}

const SELECT = "id, title, category, age, schedule, capacity, enrolled, price, description, highlights, cover_url, banner_url, classroom:classrooms(name), course_teachers(teacher:teachers(name, photo_url))"

function splitSchedule(schedule: string): { date: string; time: string } {
  const i = schedule.indexOf(" ")
  if (i === -1) return { date: schedule, time: "" }
  return { date: schedule.slice(0, i), time: schedule.slice(i + 1) }
}

function fromRow(r: CourseRow): MemberCourse {
  const { date, time } = splitSchedule(r.schedule)
  return {
    id: r.id,
    title: r.title,
    category: r.category ?? "",
    age: r.age ?? "",
    teachers: r.course_teachers
      .map(ct => ct.teacher)
      .filter((t): t is { name: string; photo_url: string | null } => !!t)
      .map(t => ({ name: t.name, photo: t.photo_url })),
    date, time,
    studio: r.classroom?.name ?? "",
    spots: Math.max(0, r.capacity - r.enrolled),
    price: r.price,
    desc: r.description ?? "",
    highlights: r.highlights ?? [],
    imgSquare: r.cover_url ?? undefined,
    imgLandscape: r.banner_url ?? undefined,
  }
}

/** 前台課程列表：僅顯示 visible + 開課中 */
export async function fetchMemberCourses(supabase: SupabaseClient): Promise<MemberCourse[]> {
  const { data, error } = await supabase
    .from("courses")
    .select(SELECT)
    .eq("visible", true)
    .eq("status", "開課中")
    .order("sort_order")
  if (error) {
    console.error("載入課程失敗:", error.message)
    return []
  }
  return (data as unknown as CourseRow[]).map(fromRow)
}

/** 單一課程詳情 */
export async function fetchMemberCourse(supabase: SupabaseClient, id: string): Promise<MemberCourse | null> {
  const { data, error } = await supabase
    .from("courses")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle()
  if (error || !data) {
    if (error) console.error("載入課程失敗:", error.message)
    return null
  }
  return fromRow(data as unknown as CourseRow)
}
