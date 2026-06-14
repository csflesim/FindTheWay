'use client'

import { X } from "lucide-react"

export type PayStatus = "已付款" | "待確認" | "已退款"

export type Ticket = {
  no: string
  used: boolean
  transferredTo?: string
  usedByTransferee?: boolean
  changedAt?: string
  changedBy?: string
}

export type Order = {
  id: string
  student: string
  account: string
  item: string
  qty: number
  amount: number
  date: string
  payStatus: PayStatus
  payMethod?: string
  notes?: string
  tickets: Ticket[]
}

export type TransferInfo = { index: number; to: string; at?: string; usedAt?: string }

export function makeTickets(
  orderId: string,
  qty: number,
  usedCount: number,
  usedDates?: string[],
  transfers?: TransferInfo[]
): Ticket[] {
  const num = orderId.replace("ORD-", "")
  const transferMap = new Map(transfers?.map(t => [t.index, t]) ?? [])
  return Array.from({ length: qty }, (_, i) => {
    const tr = transferMap.get(i)
    if (tr) return {
      no: `TK-${num}-${String(i + 1).padStart(2, "0")}`,
      used: false,
      transferredTo: tr.to,
      usedByTransferee: !!tr.usedAt,
      changedAt: tr.usedAt ?? tr.at ?? "06/13 10:30",
      changedBy: "明德老師",
    }
    return {
      no: `TK-${num}-${String(i + 1).padStart(2, "0")}`,
      used: i < usedCount,
      changedAt: i < usedCount ? (usedDates?.[i] ?? "06/13 10:30") : undefined,
      changedBy: i < usedCount ? "明德老師" : undefined,
    }
  })
}

export const INITIAL_ORDERS: Order[] = [
  { id: "ORD-0041", student: "鄭小德",  account: "鄭大德", item: "10堂體驗包", qty: 10, amount: 9800,  date: "06/13", payStatus: "已付款", payMethod: "銀行轉帳",
    tickets: makeTickets("ORD-0041", 10, 3, ["06/13 10:30","06/20 10:30","06/27 10:30"]) },
  { id: "ORD-0040", student: "賴大紫",  account: "賴大紫", item: "5堂精選包",  qty: 5,  amount: 5500,  date: "06/12", payStatus: "已付款", payMethod: "銀行轉帳",
    tickets: makeTickets("ORD-0040", 5, 2, ["06/12 14:00","06/19 14:00"]) },
  { id: "ORD-0039", student: "鄭小明",  account: "鄭大德", item: "單堂試課券", qty: 1,  amount: 1200,  date: "06/10", payStatus: "已付款", payMethod: "現金",
    tickets: makeTickets("ORD-0039", 1, 1, ["06/10 10:00"]) },
  { id: "ORD-0038", student: "賴小紫",  account: "賴大紫", item: "10堂體驗包", qty: 10, amount: 9800,  date: "06/09", payStatus: "已付款", payMethod: "銀行轉帳",
    tickets: makeTickets("ORD-0038", 10, 9, ["06/09 14:00","06/16 14:00","06/23 14:00","06/30 14:00","07/07 14:00","07/14 14:00","07/21 14:00","07/28 14:00","08/04 14:00"]) },
  { id: "ORD-0037", student: "鄭小德",  account: "鄭大德", item: "10堂體驗包", qty: 10, amount: 9800,  date: "06/05", payStatus: "已付款", payMethod: "現金",
    tickets: makeTickets("ORD-0037", 10, 5, undefined, [
      { index: 5, to: "鄭小明", at: "06/20 14:00", usedAt: "06/27 10:00" },
      { index: 6, to: "鄭小明", at: "06/20 14:00" },
    ]) },
  { id: "ORD-0036", student: "賴小柏",  account: "賴大紫", item: "10堂體驗包", qty: 10, amount: 9800,  date: "06/01", payStatus: "已付款", payMethod: "銀行轉帳",
    tickets: makeTickets("ORD-0036", 10, 3, ["06/01 10:00","06/08 10:00","06/15 10:00"]) },
]

export const payStatusStyle: Record<PayStatus, string> = {
  "已付款": "bg-black text-white",
  "待確認": "bg-[#fff3cd] text-[#856404]",
  "已退款": "bg-[#f5f5f5] text-[#999]",
}

export function useStatusStyle(status: string): string {
  if (status === "使用中") return "bg-[#e8f5e9] text-[#2e7d32]"
  return "bg-[#f5f5f5] text-[#999]"
}

export function ticketConsumed(t: Ticket): boolean {
  return t.used || (!!t.transferredTo && !!t.usedByTransferee)
}

export function getUseStatus(order: Order): string | null {
  if (order.payStatus !== "已付款") return null
  return order.tickets.every(ticketConsumed) ? "已用完" : "使用中"
}

