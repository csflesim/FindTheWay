'use client'

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import {
  INITIAL_ORDERS, OrderDetail,
  ticketLabel, ticketLabelStyle, ticketConsumed,
  Order, Ticket,
} from "../_lib/orders"

type FlatTicket = {
  ticket: Ticket
  order: Order
}

const ALL_TICKETS: FlatTicket[] = INITIAL_ORDERS.flatMap(order =>
  order.tickets.map(ticket => ({ ticket, order }))
)

type FilterStatus = "全部" | "未使用" | "已使用" | "已轉讓"

const statusFilters: FilterStatus[] = ["全部", "未使用", "已使用", "已轉讓"]

function matchStatus(t: Ticket, f: FilterStatus): boolean {
  if (f === "全部") return true
  if (f === "已轉讓") return !!t.transferredTo
  if (f === "已使用") return ticketConsumed(t) && !t.transferredTo
  if (f === "未使用") return !t.used && !t.transferredTo
  return true
}

export default function VouchersPage() {
  const [query, setQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("全部")
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const selectedOrder = selectedOrderId
    ? INITIAL_ORDERS.find(o => o.id === selectedOrderId) ?? null
    : null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ALL_TICKETS.filter(({ ticket, order }) => {
      const matchQ = !q
        || ticket.no.toLowerCase().includes(q)
        || order.student.includes(q)
        || order.account.includes(q)
        || order.id.toLowerCase().includes(q)
        || order.item.includes(q)
      return matchQ && matchStatus(ticket, filterStatus)
    })
  }, [query, filterStatus])

  const totalUsed     = ALL_TICKETS.filter(({ ticket }) => ticketConsumed(ticket)).length
  const totalUnused   = ALL_TICKETS.filter(({ ticket }) => !ticketConsumed(ticket) && !ticket.transferredTo).length
  const totalTransfer = ALL_TICKETS.filter(({ ticket }) => !!ticket.transferredTo).length

  return (
    <div className="p-4 md:p-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Vouchers</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">卡券管理</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "總張數",  value: ALL_TICKETS.length },
          { label: "已使用",  value: totalUsed },
          { label: "未使用",  value: totalUnused },
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
      <div className="flex gap-2 mb-4">
        {statusFilters.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filterStatus === s
                ? "bg-black text-white border-black"
                : "bg-white text-[#666] border-[#f0f0f0] hover:border-[#ccc]"
            }`}
          >
            {s}
            {s === "已轉讓" && totalTransfer > 0 && (
              <span className="ml-1 opacity-60">{totalTransfer}</span>
            )}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
        <div className="grid grid-cols-[1.4fr_0.9fr_0.9fr_1.2fr_1fr_0.9fr_0.9fr] gap-4 px-5 py-3 border-b border-[#f5f5f5] text-[11px] text-[#aaa] uppercase tracking-widest">
          <span>券號</span><span>學員</span><span>所屬訂單</span><span>課程組合</span><span>使用情況</span><span>異動時間</span><span>異動人</span>
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {filtered.length === 0 && <p className="px-5 py-6 text-sm text-[#ccc]">查無課堂券</p>}
          {filtered.map(({ ticket: t, order: o }) => (
            <div key={t.no} className="grid grid-cols-[1.4fr_0.9fr_0.9fr_1.2fr_1fr_0.9fr_0.9fr] gap-4 items-center px-5 py-3.5">
              <p className="text-xs font-mono text-[#555]">{t.no}</p>
              <p className="text-sm">{o.student}</p>
              <button
                onClick={() => setSelectedOrderId(o.id)}
                className="text-xs font-mono text-black underline underline-offset-2 decoration-[#ccc] hover:decoration-black transition-colors text-left"
              >{o.id}</button>
              <p className="text-sm text-[#666]">{o.item}</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full w-fit whitespace-nowrap ${ticketLabelStyle(t)}`}>
                {ticketLabel(t)}
              </span>
              <p className="text-xs text-[#999]">{t.changedAt ?? "—"}</p>
              <p className="text-xs text-[#999]">{t.changedBy ?? "—"}</p>
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
                <p className="text-xs font-mono text-[#555]">{t.no}</p>
                <p className="text-sm mt-0.5">{o.item}</p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap ${ticketLabelStyle(t)}`}>
                {ticketLabel(t)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#999]">{o.student} ·{" "}
                <button
                  onClick={() => setSelectedOrderId(o.id)}
                  className="font-mono underline underline-offset-2 decoration-[#ccc] hover:text-black hover:decoration-black transition-colors"
                >{o.id}</button>
              </p>
              <p className="text-xs text-[#aaa]">{t.changedAt ? `${t.changedAt} · ${t.changedBy ?? "—"}` : "—"}</p>
            </div>
          </div>
        ))}
      </div>

      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  )
}
