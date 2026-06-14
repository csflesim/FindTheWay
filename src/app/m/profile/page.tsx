import Link from "next/link"
import { ChevronRight, Ticket, Users, BookOpen, ScrollText } from "lucide-react"

import { STUDENTS as students } from "../_lib/students"

const quickActions = [
  { label: "購買課堂券", icon: Ticket,     href: "/m/tickets/buy" },
  { label: "管理學員",   icon: Users,      href: "/m/students" },
  { label: "報名課程",   icon: BookOpen,   href: "/m/courses" },
  { label: "出席紀錄",   icon: ScrollText, href: "/m/orders" },
]

const menuItems = [
  { label: "我的學生", href: "/m/students" },
  { label: "購買課堂券", href: "/m/tickets/buy" },
  { label: "轉讓課堂券", href: "/m/tickets/transfer" },
  { label: "帳號設定", href: "/m/settings" },
]

export default function ProfilePage() {
  return (
    <div>
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-[#ebebeb] px-5 py-4 z-10">
        <h1 className="text-base font-medium">我的</h1>
      </header>

      {/* Profile card */}
      <div className="mx-4 mt-4 bg-[#f2f2f2] rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <img src="/image/purple.jpg" alt="頭貼" className="w-12 h-12 rounded-full shrink-0 object-cover" />
          <div>
            <p className="text-sm font-medium">賴大紫</p>
            <p className="text-xs text-[#999]">purple@findtheway.com</p>
          </div>
        </div>
        <div className="flex gap-6 mt-4 pt-4 border-t border-[#ddd]">
          <div>
            <p className="text-2xl font-light">{students.reduce((s, t) => s + t.tickets, 0)}</p>
            <p className="text-[10px] text-[#999] mt-0.5">課堂券餘額</p>
          </div>
          <div>
            <p className="text-2xl font-light">{students.length}</p>
            <p className="text-[10px] text-[#999] mt-0.5">名下學員</p>
          </div>
          <div>
            <p className="text-2xl font-light">5</p>
            <p className="text-[10px] text-[#999] mt-0.5">已完成課程</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mt-5">
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map(({ label, icon: Icon, href }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1.5 bg-white rounded-xl py-4 px-1 border border-[#f0f0f0]"
            >
              <Icon size={22} strokeWidth={1.5} className="text-black" />
              <span className="text-[10px] text-[#555] text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Students */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-[#aaa] uppercase tracking-widest">名下學員</p>
          <Link href="/m/students/add" className="text-xs text-black underline underline-offset-2">
            + 新增
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {students.map((student) => (
            <Link
              key={student.id}
              href={`/m/students/${student.id}`}
              className="shrink-0 bg-white rounded-xl p-4 w-28 text-center border border-[#f0f0f0]"
            >
              <div className="w-10 h-10 bg-[#f2f2f2] rounded-full mx-auto mb-2" />
              <p className="text-sm font-medium">{student.name}</p>
              <p className="text-[10px] text-[#999]">{student.age} 歲</p>
              <p className="text-xs mt-2">
                <span className="font-medium">{student.tickets}</span>{" "}
                <span className="text-[#999]">堂</span>
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div className="px-4 mt-5">
        <div className="bg-white rounded-xl divide-y divide-[#f5f5f5] border border-[#f0f0f0]">
          {menuItems.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-between px-4 py-3.5"
            >
              <span className="text-sm">{label}</span>
              <ChevronRight size={16} className="text-[#ccc]" />
            </Link>
          ))}
        </div>
      </div>

      <div className="h-6" />
    </div>
  )
}
