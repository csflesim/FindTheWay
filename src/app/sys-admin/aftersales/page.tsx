'use client'

import { useState, useEffect, useMemo } from "react"
import { Search } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Order, OrderRow, ORDER_SELECT, orderFromRow, payStatusStyle, ticketConsumed } from "../_lib/orders"

function consumedCount(order: Order): number {
  return order.tickets.filter(ticketConsumed).length
}

export default function AfterSalesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [records, setRecords] = useState<Order[]>([])
  const [query, setQuery]     = useState("")
  const [ready, setReady]     = useState(false)

  useEffect(() => {
    supabase.from("orders").select(ORDER_SELECT)
      .eq("status", "已售後")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("載入售後紀錄失敗:", error.message)
        else setRecords((data as unknown as OrderRow[]).map(orderFromRow))
        setReady(true)
      })
  }, [supabase])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return records.filter(o =>
      !q || o.orderNo.toLowerCase().includes(q) || o.student.includes(q) || o.item.includes(q)
    )
  }, [records, query])

  if (!ready) return <div className="p-6 text-[#aaa] text-sm">載入中…</div>

  return (
    <div className="p-4 md:p-6 w-full">
      {/* Header */}
      <div className="mb-5">
        <p className="text-[11px] text-[#aaa] uppercase tracking-widest">After-sales</p>
        <h1 className="text-lg md:text-xl font-medium mt-0.5">售後訂單管理</h1>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-xl border border-[#f0f0f0] p-4 mb-5 w-fit">
        <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-1">已完成案件</p>
        <p className="text-2xl font-light text-green-600">{records.length}</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜尋訂單 / 學員..."
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors"
        />
      </div>

      {/* Empty */}
      {records.length === 0 && (
        <div className="bg-white rounded-xl border border-[#f0f0f0] px-6 py-10 text-center">
          <p className="text-sm text-[#ccc]">尚無售後紀錄</p>
          <p className="text-xs text-[#ddd] mt-1">在訂單管理中，對已付款且有使用記錄的訂單點選「發起售後」</p>
        </div>
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <div className="hidden md:block bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
          <div className="grid grid-cols-[0.65fr_0.75fr_1fr_0.5fr_0.55fr_0.7fr_0.7fr_1.2fr] gap-3 px-5 py-3 border-b border-[#f5f5f5] text-[11px] text-[#aaa] uppercase tracking-widest">
            <span>訂單</span><span>學員</span><span>組合</span><span>日期</span><span>使用進度</span><span>原始金額</span><span>退款金額</span><span>備註 / 時間</span>
          </div>
          <div className="divide-y divide-[#f5f5f5]">
            {filtered.map(o => (
              <div key={o.id}
                className="grid grid-cols-[0.65fr_0.75fr_1fr_0.5fr_0.55fr_0.7fr_0.7fr_1.2fr] gap-3 items-center px-5 py-4">
                <p className="text-xs text-[#999] font-mono">{o.orderNo}</p>
                <p className="text-sm font-medium">{o.student}</p>
                <p className="text-sm text-[#666]">{o.item}</p>
                <p className="text-xs text-[#999]">{o.date}</p>
                <p className="text-sm">
                  <span className="font-medium">{consumedCount(o)}</span>
                  <span className="text-[#aaa]"> / {o.qty}</span>
                </p>
                <p className="text-sm text-[#aaa] line-through">NT$ {o.amount.toLocaleString()}</p>
                <p className="text-sm font-medium text-green-700">
                  NT$ {o.afterSales?.refundAmount.toLocaleString() ?? "—"}
                </p>
                <div className="min-w-0">
                  {o.afterSales?.reason && (
                    <p className="text-xs text-[#666] truncate">{o.afterSales.reason}</p>
                  )}
                  {o.afterSales?.processedAt && (
                    <p className="text-[10px] text-[#bbb]">{o.afterSales.processedAt}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile cards */}
      {filtered.length > 0 && (
        <div className="md:hidden flex flex-col gap-3">
          {filtered.map(o => (
            <div key={o.id} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-medium">{o.student}</p>
                  <p className="text-xs text-[#aaa] mt-0.5">{o.orderNo} · {o.date}</p>
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full shrink-0 ${payStatusStyle[o.payStatus]}`}>
                  {o.payStatus}
                </span>
              </div>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-xs text-[#999]">{o.item}</p>
                  <p className="text-xs text-[#bbb] mt-0.5">使用 {consumedCount(o)} / {o.qty} 堂</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#bbb] line-through">NT$ {o.amount.toLocaleString()}</p>
                  <p className="text-sm font-medium text-green-700">
                    退 NT$ {o.afterSales?.refundAmount.toLocaleString() ?? "—"}
                  </p>
                </div>
              </div>
              {(o.afterSales?.reason || o.afterSales?.processedAt) && (
                <div className="pt-2 border-t border-[#f5f5f5]">
                  {o.afterSales.reason && (
                    <p className="text-xs text-[#666]">{o.afterSales.reason}</p>
                  )}
                  {o.afterSales.processedAt && (
                    <p className="text-[10px] text-[#bbb] mt-0.5">
                      收回 {o.afterSales.reclaimedTicketNos.length} 張 · {o.afterSales.processedAt}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
