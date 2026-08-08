'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  LayoutDashboard, BookOpen, Ticket,
  Users, ShoppingBag, ClipboardList,
  LogOut, Menu, X, UserCircle, GraduationCap, Wallet,
  Settings2, UserCog, Shield, SlidersHorizontal, ChevronDown, Building2, LayoutGrid, CreditCard, Smartphone, MonitorPlay, MessageSquare, Zap, RotateCcw,
} from "lucide-react"

type Me = { name: string; role: string; avatar_url: string | null }

const ROLE_LABELS: Record<string, string> = {
  admin: "超級管理員",
  staff: "管理員",
  teacher: "教師",
  member: "會員",
}

function useMe(): Me | null {
  const [me, setMe] = useState<Me | null>(null)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from("profiles")
        .select("name, role, avatar_url")
        .eq("id", user.id)
        .maybeSingle()
      if (data) setMe(data as Me)
    })
  }, [])
  return me
}

async function logout() {
  await createClient().auth.signOut()
  window.location.href = "/sys-admin/login"
}

function Avatar({ me, size }: { me: Me | null; size: string }) {
  if (me?.avatar_url) {
    return <img src={me.avatar_url} alt="頭貼" className={`${size} rounded-full shrink-0 object-cover`} />
  }
  return (
    <div className={`${size} rounded-full shrink-0 bg-white/20 flex items-center justify-center text-white text-xs`}>
      {me?.name?.charAt(0) ?? "…"}
    </div>
  )
}

type NavItem = { href: string; label: string; icon: React.ElementType }

const topItem: NavItem = { href: "/sys-admin", label: "總覽", icon: LayoutDashboard }

const navGroups: { group: string; items: NavItem[] }[] = [
  {
    group: "人員管理",
    items: [
      { href: "/sys-admin/accounts", label: "會員管理", icon: UserCircle },
      { href: "/sys-admin/students", label: "學員管理", icon: Users },
      { href: "/sys-admin/teachers", label: "教師管理", icon: GraduationCap },
    ],
  },
  {
    group: "課程管理",
    items: [
      { href: "/sys-admin/units",      label: "單位管理", icon: Building2 },
      { href: "/sys-admin/classrooms", label: "教室管理", icon: LayoutGrid },
      { href: "/sys-admin/courses",        label: "課堂管理", icon: BookOpen },
      { href: "/sys-admin/online-courses", label: "線上課程", icon: MonitorPlay },
      { href: "/sys-admin/roster",         label: "出席管理", icon: ClipboardList },
    ],
  },
  {
    group: "經營管理",
    items: [
      { href: "/sys-admin/tickets",    label: "商品管理", icon: Ticket },
      { href: "/sys-admin/orders",     label: "訂單管理", icon: ShoppingBag },
      { href: "/sys-admin/aftersales", label: "售後管理", icon: RotateCcw },
      { href: "/sys-admin/vouchers",   label: "卡券管理", icon: CreditCard },
      { href: "/sys-admin/finance",    label: "帳務管理", icon: Wallet },
    ],
  },
  {
    group: "訊息通知管理",
    items: [
      { href: "/sys-admin/messages",       label: "訊息管理",   icon: MessageSquare },
      { href: "/sys-admin/line-workflows", label: "訊息工作流", icon: Zap           },
    ],
  },
  {
    group: "展示管理",
    items: [
      { href: "/sys-admin/display/mobile-banner", label: "手機版廣告圖", icon: Smartphone },
    ],
  },
]

const sysItems: NavItem[] = [
  { href: "/sys-admin/system/members", label: "人員管理", icon: UserCog },
  { href: "/sys-admin/system/roles",   label: "角色管理", icon: Shield },
  { href: "/sys-admin/system/params",  label: "參數管理", icon: SlidersHorizontal },
]

