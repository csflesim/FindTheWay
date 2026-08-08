'use client'

import { useState } from "react"
import { X } from "lucide-react"
import type { SupabaseClient } from "@supabase/supabase-js"

export type PayStatus = "已付款" | "待確認" | "已退款" | "已取消" | "已售後"
export type TicketStatus = "未使用" | "待使用" | "已使用" | "已失效"

export type TicketEvent = { at: string; event: string; note?: string }

export type Ticket = {
  id: string
  no: string
  status: TicketStatus
  expiresAt?: string      // "YYYY/MM/DD"
  usedAt?: string         // "MM/DD HH:mm"
  transferredTo?: string  // 受讓學員姓名
  courseTitle?: string    // 待使用時綁定的課程
  sessionDate?: string    // "YYYY/MM/DD"
  history: TicketEvent[]
}

export type AfterSalesRecord = {
  refundAmount: number
  reclaimedTicketNos: string[]
  reason?: string
  processedAt?: string
}

export type Order = {
  id: string          // uuid
  orderNo: string     // "ORD-XXXX"
  student: string     // 學員姓名（無指定學員時 = 會員姓名）
  studentId: string | null
  account: string     // 會員（帳號）姓名
  memberId: string
  item: string
  productId: string | null
  courseId: string | null
  qty: number
  amount: number
  date: string        // "MM/DD"
  createdAt: string   // ISO
  payStatus: PayStatus
  payMethod?: string
  notes?: string
  transferable: boolean   // 券包商品是否開放轉讓
  tickets: Ticket[]
  afterSales?: AfterSalesRecord
}

export type Product = {
  id: string
  name: string
  sessions: number
  price: number
  validity_months: number
}

export const PAY_METHODS = ["銀行轉帳", "現金", "Line Pay", "信用卡"]

// 訂單完整查詢：會員、學員、商品、票券（含受讓人）一次 JOIN 帶齊
export const ORDER_SELECT =
  "*, member:profiles!member_id(name), student:students!student_id(name), product:products!product_id(transferable), tickets(*, transferee:students!transferred_to(name), course:courses(title))"

type TicketRow = {
  id: string
  ticket_no: string
  status: TicketStatus
  expires_at: string | null
  used_at: string | null
  session_date: string | null
  history: TicketEvent[] | null
  transferee: { name: string } | null
  course: { title: string } | null
}

export type OrderRow = {
  id: string
  order_no: string
  member_id: string
  student_id: string | null
  product_id: string | null
  course_id: string | null
  item_name: string
  qty: number
  amount: number
  status: PayStatus
  pay_method: string | null
  notes: string | null
  after_sales: AfterSalesRecord | null
  created_at: string
  member: { name: string } | null
  student: { name: string } | null
  product: { transferable: boolean } | null
  tickets: TicketRow[]
}

function pad(n: number) { return String(n).padStart(2, "0") }

