'use client'

import { useState, useEffect, useMemo } from "react"
import { Search } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  OrderDetail, ORDER_SELECT, orderFromRow,
  ticketLabel, ticketLabelStyle, ticketConsumed,
  Order, OrderRow, Ticket,
} from "../_lib/orders"

type FlatTicket = { ticket: Ticket; order: Order }
type FilterStatus = "全部" | "未使用" | "已預約" | "已使用" | "已失效" | "已轉讓"

const statusFilters: FilterStatus[] = ["全部", "未使用", "已預約", "已使用", "已失效", "已轉讓"]

function matchStatus(t: Ticket, f: FilterStatus): boolean {
  if (f === "全部")   return true
  if (f === "已失效") return t.status === "已失效"
  if (f === "已轉讓") return !!t.transferredTo && t.status !== "已失效"
  if (f === "已使用") return t.status === "已使用" && !t.transferredTo
  if (f === "已預約") return t.status === "待使用"
  if (f === "未使用") return t.status === "未使用"
  return true
}

function expiryStyle(expiresAt?: string): string {
  if (!expiresAt) return "text-[#bbb]"
  const exp = new Date(expiresAt.replace(/\//g, "-"))
  const now = new Date()
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000)
  if (daysLeft < 0)  return "text-[#991b1b]"
  if (daysLeft < 30) return "text-amber-600"
  return "text-[#555]"
}

function fmtEventTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false,
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
}

