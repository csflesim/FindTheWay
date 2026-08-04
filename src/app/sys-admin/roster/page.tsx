'use client'

import { useState, useMemo, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type AbsentType = "defer" | "no_defer"

type StudentAtt = {
  name: string
  present: boolean
  absentType?: AbsentType
}

type Session = {
  id: string
  title: string
  date: string
  dayLabel: string
  time: string
  teacher: string
  studio: string
  students: StudentAtt[]
}

const DAYS = ["日", "一", "二", "三", "四", "五", "六"]

type AttRow = {
  id: string
  date: string
  records: { name: string; status: string }[]
  course: {
    title: string
    schedule: string
    classroom: { name: string } | null
    course_teachers: { teacher: { name: string } | null }[]
  } | null
}

function rowToSession(r: AttRow): Session {
  const dateIso = r.date.replace(/\//g, "-")   // "YYYY/MM/DD" → "YYYY-MM-DD"
  const d = new Date(dateIso + "T00:00:00")
  const time = r.course?.schedule.split(" ")[1] ?? ""
  return {
    id: r.id,
    title: r.course?.title ?? "—",
    date: dateIso,
    dayLabel: isNaN(d.getTime()) ? "" : `週${DAYS[d.getDay()]}`,
    time,
    teacher: (r.course?.course_teachers ?? []).map(ct => ct.teacher?.name).filter(Boolean).join("、") || "—",
    studio: r.course?.classroom?.name ?? "—",
    students: (r.records ?? []).map(x => ({
      name: x.name,
      present: x.status === "出席",
      absentType: x.status === "出席" ? undefined : x.status === "延期" ? "defer" as const : "no_defer" as const,
    })),
  }
}

const absentTypeLabel: Record<AbsentType, string> = {
  defer:    "延期補課",
  no_defer: "不延期",
}

const absentTypeStyle: Record<AbsentType, string> = {
  defer:    "bg-[#fff3e0] text-[#e65100]",
  no_defer: "bg-[#f5f5f5] text-[#999]",
}

function mmdd(date: string) {
  return date.slice(5).replace("-", "/")
}

function thisMonthRange() {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth()
  return {
    start: `${y}-${String(m + 1).padStart(2, "0")}-01`,
    end:   `${y}-${String(m + 1).padStart(2, "0")}-${new Date(y, m + 1, 0).getDate()}`,
  }
}

function lastMonthRange() {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth() - 1
  const ym = m < 0 ? y - 1 : y, mm = ((m % 12) + 12) % 12
  return {
    start: `${ym}-${String(mm + 1).padStart(2, "0")}-01`,
    end:   `${ym}-${String(mm + 1).padStart(2, "0")}-${new Date(ym, mm + 1, 0).getDate()}`,
  }
}

function CourseRow({ session }: { session: Session }) {
  const [open, setOpen] = useState(false)
  const present = session.students.filter(s => s.present).length
  const absent  = session.students.filter(s => !s.present).length
  const defer   = session.students.filter(s => !s.present && s.absentType === "defer").length
  const total   = session.students.length

  return (
    <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-4 text-left hover:bg-[#fafaf9] transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">{session.title}</p>
            <p className="text-xs text-[#999] mt-0.5">
              {mmdd(session.date)} {session.dayLabel} · {session.time} · {session.studio} · {session.teacher}
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex gap-3 text-center">
              <div>
                <p className="text-base font-medium leading-none">{present}</p>
                <p className="text-[10px] text-[#aaa] mt-0.5">出席</p>
              </div>
              <div>
                <p className={`text-base font-medium leading-none ${absent > 0 ? "text-[#e57373]" : "text-[#ccc]"}`}>{absent}</p>
                <p className="text-[10px] text-[#aaa] mt-0.5">缺席</p>
              </div>
              <div>
                <p className={`text-base font-medium leading-none ${defer > 0 ? "text-[#e65100]" : "text-[#ccc]"}`}>{defer}</p>
                <p className="text-[10px] text-[#aaa] mt-0.5">延期</p>
              </div>
            </div>
            <ChevronDown
              size={16}
              className={`text-[#bbb] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </div>
        </div>
        <div className="mt-3 h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
          <div
            className="h-full bg-black rounded-full transition-all"
            style={{ width: total > 0 ? `${Math.round((present / total) * 100)}%` : "0%" }}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-[#f5f5f5]">
          {/* Desktop */}
          <div className="hidden md:block divide-y divide-[#f5f5f5]">
            {session.students.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-[10px] text-[#999]">
                    {s.name.slice(0, 1)}
                  </div>
                  <p className="text-sm">{s.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${s.present ? "bg-black text-white" : "bg-[#fee2e2] text-[#b91c1c]"}`}>
                    {s.present ? "出席" : "缺席"}
                  </span>
                  {!s.present && s.absentType && (
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${absentTypeStyle[s.absentType]}`}>
                      {absentTypeLabel[s.absentType]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Mobile */}
          <div className="md:hidden px-4 py-3 flex flex-wrap gap-2">
            {session.students.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-[#f9f9f9] rounded-lg px-2.5 py-1.5">
                <span className="text-xs">{s.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${s.present ? "bg-black text-white" : "bg-[#fee2e2] text-[#b91c1c]"}`}>
                  {s.present ? "出席" : "缺席"}
                </span>
                {!s.present && s.absentType && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${absentTypeStyle[s.absentType]}`}>
                    {absentTypeLabel[s.absentType]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function RosterPage() {
  const supabase = useMemo(() => createClient(), [])
  const defaultRange = thisMonthRange()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [startInput, setStartInput] = useState(defaultRange.start)
  const [endInput,   setEndInput]   = useState(defaultRange.end)
  const [applied,    setApplied]    = useState(defaultRange)
  const [dateTab,       setDateTab]       = useState("全部")
  const [filterCourse,  setFilterCourse]  = useState("全部")
  const [filterTeacher, setFilterTeacher] = useState("全部")

  useEffect(() => {
    supabase.from("course_attendance")
      .select("id, date, records, course:courses(title, schedule, classroom:classrooms(name), course_teachers(teacher:teachers(name)))")
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("載入出席紀錄失敗:", error.message)
        else setSessions((data as unknown as AttRow[]).map(rowToSession))
        setLoading(false)
      })
  }, [supabase])

  function apply() {
    setApplied({ start: startInput, end: endInput })
    setDateTab("全部"); setFilterCourse("全部"); setFilterTeacher("全部")
  }

  const inRange = useMemo(() =>
    sessions.filter(s => s.date >= applied.start && s.date <= applied.end),
    [sessions, applied]
  )

  const uniqueDates = useMemo(() =>
    [...new Set(inRange.map(s => s.date))].sort(), [inRange]
  )
  const courseOptions  = useMemo(() => ["全部", ...[...new Set(inRange.map(s => s.title))].sort()],   [inRange])
  const teacherOptions = useMemo(() => ["全部", ...[...new Set(inRange.map(s => s.teacher))].sort()], [inRange])

  const filtered = useMemo(() => {
    let r = dateTab === "全部" ? inRange : inRange.filter(s => s.date === dateTab)
    if (filterCourse  !== "全部") r = r.filter(s => s.title   === filterCourse)
    if (filterTeacher !== "全部") r = r.filter(s => s.teacher === filterTeacher)
    return r
  }, [inRange, dateTab, filterCourse, filterTeacher])

  const allStudents   = filtered.flatMap(s => s.students)
  const totalPresent  = allStudents.filter(s => s.present).length
  const totalAbsent   = allStudents.filter(s => !s.present).length
  const totalDefer    = allStudents.filter(s => !s.present && s.absentType === "defer").length

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Roster</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">出席管理</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white border border-[#f0f0f0] rounded-xl px-3 py-2">
            <input type="date" value={startInput} onChange={e => setStartInput(e.target.value)}
              className="text-sm text-[#333] outline-none bg-transparent w-[120px]" />
          </div>
          <span className="text-[#bbb] text-sm">～</span>
          <div className="flex items-center bg-white border border-[#f0f0f0] rounded-xl px-3 py-2">
            <input type="date" value={endInput} onChange={e => setEndInput(e.target.value)}
              className="text-sm text-[#333] outline-none bg-transparent w-[120px]" />
          </div>
          <button onClick={() => { const r = thisMonthRange(); setStartInput(r.start); setEndInput(r.end) }}
            className="px-3 py-2 text-sm bg-white border border-[#f0f0f0] rounded-xl text-[#666] hover:border-black hover:text-black transition-colors">本期</button>
          <button onClick={() => { const r = lastMonthRange(); setStartInput(r.start); setEndInput(r.end) }}
            className="px-3 py-2 text-sm bg-white border border-[#f0f0f0] rounded-xl text-[#666] hover:border-black hover:text-black transition-colors">上期</button>
          <button onClick={apply}
            className="px-4 py-2 text-sm bg-black text-white rounded-xl hover:bg-[#222] transition-colors">查詢</button>
        </div>
      </div>

      {inRange.length > 0 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {["全部", ...uniqueDates].map(d => (
            <button key={d} onClick={() => setDateTab(d)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                dateTab === d
                  ? "bg-black text-white"
                  : "bg-white border border-[#f0f0f0] text-[#999] hover:border-black hover:text-black"
              }`}>
              {d === "全部" ? "全部" : mmdd(d)}
            </button>
          ))}
        </div>
      )}

      {inRange.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black text-[#555]">
            {courseOptions.map(o => <option key={o} value={o}>{o === "全部" ? "全部課程" : o}</option>)}
          </select>
          <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black text-[#555]">
            {teacherOptions.map(o => <option key={o} value={o}>{o === "全部" ? "全部老師" : o}</option>)}
          </select>
          {(filterCourse !== "全部" || filterTeacher !== "全部") && (
            <button onClick={() => { setFilterCourse("全部"); setFilterTeacher("全部") }}
              className="px-3 py-1.5 text-xs text-[#aaa] hover:text-black transition-colors">清除篩選</button>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "出席", value: totalPresent, color: "" },
            { label: "缺席", value: totalAbsent,  color: totalAbsent > 0 ? "text-[#e57373]" : "" },
            { label: "延期", value: totalDefer,   color: totalDefer  > 0 ? "text-[#e65100]" : "" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-[#f0f0f0] text-center">
              <p className={`text-xl font-medium leading-none ${color}`}>{value}</p>
              <p className="text-[10px] text-[#aaa] mt-1">人次</p>
              <p className="text-[10px] text-[#bbb] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#ccc] py-8 text-center">載入中…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[#ccc] py-8 text-center">查無課程</p>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(session => <CourseRow key={session.id} session={session} />)}
        </div>
      )}
    </div>
  )
}
