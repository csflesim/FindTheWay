'use client'

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, BookOpen, Ticket,
  Users, ShoppingBag, ClipboardList,
  LogOut, Menu, X, UserCircle, GraduationCap, Wallet,
} from "lucide-react"

const navItems = [
  { href: "/sys-admin",           label: "總覽",     icon: LayoutDashboard },
  { href: "/sys-admin/accounts",  label: "帳號管理", icon: UserCircle      },
  { href: "/sys-admin/students",  label: "學員管理", icon: Users           },
  { href: "/sys-admin/teachers",  label: "教師管理", icon: GraduationCap   },
  { href: "/sys-admin/courses",   label: "課程管理", icon: BookOpen        },
  { href: "/sys-admin/tickets",   label: "商品管理", icon: Ticket          },
  { href: "/sys-admin/orders",    label: "訂單管理", icon: ShoppingBag     },
  { href: "/sys-admin/finance",   label: "帳務管理", icon: Wallet          },
  { href: "/sys-admin/roster",    label: "出席管理", icon: ClipboardList   },
]

function NavLinks({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link key={href} href={href} onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              active
                ? "bg-white text-black font-medium"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}>
            <Icon size={16} strokeWidth={active ? 2 : 1.5} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export default function AdminNav() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────── */}
      <aside className="hidden lg:flex flex-col w-52 min-h-screen bg-black text-white shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <p className="text-[10px] text-white/40 uppercase tracking-widest">Find the Way</p>
          <p className="text-sm font-medium mt-0.5">管理後台</p>
        </div>
        <NavLinks />
        <div className="px-3 py-4 border-t border-white/10">
          <button className="flex items-center gap-3 px-3 py-2.5 w-full text-white/40 hover:text-white text-sm">
            <LogOut size={16} strokeWidth={1.5} />登出
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-12 bg-black text-white flex items-center px-4 z-40">
        <button onClick={() => setOpen(true)} className="p-1 mr-3">
          <Menu size={20} />
        </button>
        <p className="text-sm font-medium">管理後台</p>
      </header>

      {/* ── Mobile drawer overlay ───────────────── */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-64 bg-black text-white flex flex-col h-full shadow-2xl">
            <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Find the Way</p>
                <p className="text-sm font-medium mt-0.5">管理後台</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <NavLinks onClose={() => setOpen(false)} />
            <div className="px-3 py-4 border-t border-white/10">
              <button className="flex items-center gap-3 px-3 py-2.5 w-full text-white/40 hover:text-white text-sm">
                <LogOut size={16} strokeWidth={1.5} />登出
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