export function ticketLabel(t: Ticket): string {
  if (t.transferredTo) {
    return t.usedByTransferee ? `已使用(${t.transferredTo})` : `已轉讓(${t.transferredTo})`
  }
  return t.used ? "已使用" : "未使用"
}

export function ticketLabelStyle(t: Ticket): string {
  if (t.used || (t.transferredTo && t.usedByTransferee)) return "bg-black text-white"
  if (t.transferredTo) return "bg-[#fff3e0] text-[#e65100]"
  return "bg-[#f5f5f5] text-[#aaa]"
}

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-xs text-[#999] shrink-0">{label}</p>
      <p className={`text-sm text-right ${bold ? "font-medium" : "text-[#555]"}`}>{value}</p>
    </div>
  )
}

export function OrderDetail({ order, onClose, onConfirm, onRefund }: {
  order: Order
  onClose: () => void
  onConfirm?: () => void
  onRefund?: () => void
}) {
  const useStatus = getUseStatus(order)
  const usedCount = order.tickets.filter(t => t.used).length
  const transferCount = order.tickets.filter(t => t.transferredTo).length
  const transferUsedCount = order.tickets.filter(t => t.transferredTo && t.usedByTransferee).length

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative w-full max-w-lg bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f0f0] shrink-0">
          <div>
            <h2 className="text-base font-medium">{order.id}</h2>
            <p className="text-xs text-[#aaa] mt-0.5">{order.date}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] px-2.5 py-1 rounded-full ${payStatusStyle[order.payStatus]}`}>{order.payStatus}</span>
            {useStatus && (
              <span className={`text-[11px] px-2.5 py-1 rounded-full ${useStatusStyle(useStatus)}`}>{useStatus}</span>
            )}
            <button onClick={onClose} className="ml-1 text-[#bbb] hover:text-black transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          <div className="bg-[#fafaf9] rounded-xl p-4 flex flex-col gap-3">
            <InfoRow label="學員" value={order.student} />
            <InfoRow label="所屬帳號" value={order.account} />
          </div>

          <div className="bg-[#fafaf9] rounded-xl p-4 flex flex-col gap-3">
            <InfoRow label="課堂券組合" value={order.item} />
            <InfoRow label="金額" value={`NT$ ${order.amount.toLocaleString()}`} bold />
            <InfoRow label="付款方式" value={order.payMethod ?? "—"} />
          </div>

          {order.notes && (
            <div className="bg-[#fafaf9] rounded-xl p-4">
              <p className="text-xs text-[#999] mb-1">備註</p>
              <p className="text-sm text-[#555]">{order.notes}</p>
            </div>
          )}

          {order.payStatus === "已付款" && (
            <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f5f5f5]">
                <p className="text-xs font-medium text-[#555]">課堂券</p>
                <p className="text-xs text-[#aaa]">
                  {usedCount} 已使用
                  {transferCount > 0 ? ` · ${transferCount} 轉讓${transferUsedCount > 0 ? `(${transferUsedCount} 已用)` : ""}` : ""}
                  {" "}/ {order.qty}
                </p>
              </div>
              <div className="grid grid-cols-[1.4fr_1fr_1.2fr_1fr] text-[10px] text-[#bbb] uppercase tracking-widest px-4 py-2 border-b border-[#fafaf9]">
                <span>券號</span><span>使用情況</span><span>異動時間</span><span>異動人</span>
              </div>
              <div className="divide-y divide-[#fafaf9]">
                {order.tickets.map(t => (
                  <div key={t.no} className="grid grid-cols-[1.4fr_1fr_1.2fr_1fr] items-center px-4 py-2.5">
                    <p className="text-xs font-mono text-[#555]">{t.no}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full w-fit whitespace-nowrap ${ticketLabelStyle(t)}`}>
                      {ticketLabel(t)}
                    </span>
                    <p className="text-xs text-[#999]">{t.changedAt ?? "—"}</p>
                    <p className="text-xs text-[#999]">{t.changedBy ?? "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {(onConfirm || onRefund) && order.payStatus !== "已退款" && (
          <div className="px-6 py-4 border-t border-[#f0f0f0] flex gap-3 shrink-0">
            {order.payStatus === "待確認" && onConfirm && (
              <button onClick={onConfirm} className="flex-1 py-2.5 text-sm bg-black text-white rounded-xl hover:bg-[#222] transition-colors">
                確認付款
              </button>
            )}
            {order.payStatus === "已付款" && onRefund && (
              <button onClick={onRefund} className="flex-1 py-2.5 text-sm border border-[#f0f0f0] rounded-xl text-[#999] hover:border-[#ccc] hover:text-black transition-colors">
                退款
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  )
}
