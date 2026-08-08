'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  LayoutDashboard, BookOpen, Ticket,
  Users, ShoppingBag, ClipboardList,
  LogOut, Menu, X, UserCircle, GraduationCap, Wallet,
  Settings2, UserCog, Shield, SlidersHorizontal, ChevronDown, ChevronRight, Bell, Building2, LayoutGrid, CreditCard, Smartphone, MonitorPlay, MessageSquare, Zap, RotateCcw,
} from "lucide-react"

// 淺色系後台版面：白色側欄＋靛藍主色（active 膠囊）、頂欄麵包屑＋鈴鐺＋頭像選單

const ACCENT = "#4F46E5"

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
    <div className={`${size} rounded-full shrink-0 flex items-center justify-center text-xs text-white`}
      style={{ backgroundColor: ACCENT }}>
      {me?.name?.charAt(0) ?? "…"}
    </div>
  )
}

type NavItem = { href: string; label: string; icon: React.ElementType }

const topItem: NavItem = { href: "/sys-admin", label: "總覽", icon: LayoutDashboard }

const navGroups: { group: string; icon: React.ElementType; items: NavItem[] }[] = [
  {
    group: "人員管理",
    icon: Users,
    items: [
      { href: "/sys-admin/accounts", label: "會員管理", icon: UserCircle },
      { href: "/sys-admin/students", label: "學員管理", icon: Users },
      { href: "/sys-admin/teachers", label: "教師管理", icon: GraduationCap },
    ],
  },
  {
    group: "課程管理",
    icon: BookOpen,
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
    icon: ShoppingBag,
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
    icon: MessageSquare,
    items: [
      { href: "/sys-admin/messages",       label: "訊息管理",   icon: MessageSquare },
      { href: "/sys-admin/line-workflows", label: "訊息工作流", icon: Zap           },
    ],
  },
  {
    group: "展示管理",
    icon: Smartphone,
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

/** 由路徑推導麵包屑：群組 › 頁面 */
function crumbsFor(pathname: string): { group?: string; label: string; icon: React.ElementType } | null {
  if (pathname === topItem.href) return { label: topItem.label, icon: topItem.icon }
  for (const g of navGroups) {
    for (const i of g.items) {
      if (pathname.startsWith(i.href)) return { group: g.group, label: i.label, icon: i.icon }
    }
  }
  for (const i of sysItems) {
    if (pathname.startsWith(i.href)) return { group: "系統管理", label: i.label, icon: i.icon }
  }
  if (pathname.startsWith("/sys-admin/system/account")) {
    return { group: "帳號", label: "個人設定", icon: Settings2 }
  }
  return null
}

/** 右上角使用者選單：點頭像展開「個人設定／登出」 */
export function UserMenu({ me }: { me: Me | null }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-[#f2f2f7]"
      >
        <Avatar me={me} size="w-8 h-8" />
        <ChevronDown size={13} className="text-[#999]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-60 bg-white rounded-2xl border border-[#ececf1] shadow-xl overflow-hidden text-black">
            <div className="px-4 py-4 border-b border-[#f3f3f7] flex items-center gap-3 bg-[#fafaff]">
              <Avatar me={me} size="w-10 h-10" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{me?.name ?? "…"}</p>
                <p className="text-[11px] text-[#999]">{me ? (ROLE_LABELS[me.role] ?? me.role) : ""}</p>
              </div>
            </div>
            <Link href="/sys-admin/system/account" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-[#f7f7fb] transition-colors">
              <Settings2 size={15} className="text-[#999]" />
              個人設定
            </Link>
            <button onClick={logout}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-[#f7f7fb] transition-colors border-t border-[#f3f3f7]">
              <LogOut size={15} className="text-[#999]" />
              登出
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** 通知鈴鐺（通知中心與排程整併時接上實際內容） */
function BellButton() {
  return (
    <button
      title="通知"
      className="p-2 rounded-full transition-colors text-[#999] hover:text-black hover:bg-[#f2f2f7]"
    >
      <Bell size={17} strokeWidth={1.5} />
    </button>
  )
}

/** 頂欄：左側麵包屑、右側鈴鐺＋頭像選單 */
export function AdminHeader() {
  const me = useMe()
  const pathname = usePathname()
  const crumb = crumbsFor(pathname)
  return (
    <div className="hidden lg:flex items-center h-14 px-5 bg-white border-b border-[#ececf1] sticky top-0 z-30">
      {crumb && (
        <div className="flex items-center gap-1.5 text-sm text-[#555]">
          <crumb.icon size={15} className="text-[#999]" />
          {crumb.group && (
            <>
              <span className="text-[#999]">{crumb.group}</span>
              <ChevronRight size={13} className="text-[#ccc]" />
            </>
          )}
          <span className="font-medium text-black">{crumb.label}</span>
        </div>
      )}
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        <BellButton />
        <UserMenu me={me} />
      </div>
    </div>
  )
}

function CollapsibleGroup({
  group, icon: GroupIcon, items, onClose,
}: { group: string; icon: React.ElementType; items: NavItem[]; onClose?: () => void }) {
  const pathname = usePathname()
  const hasActive = items.some(i => pathname.startsWith(i.href))
  const [open, setOpen] = useState(hasActive)

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors w-full text-left ${
          hasActive ? "text-black font-medium" : "text-[#666] hover:bg-[#f2f2f7]"
        }`}
      >
        <GroupIcon size={16} strokeWidth={1.5} className={hasActive ? "" : "text-[#999]"} style={hasActive ? { color: ACCENT } : undefined} />
        <span className="flex-1">{group}</span>
        <ChevronDown size={13} className={`text-[#bbb] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="flex flex-col gap-0.5 mb-1">
          {items.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href} onClick={onClose}
                className={`flex items-center gap-2.5 pl-[42px] pr-3 py-2 rounded-xl text-sm transition-colors ${
                  active
                    ? "text-white font-medium"
                    : "text-[#777] hover:bg-[#f2f2f7] hover:text-black"
                }`}
                style={active ? { backgroundColor: ACCENT } : undefined}>
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
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${
          topActive ? "text-white font-medium" : "text-[#666] hover:bg-[#f2f2f7]"
        }`}
        style={topActive ? { backgroundColor: ACCENT } : undefined}>
        <topItem.icon size={16} strokeWidth={topActive ? 2 : 1.5} className={topActive ? "" : "text-[#999]"} />
        {topItem.label}
      </Link>

      {/* Collapsible groups */}
      {navGroups.map(({ group, icon, items }) => (
        <CollapsibleGroup key={group} group={group} icon={icon} items={items} onClose={onClose} />
      ))}

      {/* Divider */}
      <div className="my-2 border-t border-[#f0f0f4]" />

      {/* 系統管理 */}
      <button
        onClick={() => setSysOpen(v => !v)}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors w-full text-left ${
          sysActive ? "text-black font-medium" : "text-[#666] hover:bg-[#f2f2f7]"
        }`}
      >
        <Settings2 size={16} strokeWidth={1.5} className={sysActive ? "" : "text-[#999]"} style={sysActive ? { color: ACCENT } : undefined} />
        <span className="flex-1">系統管理</span>
        <ChevronDown size={13} className={`text-[#bbb] transition-transform duration-200 ${sysOpen ? "rotate-180" : ""}`} />
      </button>

      {sysOpen && (
        <div className="flex flex-col gap-0.5">
          {sysItems.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href} onClick={onClose}
                className={`flex items-center gap-2.5 pl-[42px] pr-3 py-2 rounded-xl text-sm transition-colors ${
                  active
                    ? "text-white font-medium"
                    : "text-[#777] hover:bg-[#f2f2f7] hover:text-black"
                }`}
                style={active ? { backgroundColor: ACCENT } : undefined}>
                {label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-4">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-medium"
        style={{ backgroundColor: ACCENT }}>
        忙
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight">忙碌不迷路</p>
        <p className="text-[10px] text-[#aaa] leading-tight">管理後台</p>
      </div>
    </div>
  )
}

export default function AdminNav() {
  const [open, setOpen] = useState(false)
  const me = useMe()

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-white border-r border-[#ececf1] shrink-0">
        <Brand />
        <NavLinks />
      </aside>

      {/* ── Mobile top bar ──────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-12 bg-white border-b border-[#ececf1] flex items-center px-3 z-40">
        <button onClick={() => setOpen(true)} className="p-1.5 mr-2 text-[#666]">
          <Menu size={20} />
        </button>
        <p className="text-sm font-semibold flex-1">管理後台</p>
        <BellButton />
        <UserMenu me={me} />
      </header>

      {/* ── Mobile drawer overlay ───────────────── */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="relative w-64 bg-white flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between pr-4">
              <Brand />
              <button onClick={() => setOpen(false)} className="text-[#bbb] hover:text-black">
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