function TicketDrawer({ ticket, order, onClose, onChanged }: {
  ticket: Ticket; order: Order; onClose: () => void; onChanged: () => void
}) {
  const [extendDays, setExtendDays] = useState("")
  const [busy, setBusy] = useState(false)

  async function act(action: "extend" | "restore") {
    if (busy) return
    const n = Math.floor(Number(extendDays))
    if (action === "extend" && (!n || n < 1)) { alert("請輸入要延長的天數"); return }
    if (action === "restore" && !confirm(`確定要把 ${ticket.no} 退回「未使用」？\n若原本已預約課程，綁定會一併解除。`)) return
    setBusy(true)
    const res = await fetch("/api/admin/ticket-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: ticket.id, action, days: action === "extend" ? n : undefined }),
    })
    const d = await res.json()
    setBusy(false)
    if (!res.ok || !d.ok) { alert(`操作失敗：${d.error ?? res.status}`); return }
    onChanged()
    onClose()
  }

  const events = ticket.history.length > 0
    ? ticket.history
    : [{ at: order.createdAt, event: "發券", note: `訂單 ${order.orderNo}` }]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f0f0] shrink-0">
          <div>
            <h2 className="text-base font-medium font-mono">{ticket.no}</h2>
            <p className="text-xs text-[#999] mt-0.5">{order.item} · {order.student}</p>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${ticketLabelStyle(ticket)}`}>{ticketLabel(ticket)}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* 基本資訊 */}
          <div className="bg-[#fafaf9] rounded-xl p-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><span className="text-[#999] text-xs">所屬訂單</span><span className="font-mono text-xs">{order.orderNo}</span></div>
            <div className="flex justify-between"><span className="text-[#999] text-xs">有效期限</span><span className="text-xs">{ticket.expiresAt ?? "—"}</span></div>
            {ticket.courseTitle && (
              <div className="flex justify-between"><span className="text-[#999] text-xs">綁定課程</span><span className="text-xs">{ticket.courseTitle}（{ticket.sessionDate}）</span></div>
            )}
            {ticket.transferredTo && (
              <div className="flex justify-between"><span className="text-[#999] text-xs">轉讓給</span><span className="text-xs">{ticket.transferredTo}</span></div>
            )}
          </div>

          {/* 歷程 */}
          <div>
            <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-3">歷程</p>
            <div className="flex flex-col">
              {events.map((e, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${i === events.length - 1 ? "bg-black" : "bg-[#ddd]"}`} />
                    {i < events.length - 1 && <div className="w-px flex-1 bg-[#eee]" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm">{e.event}{e.by ? <span className="text-[#999] text-xs ml-1.5">by {e.by}</span> : null}</p>
                    <p className="text-[11px] text-[#aaa] mt-0.5">{fmtEventTime(e.at)}{e.note ? ` · ${e.note}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 人工操作 */}
          <div className="border-t border-[#f5f5f5] pt-4 flex flex-col gap-3">
            <p className="text-[11px] text-[#aaa] uppercase tracking-widest">人工操作</p>
            <div className="flex gap-2">
              <input type="number" min={1} value={extendDays} onChange={e => setExtendDays(e.target.value)}
                placeholder="延長天數（例：30）"
                className="flex-1 px-3 py-2 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors" />
              <button onClick={() => act("extend")} disabled={busy}
                className="px-4 py-2 text-sm border border-[#e8e8e8] rounded-xl text-[#333] hover:border-black disabled:opacity-40 transition-colors whitespace-nowrap">
                延期
              </button>
            </div>
            <p className="text-[10px] text-[#bbb] -mt-1">從原效期（{ticket.expiresAt ?? "—"}）往後加；已過期的券從今天起算</p>
            {(ticket.status === "已使用" || ticket.status === "待使用") && (
              <button onClick={() => act("restore")} disabled={busy}
                className="w-full py-2.5 text-sm border border-[#e8e8e8] rounded-xl text-[#333] hover:border-black disabled:opacity-40 transition-colors">
                退回未使用{ticket.status === "已使用" ? "（撤銷核銷）" : "（解除預約）"}
              </button>
            )}
            <p className="text-[10px] text-[#bbb] leading-relaxed">
              延期：過期棄權的券可用新效期救回。退回未使用：缺席核銷後想放人補課、或代會員解除預約時使用，所有操作都會記入歷程。
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#f0f0f0] shrink-0">
          <button onClick={onClose} className="w-full py-2.5 text-sm bg-black text-white rounded-xl hover:bg-[#222] transition-colors">關閉</button>
        </div>
      </aside>
    </div>
  )
}

export default function VouchersPage() {
  const supabase = useMemo(() => createClient(), [])
  const [orders, setOrders]           = useState<Order[]>([])
  const [query, setQuery]             = useState("")
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("全部")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<FlatTicket | null>(null)
  const [ready, setReady]             = useState(false)

  function reload() {
    supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("載入卡券失敗:", error.message)
        else setOrders((data as unknown as OrderRow[]).map(orderFromRow))
        setReady(true)
      })
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload() }, [supabase])

  const allTickets = useMemo<FlatTicket[]>(() =>
    orders.flatMap(o => o.tickets.map(ticket => ({ ticket, order: o }))),
    [orders]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allTickets.filter(({ ticket: t, order: o }) => {
      const matchQ = !q
        || t.no.toLowerCase().includes(q)
        || o.student.includes(q)
        || o.account.includes(q)
        || o.orderNo.toLowerCase().includes(q)
        || o.item.includes(q)
      return matchQ && matchStatus(t, filterStatus)
    })
  }, [allTickets, query, filterStatus])

  const counts = useMemo(() => ({
    total:    allTickets.length,
    used:     allTickets.filter(({ ticket: t }) => t.status === "已使用" && !t.transferredTo).length,
    unused:   allTickets.filter(({ ticket: t }) => !ticketConsumed(t)).length,
    booked:   allTickets.filter(({ ticket: t }) => t.status === "待使用").length,
    voided:   allTickets.filter(({ ticket: t }) => t.status === "已失效").length,
    transfer: allTickets.filter(({ ticket: t }) => !!t.transferredTo && t.status !== "已失效").length,
  }), [allTickets])

  if (!ready) return <div className="p-6 text-[#aaa] text-sm">載入中…</div>

  return (
    <div className="p-4 md:p-6 w-full">
      {/* Header */}
      <div className="mb-5">
        <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Vouchers</p>
        <h1 className="text-lg md:text-xl font-medium mt-0.5">卡券管理</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: "總張數", value: counts.total },
          { label: "已預約", value: counts.booked },
          { label: "已使用", value: counts.used  },
          { label: "未使用", value: counts.unused - counts.booked },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-[#f0f0f0] text-center">
            <p className="text-xl font-medium leading-none">{value}</p>
            <p className="text-[10px] text-[#aaa] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜尋券號 / 學員 / 訂單..."
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors"
        />
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {statusFilters.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filterStatus === s
                ? "bg-black text-white border-black"
                : "bg-white text-[#666] border-[#f0f0f0] hover:border-[#ccc]"
            }`}
          >
            {s}
            {s === "已轉讓" && counts.transfer > 0 && <span className="ml-1 opacity-60">{counts.transfer}</span>}
            {s === "已失效" && counts.voided  > 0 && <span className="ml-1 opacity-60">{counts.voided}</span>}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
        <div className="grid grid-cols-[1.2fr_0.7fr_0.8fr_1fr_0.8fr_0.8fr_0.8fr_1.1fr] gap-3 px-5 py-3 border-b border-[#f5f5f5] text-[11px] text-[#aaa] uppercase tracking-widest">
          <span>券號</span><span>學員</span><span>所屬訂單</span><span>課程組合</span><span>使用情況</span><span>有效期限</span><span>使用時間</span><span>最後異動</span>
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {filtered.length === 0 && <p className="px-5 py-6 text-sm text-[#ccc]">查無課堂券</p>}
          {filtered.map(({ ticket: t, order: o }) => (
            <div key={t.no} className="grid grid-cols-[1.2fr_0.7fr_0.8fr_1fr_0.8fr_0.8fr_0.8fr_1.1fr] gap-3 items-center px-5 py-3.5">
              <button
                onClick={() => setSelectedTicket({ ticket: t, order: o })}
                className="text-xs font-mono text-[#555] underline underline-offset-2 decoration-[#e0e0e0] hover:text-black hover:decoration-black transition-colors text-left"
              >{t.no}</button>
              <p className="text-sm">{o.student}</p>
              <button
                onClick={() => setSelectedOrder(o)}
                className="text-xs font-mono text-black underline underline-offset-2 decoration-[#ccc] hover:decoration-black transition-colors text-left"
              >{o.orderNo}</button>
              <p className="text-sm text-[#666]">{o.item}</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full w-fit whitespace-nowrap ${ticketLabelStyle(t)}`}>
                {ticketLabel(t)}
              </span>
              <p className={`text-xs ${expiryStyle(t.expiresAt)}`}>{t.expiresAt ?? "—"}</p>
              <p className="text-xs text-[#999]">{t.usedAt ?? "—"}</p>
              {t.lastEvent ? (
                <div className="min-w-0">
                  <p className="text-xs text-[#555] truncate">{t.lastEvent.event}</p>
                  <p className="text-[10px] text-[#aaa] truncate">{t.lastEvent.by ?? "—"} · {fmtEventTime(t.lastEvent.at)}</p>
                </div>
              ) : (
                <p className="text-xs text-[#ccc]">—</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {filtered.length === 0 && <p className="text-sm text-[#ccc] py-4">查無課堂券</p>}
        {filtered.map(({ ticket: t, order: o }) => (
          <div key={t.no} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <button onClick={() => setSelectedTicket({ ticket: t, order: o })}
                  className="text-xs font-mono text-[#555] underline underline-offset-2 decoration-[#e0e0e0]">{t.no}</button>
                <p className="text-sm mt-0.5">{o.item}</p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap ${ticketLabelStyle(t)}`}>
                {ticketLabel(t)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#999]">{o.student} ·{" "}
                <button
                  onClick={() => setSelectedOrder(o)}
                  className="font-mono underline underline-offset-2 decoration-[#ccc] hover:text-black hover:decoration-black transition-colors"
                >{o.orderNo}</button>
              </p>
              <div className="text-right">
                {t.expiresAt && (
                  <p className={`text-[10px] ${expiryStyle(t.expiresAt)}`}>到期 {t.expiresAt}</p>
                )}
                {t.lastEvent
                  ? <p className="text-[10px] text-[#aaa]">{t.lastEvent.event} · {t.lastEvent.by ?? "—"}</p>
                  : <p className="text-xs text-[#aaa]">{t.usedAt ?? "—"}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedOrder && (
        <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
      {selectedTicket && (
        <TicketDrawer
          ticket={selectedTicket.ticket}
          order={selectedTicket.order}
          onClose={() => setSelectedTicket(null)}
          onChanged={reload}
        />
      )}
    </div>
  )
}
