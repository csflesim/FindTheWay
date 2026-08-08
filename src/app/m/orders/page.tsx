'use client'

import { useState, useEffect, useMemo } from "react"
import { X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  Order, OrderRow, PayStatus,
  ORDER_SELECT, orderFromRow, payStatusStyle,
} from "@/app/sys-admin/_lib/orders"

export default function OrdersPage() {
  const supabase = useMemo(() => createClient(), [])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)

  useEffect(() => {
    // RLS 已限定只回傳自己的訂單
    supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("載入訂單失敗:", error.message)
        else setOrders((data as unknown as OrderRow[]).map(orderFromRow))
        setLoading(false)
      })
  }, [supabase])

  // 課堂券餘額：已付款且有票券的訂單
  const ticketBalances = orders
    .filter(o => o.payStatus === "已付款" && o.tickets.length > 0)
    .map(o => ({
      id: o.id,
      name: o.item,
      student: o.student,
      remaining: o.tickets.filter(t => t.status === "未使用").length,
      total: o.qty,
      expiry: o.tickets[0]?.expiresAt ?? "—",
      transferable: o.transferable,
    }))
    .filter(t => t.remaining > 0)

  // 報名紀錄：單堂課程訂單
  const enrollments = orders.filter(o => o.courseId)

  async function confirmCancel() {
    if (!cancelTarget) return
    const { error } = await supabase.from("orders")
      .update({ status: "已取消" })
      .eq("id", cancelTarget.id)
    if (error) { alert(`取消失敗：${error.message}`); return }
    setOrders(prev => prev.map(o =>
      o.id === cancelTarget.id ? { ...o, payStatus: "已取消" as PayStatus } : o
    ))
    setCancelTarget(null)
  }

  return (
    <div>
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-[#ebebeb] px-5 py-4 z-10">
        <h1 className="text-base font-medium">訂單 & 課堂券</h1>
      </header>

      {loading && <p className="text-sm text-[#ccc] text-center py-10">載入中…</p>}

      {/* 課堂券餘額 */}
      {!loading && (
        <div className="px-4 mt-5">
          <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-3">課堂券餘額</p>
          {ticketBalances.length === 0 ? (
            <p className="text-sm text-[#ccc] py-2">尚無可用課堂券</p>
          ) : (
            <div className="flex flex-col gap-3">
              {ticketBalances.map((ticket) => (
                <div key={ticket.id} className="bg-black text-white rounded-2xl p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] text-white/50">{ticket.student}</p>
                      <p className="text-sm font-medium mt-0.5">{ticket.name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-light">{ticket.remaining}</span>
                      <span className="text-sm text-white/40"> / {ticket.total}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                    <p className="text-[10px] text-white/40">到期：{ticket.expiry}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      ticket.transferable ? "border-white/30 text-white/60" : "border-white/10 text-white/30"
                    }`}>
                      {ticket.transferable ? "可轉讓" : "不可轉讓"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 報名紀錄 */}
      {!loading && enrollments.length > 0 && (
        <div className="px-4 mt-6">
          <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-3">報名紀錄</p>
          <div className="bg-white rounded-xl divide-y divide-[#f5f5f5] border border-[#f0f0f0]">
            {enrollments.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-sm font-medium">{r.item}</p>
                  <p className="text-xs text-[#999] mt-0.5">{r.date} · {r.student}</p>
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full ${
                  r.payStatus === "已付款" ? "bg-black text-white" : payStatusStyle[r.payStatus]
                }`}>
                  {r.payStatus === "已付款" ? "已報名" : r.payStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 訂單記錄 */}
      {!loading && (
        <div className="px-4 mt-6">
          <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-3">訂單記錄</p>
          {orders.length === 0 ? (
            <p className="text-sm text-[#ccc] py-2">尚無訂單記錄</p>
          ) : (
            <div className="bg-white rounded-xl divide-y divide-[#f5f5f5] border border-[#f0f0f0]">
              {orders.map((o) => (
                <div key={o.id} className="flex items-start justify-between px-4 py-3.5 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{o.item}</p>
                    <p className="text-xs text-[#999] mt-0.5">{o.date} · <span className="font-mono">{o.orderNo}</span></p>
                    {o.notes && <p className="text-[10px] text-[#bbb] mt-0.5">{o.notes}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${payStatusStyle[o.payStatus]}`}>
                      {o.payStatus}
                    </span>
                    <p className="text-xs font-medium">NT$ {o.amount.toLocaleString()}</p>
                    {o.payStatus === "待確認" && (
                      <button
                        onClick={() => setCancelTarget(o)}
                        className="text-[10px] text-red-400 hover:text-red-600 transition-colors mt-0.5"
                      >
                        取消訂單
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="h-6" />

      {/* ── Cancel Confirm Modal ── */}
      {cancelTarget && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCancelTarget(null)} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium">取消訂單</h2>
              <button onClick={() => setCancelTarget(null)} className="text-[#bbb] hover:text-black transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="bg-[#fafaf9] rounded-xl p-4 mb-4">
              <p className="text-sm font-medium">{cancelTarget.item}</p>
              <p className="text-xs text-[#aaa] mt-0.5">{cancelTarget.orderNo} · NT$ {cancelTarget.amount.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
              <p className="text-xs text-red-600 leading-relaxed">
                確定要取消此訂單？<br />
                <span className="font-semibold">取消後無法復原。</span>若已匯款請先聯絡工作室。
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCancelTarget(null)}
                className="flex-1 py-3 text-sm border border-[#e8e8e8] rounded-xl text-[#666] hover:border-[#ccc] transition-colors">
                保留訂單
              </button>
              <button onClick={confirmCancel}
                className="flex-1 py-3 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium">
                確認取消
              </button>
            </div>
            <div className="h-6" />
          </div>
        </div>
      )}
    </div>
  )
}