function fmtMMDD(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function orderFromRow(r: OrderRow): Order {
  return {
    id: r.id,
    orderNo: r.order_no,
    student: r.student?.name ?? r.member?.name ?? "—",
    studentId: r.student_id,
    account: r.member?.name ?? "—",
    memberId: r.member_id,
    item: r.item_name,
    productId: r.product_id,
    courseId: r.course_id,
    qty: r.qty,
    amount: r.amount,
    date: fmtMMDD(r.created_at),
    createdAt: r.created_at,
    payStatus: r.status,
    payMethod: r.pay_method ?? undefined,
    notes: r.notes ?? undefined,
    transferable: r.product?.transferable ?? false,
    afterSales: r.after_sales ?? undefined,
    tickets: (r.tickets ?? [])
      .slice()
      .sort((a, b) => a.ticket_no.localeCompare(b.ticket_no))
      .map(t => ({
        id: t.id,
        no: t.ticket_no,
        status: t.status,
        expiresAt: t.expires_at ? t.expires_at.replace(/-/g, "/") : undefined,
        usedAt: t.used_at ? fmtDateTime(t.used_at) : undefined,
        transferredTo: t.transferee?.name ?? undefined,
        courseTitle: t.course?.title ?? undefined,
        sessionDate: t.session_date ? t.session_date.replace(/-/g, "/") : undefined,
        history: t.history ?? [],
      })),
  }
}

/** 確認付款發券：依商品有效月數計算到期日，產生 qty 張票券寫入 DB */
export async function issueTickets(
  supabase: SupabaseClient,
  order: { id: string; orderNo: string; studentId: string | null; qty: number },
  validityMonths: number | null,
): Promise<string | null> {
  let expiresAt: string | null = null
  if (validityMonths) {
    const d = new Date()
    d.setMonth(d.getMonth() + validityMonths)
    expiresAt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  const num = order.orderNo.replace("ORD-", "")
  const rows = Array.from({ length: order.qty }, (_, i) => ({
    ticket_no: `TK-${num}-${pad(i + 1)}`,
    order_id: order.id,
    student_id: order.studentId,
    status: "未使用" as TicketStatus,
    expires_at: expiresAt,
    history: [{ at: new Date().toISOString(), event: "發券", note: `訂單 ${order.orderNo}` }],
  }))
  const { error } = await supabase.from("tickets").insert(rows)
  return error ? error.message : null
}

export const payStatusStyle: Record<PayStatus, string> = {
  "已付款": "bg-black text-white",
  "待確認": "bg-[#fff3cd] text-[#856404]",
  "已退款": "bg-[#f5f5f5] text-[#999]",
  "已取消": "bg-[#fee2e2] text-[#991b1b]",
  "已售後": "bg-[#dcfce7] text-[#166534]",
}

export function useStatusStyle(status: string): string {
  if (status === "使用中") return "bg-[#e8f5e9] text-[#2e7d32]"
  return "bg-[#f5f5f5] text-[#999]"
}

/** 票券已消耗（不可再使用）：已使用或已失效；待使用＝已預約仍屬持有中 */
export function ticketConsumed(t: Ticket): boolean {
  return t.status === "已使用" || t.status === "已失效"
}

export function getUseStatus(order: Order): string | null {
  if (order.payStatus !== "已付款" || order.tickets.length === 0) return null
  return order.tickets.every(ticketConsumed) ? "已用完" : "使用中"
}

export function ticketLabel(t: Ticket): string {
  if (t.status === "已失效") return "已失效"
  if (t.status === "待使用") return "已預約"
  if (t.transferredTo) {
    return t.status === "已使用" ? `已使用(${t.transferredTo})` : `已轉讓(${t.transferredTo})`
  }
  return t.status
}

export function ticketLabelStyle(t: Ticket): string {
  if (t.status === "已失效") return "bg-[#fee2e2] text-[#991b1b]"
  if (t.status === "已使用") return "bg-black text-white"
  if (t.status === "待使用") return "bg-[#e8f5e9] text-[#2e7d32]"
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

export function OrderDetail({ order, onClose, onConfirm, onCancel, onInitiateAfterSales }: {
  order: Order
  onClose: () => void
  onConfirm?: (method: string) => void
  onCancel?: () => void
  onInitiateAfterSales?: () => void
}) {
  const [methodDraft, setMethodDraft] = useState(order.payMethod ?? "銀行轉帳")
  const [step, setStep] = useState<"view" | "confirm" | "cancel">("view")

  const useStatus = getUseStatus(order)
  const usedCount = order.tickets.filter(t => t.status === "已使用").length
  const transferCount = order.tickets.filter(t => t.transferredTo).length
  const transferUsedCount = order.tickets.filter(t => t.transferredTo && t.status === "已使用").length
  const hasConsumedTickets = order.tickets.some(ticketConsumed)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative w-full max-w-lg bg-white h-full flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f0f0] shrink-0">
          <div>
            <h2 className="text-base font-medium">{order.orderNo}</h2>
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

          {/* Student */}
          <div className="bg-[#fafaf9] rounded-xl p-4 flex flex-col gap-3">
            <InfoRow label="學員" value={order.student} />
            <InfoRow label="所屬帳號" value={order.account} />
          </div>

          {/* Order summary */}
          <div className="bg-[#fafaf9] rounded-xl p-4 flex flex-col gap-3">
            <InfoRow label="品項" value={order.item} />
            <InfoRow label="金額" value={`NT$ ${order.amount.toLocaleString()}`} bold />
            {order.payStatus === "已付款" && order.payMethod && (
              <InfoRow label="付款方式" value={order.payMethod} />
            )}
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-[#fafaf9] rounded-xl p-4">
              <p className="text-xs text-[#999] mb-1">備註</p>
              <p className="text-sm text-[#555]">{order.notes}</p>
            </div>
          )}

          {/* Payment method selector — 待確認 only */}
          {order.payStatus === "待確認" && (
            <div>
              <p className="text-xs text-[#999] mb-2">選擇付款方式</p>
              <div className="grid grid-cols-2 gap-2">
                {PAY_METHODS.map(m => (
                  <button key={m} onClick={() => { setMethodDraft(m); setStep("view") }}
                    className={`py-2.5 text-sm rounded-xl border transition-colors ${
                      methodDraft === m
                        ? "bg-black text-white border-black"
                        : "bg-[#fafaf9] text-[#555] border-[#f0f0f0] hover:border-[#ccc]"
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tickets */}
          {(order.payStatus === "已付款" || order.payStatus === "已售後") && order.tickets.length > 0 && (
            <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f5f5f5]">
                <div>
                  <p className="text-xs font-medium text-[#555]">課堂券</p>
                  {order.tickets[0]?.expiresAt && (
                    <p className="text-[10px] text-[#aaa] mt-0.5">到期 {order.tickets[0].expiresAt}</p>
                  )}
                </div>
                <p className="text-xs text-[#aaa]">
                  {usedCount} 已使用
                  {transferCount > 0 ? ` · ${transferCount} 轉讓${transferUsedCount > 0 ? `(${transferUsedCount} 已用)` : ""}` : ""}
                  {" "}/ {order.qty}
                </p>
              </div>
              <div className="grid grid-cols-[1.4fr_1.2fr_1fr_1fr] text-[10px] text-[#bbb] uppercase tracking-widest px-4 py-2 border-b border-[#fafaf9]">
                <span>券號</span><span>使用情況</span><span>使用時間</span><span>到期</span>
              </div>
              <div className="divide-y divide-[#fafaf9]">
                {order.tickets.map(t => (
                  <div key={t.no} className="grid grid-cols-[1.4fr_1.2fr_1fr_1fr] items-center px-4 py-2.5">
                    <p className="text-xs font-mono text-[#555]">{t.no}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full w-fit whitespace-nowrap ${ticketLabelStyle(t)}`}>
                      {ticketLabel(t)}
                    </span>
                    <p className="text-xs text-[#999]">{t.usedAt ?? "—"}</p>
                    <p className="text-xs text-[#999]">{t.expiresAt ?? "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#f0f0f0] shrink-0">
          {order.payStatus === "待確認" && (
            step === "view" ? (
              <div className="flex flex-col gap-2">
                <button onClick={() => setStep("confirm")}
                  className="w-full py-2.5 text-sm bg-black text-white rounded-xl hover:bg-[#222] transition-colors font-medium">
                  確認付款
                </button>
                {onCancel && (
                  <button onClick={() => setStep("cancel")}
                    className="w-full py-2.5 text-sm border border-[#f0f0f0] rounded-xl text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors">
                    取消訂單
                  </button>
                )}
              </div>
            ) : step === "confirm" ? (
              <div className="flex flex-col gap-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    確認以【{methodDraft}】完成收款？<br />
                    <span className="font-semibold">儲存後無法更改付款狀態。</span>
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep("view")}
                    className="flex-1 py-2.5 text-sm border border-[#f0f0f0] rounded-xl text-[#666] hover:border-[#ccc] transition-colors">
                    返回
                  </button>
                  {onConfirm && (
                    <button onClick={() => onConfirm(methodDraft)}
                      className="flex-1 py-2.5 text-sm bg-black text-white rounded-xl hover:bg-[#222] transition-colors font-medium">
                      確認，不可撤銷
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-red-700 leading-relaxed">
                    確定要取消此訂單？<br />
                    <span className="font-semibold">取消後無法復原。</span>
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep("view")}
                    className="flex-1 py-2.5 text-sm border border-[#f0f0f0] rounded-xl text-[#666] hover:border-[#ccc] transition-colors">
                    返回
                  </button>
                  {onCancel && (
                    <button onClick={onCancel}
                      className="flex-1 py-2.5 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium">
                      確認取消
                    </button>
                  )}
                </div>
              </div>
            )
          )}

          {order.payStatus === "已付款" && (
            hasConsumedTickets && onInitiateAfterSales ? (
              <button onClick={onInitiateAfterSales}
                className="w-full py-2.5 text-sm border border-[#f0f0f0] rounded-xl text-[#666] hover:border-black hover:text-black transition-colors">
                發起售後
              </button>
            ) : (
              <p className="text-xs text-center text-[#ccc] py-1">此訂單已鎖定，無法更改</p>
            )
          )}

          {order.payStatus === "已售後" && (
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-4 py-3">
              <p className="text-xs font-medium text-green-700 mb-1.5">已完成售後處理</p>
              {order.afterSales && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-green-600">退款金額：NT$ {order.afterSales.refundAmount.toLocaleString()}</p>
                  <p className="text-xs text-green-600">收回票券：{order.afterSales.reclaimedTicketNos.length} 張</p>
                  {order.afterSales.reason && <p className="text-xs text-green-600">原因：{order.afterSales.reason}</p>}
                  {order.afterSales.processedAt && <p className="text-xs text-green-600">處理時間：{order.afterSales.processedAt}</p>}
                </div>
              )}
            </div>
          )}

          {(order.payStatus === "已退款" || order.payStatus === "已取消") && (
            <p className="text-xs text-center text-[#ccc] py-1">此訂單已結案</p>
          )}
        </div>
      </aside>
    </div>
  )
}
