'use client'

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useTeacher } from "../_lib/useTeacher"
import { fetchTeacherCourses, occurrencesInRange } from "../_lib/teacherData"

type HistoryEntry = { id: string; course: string; date: string; present: number; total: number }

export default function TeacherProfilePage() {
  const supabase = useMemo(() => createClient(), [])
  const { teacher, loading } = useTeacher()
  const [stats, setStats] = useState({ monthly: 0, courseCount: 0, rate: 100 })
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => {
    if (!teacher) return
    ;(async () => {
      const courses = await fetchTeacherCourses(supabase, teacher.id)
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const monthly = occurrencesInRange(courses, monthStart, monthEnd).length

      const courseIds = courses.map(c => c.id)
      let entries: HistoryEntry[] = []
      let rate = 100
      if (courseIds.length > 0) {
        const { data } = await supabase
          .from("course_attendance")
          .select("id, date, records, course:courses(title)")
          .in("course_id", courseIds)
          .order("date", { ascending: false })
          .limit(20)
        const rows = (data ?? []) as unknown as {
          id: string; date: string; records: { status: string }[]
          course: { title: string } | null
        }[]
        entries = rows.map(r => ({
          id: r.id,
          course: r.course?.title ?? "—",
          date: r.date,
          present: (r.records ?? []).filter(x => x.status === "出席").length,
          total: (r.records ?? []).length,
        }))
        const allRecords = rows.flatMap(r => r.records ?? [])
        if (allRecords.length > 0) {
          rate = Math.round(allRecords.filter(x => x.status === "出席").length / allRecords.length * 100)
        }
      }
      setStats({ monthly, courseCount: courses.length, rate })
      setHistory(entries)
    })()
  }, [teacher, supabase])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = "/m/teacher/login"
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-[#ccc] text-sm">載入中…</div>
  }
  if (!teacher) return null

  return (
    <div>
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-[#ebebeb] px-5 py-4 z-10">
        <p className="text-[10px] text-[#aaa] uppercase tracking-widest">Teacher</p>
        <h1 className="text-sm font-medium">我的</h1>
      </header>

      {/* Profile card */}
      <div className="mx-4 mt-4 bg-black text-white rounded-2xl p-5">
        <div className="flex items-center gap-3">
          {teacher.photoUrl
            ? <img src={teacher.photoUrl} alt="頭貼" className="w-12 h-12 rounded-full shrink-0 object-cover" />
            : <div className="w-12 h-12 rounded-full shrink-0 bg-white/20 flex items-center justify-center text-base">{teacher.name.slice(0, 1)}</div>
          }
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-widest">Instructor</p>
            <p className="text-sm font-medium mt-0.5">{teacher.name}</p>
            <p className="text-xs text-white/50">{teacher.email}</p>
          </div>
        </div>
        <div className="flex gap-6 mt-4 pt-4 border-t border-white/10">
          <div>
            <p className="text-2xl font-light">{stats.monthly}</p>
            <p className="text-[10px] text-white/50 mt-0.5">本月課堂</p>
          </div>
          <div>
            <p className="text-2xl font-light">{stats.courseCount}</p>
            <p className="text-[10px] text-white/50 mt-0.5">課程種類</p>
          </div>
          <div>
            <p className="text-2xl font-light">{stats.rate}%</p>
            <p className="text-[10px] text-white/50 mt-0.5">平均出席率</p>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="px-4 mt-5">
        <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-3">點名紀錄</p>
        {history.length === 0 ? (
          <p className="text-sm text-[#ccc] py-4">尚無點名紀錄</p>
        ) : (
          <div className="bg-white rounded-xl divide-y divide-[#f5f5f5] border border-[#f0f0f0]">
            {history.map((record) => {
              const rate = record.total > 0 ? Math.round((record.present / record.total) * 100) : 0
              return (
                <div key={record.id} className="flex items-center justify-between px-4 py-3.5">
                  <div>
                    <p className="text-sm font-medium">{record.course}</p>
                    <p className="text-xs text-[#999] mt-0.5">{record.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{record.present} / {record.total}</p>
                    <p className="text-[10px] text-[#999]">出席 {rate}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="px-4 mt-5">
        <button onClick={handleLogout}
          className="w-full py-3 text-sm text-red-500 bg-white border border-[#f0f0f0] rounded-xl">
          登出
        </button>
      </div>

      <div className="h-6" />
    </div>
  )
}
