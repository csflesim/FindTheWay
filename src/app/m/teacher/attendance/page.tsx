'use client'

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useTeacher } from "../_lib/useTeacher"
import { fetchTeacherCourses, occurrencesInRange, todayStr, attDate, type Occurrence } from "../_lib/teacherData"

type AbsentType = "defer" | "no_defer" | null

type RollStudent = {
  name: string
  present: boolean
  absentType: AbsentType
  ticketId?: string
  ticketNo?: string
}

type AttRecord = { name: string; status: string; ticketId?: string; ticketNo?: string }

const DAYS = ["日", "一", "二", "三", "四", "五", "六"]

function occLabel(o: Occurrence): string {
  const d = new Date(o.dateStr + "T00:00:00")
  return `週${DAYS[d.getDay()]} ${o.dateStr.slice(5).replace("-", "/")} ${o.time}`
}

function toStatus(s: RollStudent): string {
  if (s.present) return "出席"
  return s.absentType === "defer" ? "延期" : "缺席"
}

function fromStatus(r: AttRecord): RollStudent {
  const base = { name: r.name, ticketId: r.ticketId, ticketNo: r.ticketNo }
  if (r.status === "出席") return { ...base, present: true, absentType: null }
  if (r.status === "延期") return { ...base, present: false, absentType: "defer" }
  return { ...base, present: false, absentType: "no_defer" }
}

