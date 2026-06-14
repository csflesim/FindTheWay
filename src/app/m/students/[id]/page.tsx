'use client'

import { use } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getStudent } from "../../_lib/students"

const enrollments = [
  { id: 1, studentId: 1, course: "基礎水彩入門", date: "2026-06-21 10:00", status: "已報名" },
  { id: 2, studentId: 3, course: "兒童創意素描", date: "2026-06-15 14:00", status: "已完成" },
  { id: 3, studentId: 1, course: "基礎水彩入門", date: "2026-06-07 10:00", status: "已完成" },
  { id: 4, studentId: 2, course: "親子藝術探索", date: "2026-05-25 14:00", status: "已完成" },
  { id: 5, studentId: 2, course: "兒童創意素描", date: "2026-05-18 14:00", status: "已完成" },
]

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const student = getStudent(Number(id))

  if (!student) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-[#aaa] text-sm">找不到學生資料</p>
        <Link href="/m/students" className="text-xs underline">返回</Link>
      </div>
    )
  }

  const myEnrollments = enrollments.filter(e => e.studentId === student.id)

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      {/* Header */}
      <div className="bg-white border-b border-[#ebebeb] px-5 py-4 flex items-center gap-3">
        <Link href="/m/students" className="p-1 -ml-1 text-[#999] hover:text-black">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-base font-medium">學生資料</h1>
      </div>

      {/* Profile */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-[#f0f0f0] p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#f2f2f2] rounded-full flex items-center justify-center text-lg text-[#aaa]">
            {student.name.slice(0, 1)}
          </div>
          <div>
            <p className="text-lg font-medium">{student.name}</p>
            <p className="text-xs text-[#aaa] mt-0.5">{student.age} 歲 · {student.relation}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[#f5f5f5] flex gap-6">
          <div>
            <p className="text-2xl font-light">{student.tickets}</p>
            <p className="text-[10px] text-[#aaa] mt-0.5">課堂券餘額</p>
          </div>
          <div>
            <p className="text-2xl font-light">{myEnrollments.filter(e => e.status === "已完成").length}</p>
            <p className="text-[10px] text-[#aaa] mt-0.5">已完成課程</p>
          </div>
        </div>
      </div>

      {/* Enrollment records */}
      <div className="px-4 mt-5">
        <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-3">報名紀錄</p>
        {myEnrollments.length === 0 ? (
          <p className="text-sm text-[#ccc] py-6 text-center">尚無報名紀錄</p>
        ) : (
          <div className="bg-white rounded-xl divide-y divide-[#f5f5f5] border border-[#f0f0f0]">
            {myEnrollments.map(e => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-sm font-medium">{e.course}</p>
                  <p className="text-xs text-[#aaa] mt-0.5">{e.date}</p>
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full ${
                  e.status === "已報名" ? "bg-black text-white" : "bg-[#f5f5f5] text-[#999]"
                }`}>
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-6" />
    </div>
  )
}
