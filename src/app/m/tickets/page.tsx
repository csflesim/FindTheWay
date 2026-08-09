'use client'

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

// 我的課堂券：每張券的狀態、綁定課程、效期與完整歷程

type TicketEvent = { at: string; event: string; note?: string; by?: string }

type MyTicket = {
  id: string
  no: string
  item: string          // 券包名稱
  status: string        // 未使用 / 待使用 / 已使用 / 已失效
  holder: string
  expiresAt: string | null
  courseTitle: string | null
  sessionDate: string | null
  history: TicketEvent[]
}

type Filter = "全部" | "未使用" | "已預約" | "已使用" | "已失效"
const FILTERS: Filter[] = ["全部", "未使用", "已預約", "已使用", "已失效"]

function todayStr() { return new Date().toISOString().slice(0, 10) }

function statusLabel(t: MyTicket): { text: string; cls: string } {
  if (t.status === "已失效") return { text: "已失效", cls: "bg-[#fee2e2] text-[#991b1b]" }
  if (t.status === "已使用") return { text: "已使用", cls: "bg-black text-white" }
  if (t.status === "待使用") return { text: "已預約", cls: "bg-[#e8f5e9] text-[#2e7d32]" }
  if (t.expiresAt && t.expiresAt < todayStr()) return { text: "已過期", cls: "bg-[#fff3e0] text-[#e65100]" }
  return { text: "未使用", cls: "bg-[#f5f5f5] text-[#999]" }
}

function matchFilter(t: MyTicket, f: Filter): boolean {
  if (f === "全部") return true
  if (f === "已預約") return t.status === "待使用"
  return t.status === f
}

function fmtEventTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei", hour12: false,
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  })
}

export default function MyTicketsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [tickets, setTickets] = useState<MyTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("全部")
  const [selected, setSelected] = useState<MyTicket | null>(null)

  useEffect(() => {
    // RLS 只回自己的券
    supabase.from("tickets")
      .select("id, ticket_no, status, expires_at, session_date, history, course:courses(title), student:students!student_id(name), transferee:students!transferred_to(name), orders!inner(item_name, member:profiles!member_id(name))")
      .order("ticket_no")
      .then(({ data, error }) => {
        if (error) console.error("載入課堂券失敗:", error.message)
        else {
          setTickets(((data ?? []) as unknown as {
            id: string; ticket_no: string; status: string; expires_at: string | null
            session_date: string | null; history: TicketEvent[] | null
            course: { title: string } | null
            student: { name: string } | null
            transferee: { name: string } | null
            orders: { item_name: string; member: { name: string } | null }
          }[]).map(t => ({
            id: t.id,
            no: t.ticket_no,
            item: t.orders.item_name,
            status: t.status,
            holder: t.transferee?.name ?? t.student?.name ?? "本人",
            expiresAt: t.expires_at,
            courseTitle: t.course?.title ?? null,
            sessionDate: t.session_date,
            history: t.history ?? [],
          })))
        }
        setLoading(false)
      })
  }, [supabase])

  const filtered = tickets.filter(t => matchFilter(t, filter))
  const counts = {
    unused: tickets.filter(t => t.status === "未使用").length,
    booked: tickets.filter(t => t.status === "待使用").length,
    used: tickets.filter(t => t.status === "已使用").length,
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] pb-24">
      <div className="bg-white border-b border-[#ebebeb] px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/m/profile" className="p-1 -ml-1 text-[#999] hover:text-black">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-base font-medium">我的課堂券</h1>
      </div>

      {/* Stats */}
      <div className="px-4 mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "可使用", value: counts.unused },
          { label: "已預約", value: counts.booked },
          { label: "已使用", value: counts.used },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-[#f0f0f0] py-3 text-center">
            <p className="text-xl font-light">{value}</p>
            <p className="text-[10px] text-[#aaa] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="px-4 mt-4 flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === f ? "bg-black text-white border-black" : "bg-white text-[#666] border-[#f0f0f0]"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 mt-4 flex flex-col gap-3">
        {loading && <p className="text-sm text-[#ccc] text-center py-8">載入中…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-[#ccc] text-center py-8">沒有符合的課堂券</p>
        )}
        {filtered.map(t => {
          const s = statusLabel(t)
          return (
            <button key={t.id} onClick={() => setSelected(t)}
              className="bg-white rounded-xl border border-[#f0f0f0] p-4 text-left hover:border-[#ccc] transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-mono text-[#999]">{t.no}</p>
                  <p className="text-sm font-medium mt-0.5">{t.item}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${s.cls}`}>{s.text}</span>
              </div>
              <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-[#f7f7f7]">
                <p className="text-[11px] text-[#999]">
                  {t.holder}
                  {t.courseTitle && t.sessionDate && (
                    <span className="ml-2 text-[#2e7d32]">{t.courseTitle} · {t.sessionDate.replace(/-/g, "/")}</span>
                  )}
                </p>
                <p className="text-[11px] text-[#aaa]">{t.expiresAt ? `效期 ${t.expiresAt.replace(/-/g, "/")}` : ""}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── 明細（歷程）Sheet ── */}
      {selected && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div>
                <h2 className="text-base font-medium font-mono">{selected.no}</h2>
                <p className="text-xs text-[#999] mt-0.5">{selected.item} · {selected.holder}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-[#bbb] hover:text-black transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 pb-8 overflow-y-auto flex flex-col gap-4">
              <div className="bg-[#fafaf9] rounded-xl p-4 flex flex-col gap-2 text-xs">
                <div className="flex justify-between"><span className="text-[#999]">狀態</span><span>{statusLabel(selected).text}</span></div>
                <div className="flex justify-between"><span className="text-[#999]">有效期限</span><span>{selected.expiresAt?.replace(/-/g, "/") ?? "—"}</span></div>
                {selected.courseTitle && selected.sessionDate && (
                  <div className="flex justify-between"><span className="text-[#999]">預約課程</span><span>{selected.courseTitle}（{selected.sessionDate.replace(/-/g, "/")}）</span></div>
                )}
              </div>
              <div>
                <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-3">歷程</p>
                {selected.history.length === 0 && <p className="text-sm text-[#ccc]">尚無紀錄</p>}
                <div className="flex flex-col">
                  {selected.history.map((e, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${i === selected.history.length - 1 ? "bg-black" : "bg-[#ddd]"}`} />
                        {i < selected.history.length - 1 && <div className="w-px flex-1 bg-[#eee]" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm">{e.event}</p>
                        <p className="text-[11px] text-[#aaa] mt-0.5">
                          {fmtEventTime(e.at)}{e.note ? ` · ${e.note}` : ""}{e.by ? ` · ${e.by}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
