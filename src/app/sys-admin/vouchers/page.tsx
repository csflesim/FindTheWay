'use client'

import { useState, useEffect, useMemo } from "react"
import { Search } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  OrderDetail, ORDER_SELECT, orderFromRow,
  ticketLabel, ticketLabelStyle, ticketConsumed,
  Order, OrderRow, Ticket,
} from "../_lib/orders"
import { TicketDrawer, fmtEventTime } from "../_lib/TicketDrawer"

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
        <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)}
          onTicketChanged={() => { reload(); setSelectedOrder(null) }} />
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
