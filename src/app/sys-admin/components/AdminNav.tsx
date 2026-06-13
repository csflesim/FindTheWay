'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, BookOpen, Ticket,
  Users, ShoppingBag, ClipboardList, LogOut,
} from "lucide-react"

const navItems = [
  { href: "/sys-admin",          label: "總覽",     icon: LayoutDashboard },
  { href: "/sys-admin/courses",  label: "課程管理", icon: BookOpen        },
  { href: "/sys-admin/tickets",  label: "課堂券",   icon: Ticket          },
  { href: "/sys-admin/orders",   label: "訂單",     icon: ShoppingBag     },
  { href: "/sys-admin/students", label: "學員",     icon: Users           },
  { href: "/sys-admin/roster",   label: "出席管理", icon: ClipboardList   },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-black text-white shrink-0">
        <div className="px-6 py-6 border-b border-white/10">
          <p className="text-[10px] text-white/40 uppercase tracking-widest">Find the Way</p>
          <p className="text-sm font-medium mt-0.5">管理後台</p>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active ? "bg-white text-black font-medium" : "text-white/60 hover:text-white hover:bg-white/10"
                }`}>
                <Icon size={16} strokeWidth={active ? 2 : 1.5} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="px-3 py-4 border-t border-white/10">
          <button className="flex items-center gap-3 px-3 py-2.5 w-full text-white/40 hover:text-white text-sm">
            <LogOut size={16} strokeWidth={1.5} />
            登出
          </button>
        </div>
      </aside>

      {/* Bottom nav — mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 z-50">
        <div className="flex">
          {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href}
                className="flex-1 flex flex-col items-center py-2.5 gap-0.5">
                <Icon size={20} strokeWidth={active ? 2 : 1.5}
                  className={active ? "text-white" : "text-white/40"} />
                <span className={`text-[9px] ${active ? "text-white" : "text-white/40"}`}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
