'use client'

import { useState } from "react"

const courses = [
  { id: 1, title: "基礎水彩入門", date: "週六 06/14 10:00–12:00" },
  { id: 2, title: "成人油畫工作坊", date: "週五 06/13 19:00–21:00" },
]

const initialStudents = [
  { id: 1, name: "陳小明", age: 9, status: "present" as Status },
  { id: 2, name: "林小華", age: 7, status: "present" as Status },
  { id: 3, name: "王大文", age: 10, status: "present" as Status },
  { id: 4, name: "張美玲", age: 8, status: "present" as Status },
  { id: 5, name: "李建宏", age: 9, status: "present" as Status },
  { id: 6, name: "吳雅婷", age: 11, status: "present" as Status },
  { id: 7, name: "劉志偉", age: 8, status: "present" as Status },
  { id: 8, name: "黃淑芬", age: 10, status: "present" as Status },
]

type Status = "present" | "absent" | "leave"

const statusConfig: Record<Status, { label: string; style: string }> = {
  present: { label: "出席", style: "bg-black text-white" },
  absent:  { label: "缺席", style: "bg-[#f5f5f5] text-[#999]" },
  leave:   { label: "請假", style: "bg-[#f5f5f5] text-[#aaa] border border-[#ddd]" },
}

const nextStatus: Record<Status, Status> = {
  present: "absent",
  absent:  "leave",
  leave:   "present",
}

export default function AttendancePage() {
  const [selectedCourse, setSelectedCourse] = useState(courses[0].id)
  const [students, setStudents] = useState(initialStudents)
  const [saved, setSaved] = useState(false)

  const toggle = (id: number) => {
    setSaved(false)
    setStudents((prev) =>
      prev.map((s) => s.id === id ? { ...s, status: nextStatus[s.status] } : s)
    )
  }

  const presentCount = students.filter((s) => s.status === "present").length

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
              onClick={() => { setSelectedCourse(c.id); setSaved(false) }}
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
        {(["present", "absent", "leave"] as Status[]).map((s) => {
          const count = students.filter((st) => st.status === s).length
          return (
            <div key={s} className="flex-1 bg-white rounded-xl p-3 text-center border border-[#f0f0f0]">
              <p className="text-xl font-light">{count}</p>
              <p className="text-[10px] text-[#999] mt-0.5">{statusConfig[s].label}</p>
            </div>
          )
        })}
      </div>

      {/* Student list */}
      <div className="px-4 mt-4">
        <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-2">
          學生名單 · 點擊切換狀態
        </p>
        <div className="bg-white rounded-xl divide-y divide-[#f5f5f5] border border-[#f0f0f0]">
          {students.map((student) => (
            <button
              key={student.id}
              onClick={() => toggle(student.id)}
              className="w-full flex items-center justify-between px-4 py-3.5"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#f2f2f2] rounded-full" />
                <div className="text-left">
                  <p className="text-sm font-medium">{student.name}</p>
                  <p className="text-[10px] text-[#999]">{student.age} 歲</p>
                </div>
              </div>
              <span className={`text-[11px] px-3 py-1 rounded-full ${statusConfig[student.status].style}`}>
                {statusConfig[student.status].label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="px-4 mt-4">
        <button
          onClick={() => setSaved(true)}
          className="w-full py-3.5 rounded-xl bg-black text-white text-sm font-medium"
        >
          {saved ? `已儲存（出席 ${presentCount} 人）` : "儲存點名結果"}
        </button>
      </div>

      <div className="h-6" />
    </div>
  )
}