export default function AttendancePage() {
  const supabase = useMemo(() => createClient(), [])
  const { teacher, loading: teacherLoading } = useTeacher()
  const [occs, setOccs] = useState<Occurrence[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOcc, setSelectedOcc] = useState<string | null>(null)
  const [students, setStudents] = useState<RollStudent[]>([])
  const [rowId, setRowId] = useState<string | null>(null)   // 既有 course_attendance 列
  const [newName, setNewName] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // 近 7 天內（含今天）的場次可點名
  useEffect(() => {
    if (!teacher) return
    ;(async () => {
      const courses = await fetchTeacherCourses(supabase, teacher.id)
      const start = new Date(); start.setDate(start.getDate() - 6)
      const end = new Date()
      const list = occurrencesInRange(courses, start, end).reverse()   // 最近的在前
      setOccs(list)
      if (list.length > 0) setSelectedOcc(list.find(o => o.dateStr === todayStr())?.id ?? list[0].id)
      setLoading(false)
    })()
  }, [teacher, supabase])

  const occ = occs.find(o => o.id === selectedOcc) ?? null

  // 載入名冊：內部課程＝綁定該堂的券（伺服器端合併既有點名紀錄）；外部課程＝既有紀錄＋手動增減
  const [internal, setInternal] = useState(true)
  useEffect(() => {
    if (!occ) return
    setSaved(false); setRowId(null); setStudents([])
    ;(async () => {
      const res = await fetch(`/api/attendance/roster?courseId=${occ.courseId}&date=${attDate(occ.dateStr)}`)
      const d = await res.json()
      if (!res.ok) { alert(`載入名冊失敗：${d.error ?? res.status}`); return }
      setInternal(!!d.internal)
      setRowId(d.rowId)
      setStudents(((d.records ?? []) as AttRecord[]).map(fromStatus))
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOcc, occs.length])

  function togglePresent(name: string) {
    setSaved(false)
    setStudents(prev => prev.map(s =>
      s.name === name ? { ...s, present: !s.present, absentType: null } : s
    ))
  }

  function setAbsentType(name: string, type: AbsentType) {
    setSaved(false)
    setStudents(prev => prev.map(s => s.name === name ? { ...s, absentType: type } : s))
  }

  function addStudent() {
    const name = newName.trim()
    if (!name || students.some(s => s.name === name)) return
    setStudents(prev => [...prev, { name, present: true, absentType: null }])
    setNewName("")
    setSaved(false)
  }

  function removeStudent(name: string) {
    setStudents(prev => prev.filter(s => s.name !== name))
    setSaved(false)
  }

  async function save() {
    if (!occ || saving) return
    setSaving(true)
    // 經 API 儲存：出席/缺席核銷、延期退券
    const records = students.map(s => ({ name: s.name, status: toStatus(s), ticketId: s.ticketId, ticketNo: s.ticketNo }))
    const res = await fetch("/api/attendance/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: occ.courseId, date: attDate(occ.dateStr), records }),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok || !d.ok) { alert(`儲存失敗：${d.error ?? res.status}`); return }
    setRowId(d.rowId)
    setSaved(true)
  }

  const presentCount = students.filter(s => s.present).length
  const absentCount  = students.filter(s => !s.present).length
  const deferCount   = students.filter(s => !s.present && s.absentType === "defer").length
  const allAbsentDecided = students.filter(s => !s.present).every(s => s.absentType !== null)

  if (teacherLoading) {
    return <div className="min-h-screen flex items-center justify-center text-[#ccc] text-sm">載入中…</div>
  }
  if (!teacher) return null

  return (
    <div>
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-[#ebebeb] px-5 py-4 z-10">
        <p className="text-[10px] text-[#aaa] uppercase tracking-widest">Teacher</p>
        <h1 className="text-sm font-medium">點名</h1>
      </header>

      {/* Course selector */}
      <div className="px-4 mt-4">
        <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-2">選擇課程（近 7 天）</p>
        {loading && <p className="text-sm text-[#ccc] py-3">載入中…</p>}
        {!loading && occs.length === 0 && (
          <p className="text-sm text-[#ccc] py-3">近 7 天沒有你的課程場次</p>
        )}
        <div className="flex flex-col gap-2">
          {occs.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelectedOcc(o.id)}
              className={`text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                selectedOcc === o.id
                  ? "bg-black text-white border-black"
                  : "bg-white border-[#f0f0f0] text-[#333]"
              }`}
            >
              <p className="font-medium">{o.title}</p>
              <p className={`text-[11px] mt-0.5 ${selectedOcc === o.id ? "text-white/60" : "text-[#999]"}`}>
                {occLabel(o)}{o.studio ? ` · ${o.studio}` : ""}
              </p>
            </button>
          ))}
        </div>
      </div>

      {occ && (
        <>
          {/* Stats */}
          <div className="px-4 mt-5 flex gap-3">
            <div className="flex-1 bg-black text-white rounded-xl p-3 text-center">
              <p className="text-xl font-light">{presentCount}</p>
              <p className="text-[10px] text-white/60 mt-0.5">出席</p>
            </div>
            <div className="flex-1 bg-white rounded-xl p-3 text-center border border-[#f0f0f0]">
              <p className="text-xl font-light">{absentCount}</p>
              <p className="text-[10px] text-[#999] mt-0.5">缺席</p>
            </div>
            <div className="flex-1 bg-white rounded-xl p-3 text-center border border-[#f0f0f0]">
              <p className="text-xl font-light">{deferCount}</p>
              <p className="text-[10px] text-[#999] mt-0.5">延期</p>
            </div>
          </div>

          {/* Student list */}
          <div className="px-4 mt-4">
            <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-2">學生名單</p>
            <div className="bg-white rounded-xl divide-y divide-[#f5f5f5] border border-[#f0f0f0]">
              {students.length === 0 && (
                <p className="px-4 py-4 text-sm text-[#ccc]">
                  {internal ? "這一堂還沒有人報名" : "尚無學生，請在下方新增"}
                </p>
              )}
              {students.map((student) => (
                <div key={student.name} className="px-4 py-3.5">
                  {/* Main row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-[11px] text-[#999]">
                        {student.name.slice(0, 1)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{student.name}</p>
                        {student.ticketNo && <p className="text-[10px] text-[#bbb] font-mono">{student.ticketNo}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => { if (!student.present) togglePresent(student.name) }}
                        className={`text-[11px] px-3 py-1.5 rounded-full transition-colors ${
                          student.present
                            ? "bg-black text-white"
                            : "bg-white text-[#bbb] border border-[#f0f0f0]"
                        }`}
                      >
                        出席
                      </button>
                      <button
                        onClick={() => { if (student.present) togglePresent(student.name) }}
                        className={`text-[11px] px-3 py-1.5 rounded-full transition-colors ${
                          !student.present
                            ? "bg-[#f5f5f5] text-[#555]"
                            : "bg-white text-[#bbb] border border-[#f0f0f0]"
                        }`}
                      >
                        缺席
                      </button>
                      {!internal && (
                        <button onClick={() => removeStudent(student.name)}
                          className="text-[#ddd] hover:text-red-400 transition-colors text-xs px-1">
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Absent sub-options */}
                  {!student.present && (
                    <div className="mt-2.5 ml-11 flex gap-2">
                      <button
                        onClick={() => setAbsentType(student.name, "defer")}
                        className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                          student.absentType === "defer"
                            ? "bg-[#fff3e0] text-[#e65100] border-[#ffe0b2]"
                            : "bg-white text-[#aaa] border-[#f0f0f0]"
                        }`}
                      >
                        延期補課
                      </button>
                      <button
                        onClick={() => setAbsentType(student.name, "no_defer")}
                        className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                          student.absentType === "no_defer"
                            ? "bg-[#f5f5f5] text-[#555] border-[#ddd]"
                            : "bg-white text-[#aaa] border-[#f0f0f0]"
                        }`}
                      >
                        不延期
                      </button>
                      {student.absentType === null && (
                        <span className="text-[10px] text-red-400 self-center">請選擇</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add student（外部課程手動名冊；內部課程名冊來自報名綁定） */}
            {!internal && (
              <div className="flex gap-2 mt-2">
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addStudent()}
                  placeholder="新增學生姓名…"
                  className="flex-1 px-3 py-2 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors" />
                <button onClick={addStudent}
                  className="px-4 py-2 bg-black text-white text-sm rounded-xl">＋</button>
              </div>
            )}
            {internal && (
              <p className="text-[10px] text-[#bbb] mt-2 px-1">
                出席／缺席會核銷課堂券；選「延期補課」券退回學員，可重新預約
              </p>
            )}
          </div>

          {/* Save button */}
          <div className="px-4 mt-4">
            <button
              disabled={saving || (absentCount > 0 && !allAbsentDecided)}
              onClick={save}
              className="w-full py-3.5 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-40 transition-opacity"
            >
              {saving ? "儲存中…" : saved ? `已儲存（出席 ${presentCount} 人）` : "儲存點名結果"}
            </button>
            {absentCount > 0 && !allAbsentDecided && !saved && (
              <p className="text-[11px] text-[#aaa] text-center mt-2">請為每位缺席學生選擇延期或不延期</p>
            )}
          </div>
        </>
      )}

      <div className="h-6" />
    </div>
  )
}
