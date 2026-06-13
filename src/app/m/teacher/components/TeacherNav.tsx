'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, ClipboardList, CalendarOff, User } from "lucide-react"

const tabs = [
  { href: "/m/teacher",              label: "我的課程", icon: BookOpen     },
  { href: "/m/teacher/attendance",   label: "點名",     icon: ClipboardList },
  { href: "/m/teacher/availability", label: "請假",     icon: CalendarOff  },
  { href: "/m/teacher/profile",      label: "我的",     icon: User         },
]

export default function TeacherNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#ebebeb] z-50">
      <div className="max-w-md mx-auto flex">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center py-3 gap-1"
            >
              <Icon
                size={22}
                strokeWidth={active ? 2 : 1.5}
                className={active ? "text-black" : "text-[#aaa]"}
              />
              <span className={`text-[10px] ${active ? "text-black font-medium" : "text-[#aaa]"}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