/** 右上角使用者選單：點頭像展開「個人設定／登出」 */
export function UserMenu({ me, dark }: { me: Me | null; dark?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors ${
          dark ? "hover:bg-white/10" : "hover:bg-[#f5f5f5]"
        }`}
      >
        <Avatar me={me} size="w-8 h-8" />
        <ChevronDown size={13} className={dark ? "text-white/50" : "text-[#999]"} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-white rounded-xl border border-[#f0f0f0] shadow-xl overflow-hidden text-black">
            <div className="px-4 py-3 border-b border-[#f5f5f5] flex items-center gap-3">
              <Avatar me={me} size="w-9 h-9" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{me?.name ?? "…"}</p>
                <p className="text-[11px] text-[#999]">{me ? (ROLE_LABELS[me.role] ?? me.role) : ""}</p>
              </div>
            </div>
            <Link href="/sys-admin/system/account" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-[#f9f9f9] transition-colors">
              <Settings2 size={14} className="text-[#999]" />
              個人設定
            </Link>
            <button onClick={logout}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-[#f9f9f9] transition-colors border-t border-[#f5f5f5]">
              <LogOut size={14} className="text-[#999]" />
              登出
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** 桌面版內容區頂欄：右上角頭像選單 */
export function AdminHeader() {
  const me = useMe()
  return (
    <div className="hidden lg:flex items-center justify-end h-12 px-4 bg-white border-b border-[#ebebeb] sticky top-0 z-30">
      <UserMenu me={me} />
    </div>
  )
}

function CollapsibleGroup({
  group, items, onClose,
}: { group: string; items: NavItem[]; onClose?: () => void }) {
  const pathname = usePathname()
  const hasActive = items.some(i => pathname.startsWith(i.href))
  const [open, setOpen] = useState(hasActive)

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full text-left ${
          hasActive ? "text-white" : "text-white/60 hover:text-white hover:bg-white/10"
        }`}
      >
        <span className="flex-1">{group}</span>
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="flex flex-col gap-0.5 pl-2">
          {items.map(({ href, label, icon: Icon }) => {
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
    </div>
  )
}

function NavLinks({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const sysActive = sysItems.some(i => pathname.startsWith(i.href))
  const [sysOpen, setSysOpen] = useState(sysActive)
  const topActive = pathname === topItem.href

  return (
    <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto">
      {/* 總覽 */}
      <Link href={topItem.href} onClick={onClose}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
          topActive ? "bg-white text-black font-medium" : "text-white/60 hover:text-white hover:bg-white/10"
        }`}>
        <topItem.icon size={16} strokeWidth={topActive ? 2 : 1.5} />
        {topItem.label}
      </Link>

      {/* Collapsible groups */}
      {navGroups.map(({ group, items }) => (
        <CollapsibleGroup key={group} group={group} items={items} onClose={onClose} />
      ))}

      {/* Divider */}
      <div className="my-2 border-t border-white/10" />

      {/* 系統管理 */}
      <button
        onClick={() => setSysOpen(v => !v)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full text-left ${
          sysActive ? "text-white" : "text-white/60 hover:text-white hover:bg-white/10"
        }`}
      >
        <Settings2 size={16} strokeWidth={1.5} />
        <span className="flex-1">系統管理</span>
        <ChevronDown size={13} className={`transition-transform duration-200 ${sysOpen ? "rotate-180" : ""}`} />
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
  const me = useMe()

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────── */}
      <aside className="hidden lg:flex flex-col w-52 min-h-screen bg-black text-white shrink-0">
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-[10px] text-white/40 uppercase tracking-widest">Find the Way</p>
          <p className="text-sm font-medium mt-0.5">管理後台</p>
        </div>
        <NavLinks />
      </aside>

      {/* ── Mobile top bar ──────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-12 bg-black text-white flex items-center px-4 z-40">
        <button onClick={() => setOpen(true)} className="p-1 mr-3">
          <Menu size={20} />
        </button>
        <p className="text-sm font-medium flex-1">管理後台</p>
        <UserMenu me={me} dark />
      </header>

      {/* ── Mobile drawer overlay ───────────────── */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-64 bg-black text-white flex flex-col h-full shadow-2xl">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Find the Way</p>
                <p className="text-sm font-medium mt-0.5">管理後台</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <NavLinks onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
