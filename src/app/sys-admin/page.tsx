'use client'

import { useEffect, useMemo, useState } from "react"
import { TrendingUp, TrendingDown, Users, UserCheck, BookOpen, Ticket, TicketCheck, UserCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { expandScheduleToMonth, countMonthOccurrences } from "@/lib/schedule"

type Stat = { label: string; value: string; sub: string; icon: React.ElementType; up: boolean }

type OrderLite = {
  id: string
  order_no: string
  amount: number
  status: string
  created_at: string
  item_name: string
  after_sales: { refundAmount?: number } | null
  member: { name: string } | null
  student: { name: string } | null
}

type CourseLite = {
  id: string
  title: string
  schedule: string
  capacity: number
  enrolled: number
  status: string
  visible: boolean
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"]

const statusStyle: Record<string, string> = {
  "已付款": "bg-black text-white",
  "待確認": "bg-[#f5f5f5] text-[#999]",
  "已取消": "bg-[#fee2e2] text-[#991b1b]",
  "已售後": "bg-[#dcfce7] text-[#166534]",
  "已退款": "bg-[#f5f5f5] text-[#999]",
}

function StatCard({ label, value, sub, icon: Icon, up }: Stat) {
  return (
    <div className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-[#999]">{label}</span>
        <Icon size={15} className="text-[#ccc]" strokeWidth={1.5} />
      </div>
      <p className="text-xl font-medium leading-none">{value}</p>
      <p className={`text-[10px] mt-1.5 ${up ? "text-green-600" : "text-red-400"}`}>{sub}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const supabase = useMemo(() => createClient(), [])
  const [memberStats, setMemberStats] = useState<Stat[]>([])
  const [monthlyStats, setMonthlyStats] = useState<Stat[]>([])
  const [recentOrders, setRecentOrders] = useState<OrderLite[]>([])
  const [upcoming, setUpcoming] = useState<{ title: string; date: string; time: string; enrolled: number; capacity: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id, role"),
      supabase.from("students").select("id, status"),
      supabase.from("tickets").select("status, used_at"),
      supabase.from("orders")
        .select("id, order_no, amount, status, created_at, item_name, after_sales, member:profiles!member_id(name), student:students!student_id(name)")
        .order("created_at", { ascending: false }),
      supabase.from("courses").select("id, title, schedule, capacity, enrolled, status, visible"),
    ]).then(([pRes, sRes, tRes, oRes, cRes]) => {
      const profiles = pRes.data ?? []
      const students = sRes.data ?? []
      const tickets  = (tRes.data ?? []) as { status: string; used_at: string | null }[]
      const orders   = (oRes.data ?? []) as unknown as OrderLite[]
      const courses  = (cRes.data ?? []) as CourseLite[]

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      const days30Ago = now.getTime() - 30 * 86400000
      const inMonth = (iso: string) => new Date(iso).getTime() >= monthStart

      const memberCount   = profiles.filter(p => p.role === "member").length
      const studentCount  = students.filter(s => s.status === "已核准").length
      const activeNames   = new Set(
        orders.filter(o => new Date(o.created_at).getTime() >= days30Ago)
          .map(o => o.student?.name ?? o.member?.name ?? o.id)
      )
      const unusedTickets = tickets.filter(t => t.status === "未使用").length

      const activeCourses = courses.filter(c => c.status === "開課中")
      const monthClasses  = activeCourses.reduce(
        (n, c) => n + countMonthOccurrences(c.schedule, now.getFullYear(), now.getMonth()), 0)
      const monthIncome = orders
        .filter(o => (o.status === "已付款" || o.status === "已售後") && inMonth(o.created_at))
        .reduce((s, o) => s + o.amount, 0)
      const monthRefund = orders
        .filter(o => o.status === "已售後" && inMonth(o.created_at))
        .reduce((s, o) => s + (o.after_sales?.refundAmount ?? 0), 0)
      const monthUsed = tickets.filter(t => t.used_at && inMonth(t.used_at)).length

      setMemberStats([
        { label: "會員人數",   value: String(memberCount),  sub: "已註冊會員",   icon: UserCircle2, up: true },
        { label: "學員人數",   value: String(studentCount), sub: "已核准學員",   icon: UserCheck,   up: true },
        { label: "活躍學員",   value: String(activeNames.size), sub: "近 30 天有動態", icon: Users,   up: true },
        { label: "課堂券在庫", value: String(unusedTickets), sub: "未使用票券",  icon: Ticket,      up: unusedTickets > 0 },
      ])
      setMonthlyStats([
        { label: "本月課程",       value: String(monthClasses),  sub: `${activeCourses.length} 堂開課中`, icon: BookOpen,    up: true },
        { label: "本月收入",       value: `NT$${monthIncome.toLocaleString()}`, sub: "已入帳金額", icon: TrendingUp,  up: true },
        { label: "本月退款",       value: `NT$${monthRefund.toLocaleString()}`, sub: "售後退款",   icon: TrendingDown, up: monthRefund === 0 },
        { label: "本月使用課堂券", value: String(monthUsed),     sub: "本月核銷",  icon: TicketCheck, up: true },
      ])
      setRecentOrders(orders.slice(0, 4))

      // 未來 30 天內最近的三個開課場次
      const events: { title: string; ts: number; date: string; time: string; enrolled: number; capacity: number }[] = []
      for (let m = 0; m < 2; m++) {
        const d = new Date(now.getFullYear(), now.getMonth() + m, 1)
        for (const c of activeCourses.filter(c => c.visible)) {
          const map = expandScheduleToMonth(c.schedule, c.title, "", d.getFullYear(), d.getMonth())
          for (const [key, evs] of Object.entries(map)) {
            const ts = new Date(key + "T00:00:00").getTime()
            if (ts < now.getTime() - 86400000 || ts > now.getTime() + 30 * 86400000) continue
            const day = new Date(ts)
            events.push({
              title: c.title,
              ts,
              date: `${String(day.getMonth() + 1).padStart(2, "0")}/${String(day.getDate()).padStart(2, "0")} 週${WEEKDAYS[day.getDay()]}`,
              time: evs[0].time,
              enrolled: c.enrolled,
              capacity: c.capacity,
            })
          }
        }
      }
      setUpcoming(events.sort((a, b) => a.ts - b.ts).slice(0, 3))
      setLoading(false)
    })
  }, [supabase])

  return (
    <div className="p-6 w-full">
      <div className="mb-6">
        <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Dashboard</p>
        <h1 className="text-xl font-medium mt-0.5">總覽</h1>
      </div>

      {loading && <p className="text-sm text-[#ccc]">載入中…</p>}

      {/* 人數 & 庫存 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        {memberStats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* 本月數字 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {monthlyStats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-3">最新訂單</p>
          <div className="bg-white rounded-xl border border-[#f0f0f0] divide-y divide-[#f5f5f5]">
            {!loading && recentOrders.length === 0 && (
              <p className="px-4 py-4 text-sm text-[#ccc]">尚無訂單</p>
            )}
            {recentOrders.map((o) => {
              const d = new Date(o.created_at)
              const date = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
              return (
                <div key={o.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{o.student?.name ?? o.member?.name ?? "—"}</p>
                    <p className="text-xs text-[#999] mt-0.5">{o.order_no} · {o.item_name} · {date}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-sm font-medium">NT$ {o.amount.toLocaleString()}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full mt-0.5 inline-block ${statusStyle[o.status] ?? "bg-[#f5f5f5] text-[#999]"}`}>
                      {o.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Upcoming courses */}
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-3">即將開課</p>
          <div className="bg-white rounded-xl border border-[#f0f0f0] divide-y divide-[#f5f5f5]">
            {!loading && upcoming.length === 0 && (
              <p className="px-4 py-4 text-sm text-[#ccc]">近期無排課</p>
            )}
            {upcoming.map((c, i) => {
              const pct = c.capacity > 0 ? Math.round((c.enrolled / c.capacity) * 100) : 0
              return (
                <div key={`${c.title}-${i}`} className="px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-[#999] mt-0.5">{c.date} · {c.time}</p>
                    </div>
                    <span className="text-xs text-[#999] shrink-0 ml-2">{c.enrolled}/{c.capacity}</span>
                  </div>
                  <div className="mt-2 h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
                    <div className="h-full bg-black rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
