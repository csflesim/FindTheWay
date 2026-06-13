import Link from "next/link"
import { ChevronRight } from "lucide-react"

const students = [
  { id: 1, name: "本人", age: 28, tickets: 3 },
  { id: 2, name: "小明", age: 9, tickets: 7 },
  { id: 3, name: "小華", age: 7, tickets: 1 },
]

const quickActions = [
  { label: "購買課堂券", emoji: "🎟", href: "/m/tickets/buy" },
  { label: "管理學生", emoji: "👤", href: "/m/students" },
  { label: "報名課程", emoji: "📅", href: "/m/courses" },
  { label: "出席紀錄", emoji: "📋", href: "/m/orders" },
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
          <div className="w-12 h-12 bg-black rounded-full shrink-0" />
          <div>
            <p className="text-sm font-medium">賴大紫</p>
            <p className="text-xs text-[#999]">purple@findtheway.com</p>
          </div>
        </div>
        <div className="flex gap-6 mt-4 pt-4 border-t border-[#ddd]">
          <div>
            <p className="text-2xl font-light">11</p>
            <p className="text-[10px] text-[#999] mt-0.5">課堂券餘額</p>
          </div>
          <div>
            <p className="text-2xl font-light">3</p>
            <p className="text-[10px] text-[#999] mt-0.5">名下學生</p>
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
          {quickActions.map(({ label, emoji, href }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1.5 bg-white rounded-xl py-4 px-1 border border-[#f0f0f0]"
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-[10px] text-[#555] text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Students */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-[#aaa] uppercase tracking-widest">名下學生</p>
          <Link href="/m/students/add" className="text-xs text-black underline underline-offset-2">
            + 新增
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {students.map((student) => (
            <div
              key={student.id}
              className="shrink-0 bg-white rounded-xl p-4 w-28 text-center border border-[#f0f0f0]"
            >
              <div className="w-10 h-10 bg-[#f2f2f2] rounded-full mx-auto mb-2" />
              <p className="text-sm font-medium">{student.name}</p>
              <p className="text-[10px] text-[#999]">{student.age} 歲</p>
              <p className="text-xs mt-2">
                <span className="font-medium">{student.tickets}</span>{" "}
                <span className="text-[#999]">堂</span>
              </p>
            </div>
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
