import type { SupabaseClient } from "@supabase/supabase-js"
import { expandScheduleToMonth } from "@/lib/schedule"

// 教師的課程與場次展開（由 courses.schedule 文字班表推導）

export type TeacherCourse = {
  id: string
  title: string
  schedule: string
  studio: string
  capacity: number
  enrolled: number
}

export type Occurrence = {
  id: string        // `${courseId}@${dateStr}`
  courseId: string
  title: string
  dateStr: string   // "YYYY-MM-DD"
  time: string      // "10:00–12:00"
  studio: string
  enrolled: number
  capacity: number
}

export async function fetchTeacherCourses(
  supabase: SupabaseClient,
  teacherId: string,
): Promise<TeacherCourse[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, schedule, capacity, enrolled, status, classroom:classrooms(name), course_teachers(teacher_id)")
    .eq("status", "開課中")
  if (error) {
    console.error("載入教師課程失敗:", error.message)
    return []
  }
  return (data as unknown as {
    id: string; title: string; schedule: string; capacity: number; enrolled: number
    classroom: { name: string } | null
    course_teachers: { teacher_id: string }[]
  }[])
    .filter(c => c.course_teachers.some(ct => ct.teacher_id === teacherId))
    .map(c => ({
      id: c.id, title: c.title, schedule: c.schedule,
      studio: c.classroom?.name ?? "", capacity: c.capacity, enrolled: c.enrolled,
    }))
}

/** 展開課程班表為指定日期範圍內的場次 */
export function occurrencesInRange(
  courses: TeacherCourse[],
  start: Date,
  end: Date,
): Occurrence[] {
  const out: Occurrence[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cursor <= end) {
    for (const c of courses) {
      const map = expandScheduleToMonth(c.schedule, c.title, c.studio, cursor.getFullYear(), cursor.getMonth())
      for (const [dateStr, evs] of Object.entries(map)) {
        const d = new Date(dateStr + "T00:00:00")
        if (d < start || d > end) continue
        out.push({
          id: `${c.id}@${dateStr}`,
          courseId: c.id,
          title: c.title,
          dateStr,
          time: evs[0].time,
          studio: c.studio,
          enrolled: c.enrolled,
          capacity: c.capacity,
        })
      }
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return out.sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.time.localeCompare(b.time))
}

export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** course_attendance 用的日期格式（YYYY/MM/DD） */
export function attDate(dateStr: string): string {
  return dateStr.replace(/-/g, "/")
}
