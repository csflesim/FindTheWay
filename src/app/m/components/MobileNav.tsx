'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, Receipt, User } from "lucide-react"

const tabs = [
  { href: "/m", label: "首頁", icon: Home },
  { href: "/m/courses", label: "課程", icon: BookOpen },
  { href: "/m/orders", label: "訂單", icon: Receipt },
  { href: "/m/profile", label: "我的", icon: User },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#ebebeb] z-50 safe-area-inset-bottom">
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
