'use client'

import { useState } from "react"

const courses = [
  { id: 1, title: "基礎水彩入門", date: "週六 06/14 10:00–12:00" },
  { id: 2, title: "成人油畫工作坊", date: "週五 06/13 19:00–21:00" },
]

type AbsentType = "defer" | "no_defer" | null

type Student = {
  id: number
  name: string
  age: number
  present: boolean
  absentType: AbsentType
}

const initialStudents: Student[] = [
  { id: 1, name: "陳小明", age: 9,  present: true, absentType: null },
  { id: 2, name: "林小華", age: 7,  present: true, absentType: null },
  { id: 3, name: "王大文", age: 10, present: true, absentType: null },
  { id: 4, name: "張美玲", age: 8,  present: true, absentType: null },
  { id: 5, name: "李建宏", age: 9,  present: true, absentType: null },
  { id: 6, name: "吳雅婷", age: 11, present: true, absentType: null },
  { id: 7, name: "劉志偉", age: 8,  present: true, absentType: null },
  { id: 8, name: "黃淑芬", age: 10, present: true, absentType: null },
]

export default function AttendancePage() {
  const [selectedCourse, setSelectedCourse] = useState(courses[0].id)
  const [students, setStudents] = useState(initialStudents)
  const [saved, setSaved] = useState(false)

  function togglePresent(id: number) {
    setSaved(false)
    setStudents(prev => prev.map(s =>
      s.id === id
        ? { ...s, present: !s.present, absentType: s.present ? null : null }
        : s
    ))
  }

  function setAbsentType(id: number, type: AbsentType) {
    setSaved(false)
    setStudents(prev => prev.map(s => s.id === id ? { ...s, absentType: type } : s))
  }

  const presentCount = students.filter(s => s.present).length
  const absentCount  = students.filter(s => !s.present).length
  const allAbsentDecided = students.filter(s => !s.present).every(s => s.absentType !== null)
  const canSave = students.filter(s => !s.present).every(s => s.absentType !== null)

  return (
    <div>
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-[#ebebeb] px-5 py-4 z-10">
        <p className="text-[10px] text-[#aaa] uppercase tracking-widest">Teacher</p>
        <h1 className="text-sm font-medium">點名</h1>
      </header>

      {/* Course selector */}
      <div className="px-4 mt-4">
        <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-2">選擇課程</p>
        <div className="flex flex-col gap-2">
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelectedCourse(c.id); setSaved(false); setStudents(initialStudents) }}
              className={`text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                selectedCourse === c.id
                  ? "bg-black text-white border-black"
                  : "bg-white border-[#f0f0f0] text-[#333]"
              }`}
            >
              <p className="font-medium">{c.title}</p>
              <p className={`text-[11px] mt-0.5 ${selectedCourse === c.id ? "text-white/60" : "text-[#999]"}`}>
                {c.date}
              </p>
            </button>
          ))}
        </div>
      </div>

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
          <p className="text-xl font-light">{students.filter(s => !s.present && s.absentType === "defer").length}</p>
          <p className="text-[10px] text-[#999] mt-0.5">延期</p>
        </div>
      </div>

      {/* Student list */}
      <div className="px-4 mt-4">
        <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-2">學生名單</p>
        <div className="bg-white rounded-xl divide-y divide-[#f5f5f5] border border-[#f0f0f0]">
          {students.map((student) => (
            <div key={student.id} className="px-4 py-3.5">
              {/* Main row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-[11px] text-[#999]">
                    {student.name.slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{student.name}</p>
                    <p className="text-[10px] text-[#999]">{student.age} 歲</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { if (!student.present) togglePresent(student.id) }}
                    className={`text-[11px] px-3 py-1.5 rounded-full transition-colors ${
                      student.present
                        ? "bg-black text-white"
                        : "bg-white text-[#bbb] border border-[#f0f0f0]"
                    }`}
                  >
                    出席
                  </button>
                  <button
                    onClick={() => { if (student.present) togglePresent(student.id) }}
                    className={`text-[11px] px-3 py-1.5 rounded-full transition-colors ${
                      !student.present
                        ? "bg-[#f5f5f5] text-[#555]"
                        : "bg-white text-[#bbb] border border-[#f0f0f0]"
                    }`}
                  >
                    缺席
                  </button>
                </div>
              </div>

              {/* Absent sub-options */}
              {!student.present && (
                <div className="mt-2.5 ml-11 flex gap-2">
                  <button
                    onClick={() => setAbsentType(student.id, "defer")}
                    className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                      student.absentType === "defer"
                        ? "bg-[#fff3e0] text-[#e65100] border-[#ffe0b2]"
                        : "bg-white text-[#aaa] border-[#f0f0f0]"
                    }`}
                  >
                    延期補課
                  </button>
                  <button
                    onClick={() => setAbsentType(student.id, "no_defer")}
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
      </div>

      {/* Save button */}
      <div className="px-4 mt-4">
        <button
          disabled={!canSave && absentCount > 0 && !allAbsentDecided}
          onClick={() => setSaved(true)}
          className="w-full py-3.5 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-40 transition-opacity"
        >
          {saved ? `已儲存（出席 ${presentCount} 人）` : "儲存點名結果"}
        </button>
        {absentCount > 0 && !allAbsentDecided && !saved && (
          <p className="text-[11px] text-[#aaa] text-center mt-2">請為每位缺席學生選擇延期或不延期</p>
        )}
      </div>

      <div className="h-6" />
    </div>
  )
}
