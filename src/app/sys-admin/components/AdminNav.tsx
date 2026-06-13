'use client'

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, BookOpen, Ticket,
  Users, ShoppingBag, ClipboardList,
  LogOut, Menu, X, UserCircle, GraduationCap, Wallet,
  Settings2, UserCog, Shield, SlidersHorizontal, ChevronDown, Bell,
} from "lucide-react"

const MOCK_USER = {
  name: "陳美玲",
  role: "超級管理員",
  initial: "陳",
  avatarColor: "bg-indigo-500",
}

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

const sysItems = [
  { href: "/sys-admin/system/members", label: "人員管理", icon: UserCog           },
  { href: "/sys-admin/system/roles",   label: "角色管理", icon: Shield            },
  { href: "/sys-admin/system/params",  label: "參數管理", icon: SlidersHorizontal },
]

function UserCard() {
  return (
    <div className="mx-3 mb-1 flex items-center gap-2.5 bg-white/10 rounded-xl px-3 py-2.5">
      <div className={`w-8 h-8 ${MOCK_USER.avatarColor} rounded-full shrink-0 flex items-center justify-center text-xs text-white font-semibold`}>
        {MOCK_USER.initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{MOCK_USER.name}</p>
        <p className="text-[10px] text-white/50 truncate">{MOCK_USER.role}</p>
      </div>
      <button className="relative shrink-0 text-white/40 hover:text-white transition-colors">
        <Bell size={15} strokeWidth={1.5} />
      </button>
    </div>
  )
}

function NavLinks({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const sysActive = sysItems.some(i => pathname.startsWith(i.href))
  const [sysOpen, setSysOpen] = useState(sysActive)

  return (
    <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto">
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

      {/* Divider */}
      <div className="my-2 border-t border-white/10" />

      {/* System group */}
      <button
        onClick={() => setSysOpen(v => !v)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full text-left ${
          sysActive
            ? "text-white"
            : "text-white/60 hover:text-white hover:bg-white/10"
        }`}
      >
        <Settings2 size={16} strokeWidth={1.5} />
        <span className="flex-1">系統管理</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${sysOpen ? "rotate-180" : ""}`}
        />
      </button>

      {sysOpen && (
        <div className="flex flex-col gap-0.5 pl-2">
          {sysItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href} onClick={onClose}
                className={`flex items-center gap-3 pl-5 pr-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-white text-black font-medium"
                    : "text-white/50 hover:text-white hover:bg-white/10"
                }`}>
                <Icon size={14} strokeWidth={active ? 2 : 1.5} />
                {label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}

export default function AdminNav() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────── */}
      <aside className="hidden lg:flex flex-col w-52 min-h-screen bg-black text-white shrink-0">
        {/* Brand */}
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-[10px] text-white/40 uppercase tracking-widest">Find the Way</p>
          <p className="text-sm font-medium mt-0.5">管理後台</p>
        </div>
        {/* User card */}
        <div className="pt-3 pb-1">
          <UserCard />
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
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-6 h-6 ${MOCK_USER.avatarColor} rounded-full shrink-0 flex items-center justify-center text-[10px] text-white font-semibold`}>
            {MOCK_USER.initial}
          </div>
          <p className="text-sm font-medium truncate">{MOCK_USER.name}</p>
        </div>
        <button className="text-white/50 hover:text-white p-1">
          <Bell size={18} strokeWidth={1.5} />
        </button>
      </header>

      {/* ── Mobile drawer overlay ───────────────── */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-64 bg-black text-white flex flex-col h-full shadow-2xl">
            {/* Brand */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Find the Way</p>
                <p className="text-sm font-medium mt-0.5">管理後台</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
                <X size={18} />
              </button>
            </div>
            {/* User card */}
            <div className="pt-3 pb-1">
              <UserCard />
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
