'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, MonitorPlay, ScrollText, User } from "lucide-react"
import { useState, useEffect } from "react"

const ALL_TABS = [
  { href: "/m",               label: "首頁",  icon: Home,        feature: null },
  { href: "/m/courses",       label: "實體課", icon: BookOpen,    feature: null },
  { href: "/m/online-courses", label: "線上課", icon: MonitorPlay, feature: "onlineCourse" },
  { href: "/m/orders",        label: "訂單",  icon: ScrollText,  feature: null },
  { href: "/m/profile",       label: "我的",  icon: User,        feature: null },
]

export default function MobileNav() {
  const pathname = usePathname()
  const [onlineCourse, setOnlineCourse] = useState(true)

  useEffect(() => {
    fetch("/api/public-params")
      .then(r => (r.ok ? r.json() : null))
      .then(p => {
        if (p?.features && typeof p.features.onlineCourse === "boolean") {
          setOnlineCourse(p.features.onlineCourse)
        }
      })
      .catch(() => {})
  }, [])

  if (pathname.startsWith("/m/teacher")) return null

  const tabs = ALL_TABS.filter(t => t.feature !== "onlineCourse" || onlineCourse)

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#ebebeb] z-50 safe-area-inset-bottom">
      <div className="max-w-md mx-auto flex">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/m" ? pathname === href : pathname.startsWith(href)
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
