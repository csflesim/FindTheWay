'use client'

import { useMemo, useState } from "react"
import { X, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Order, AfterSalesRecord, Ticket } from "./orders"
import { ticketConsumed } from "./orders"

function todayTS(): string {
  const d = new Date()
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

// 只有「未使用」能收回；「待使用」（已預約課程）須先取消上課解除綁定
function unusedOf(order: Order): Ticket[] {
  return order.tickets.filter(t => t.status === "未使用")
}

function consumedOf(order: Order): Ticket[] {
  return order.tickets.filter(ticketConsumed)
}

function suggestedRefund(order: Order): number {
  const unused = unusedOf(order).length
  return order.qty > 0 ? Math.round(order.amount * unused / order.qty) : 0
}

export function AfterSalesPanel({
  order,
  onClose,
  onProcessed,
}: {
  order: Order
  onClose: () => void
  onProcessed: (updated: Order) => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const unused   = unusedOf(order)
  const consumed = consumedOf(order)
  const [selectedNos, setSelectedNos] = useState<Set<string>>(new Set(unused.map(t => t.no)))
  const [refundAmount, setRefundAmount] = useState(suggestedRefund(order))
  const [reason, setReason]             = useState("")
  const [step, setStep]                 = useState<"view" | "confirm">("view")
  const [saving, setSaving]             = useState(false)

  function toggle(no: string) {
    setSelectedNos(prev => {
      const next = new Set(prev)
      if (next.has(no)) next.delete(no); else next.add(no)
      return next
    })
  }

  async function handleConfirm() {
    if (saving) return
    setSaving(true)
    const now = todayTS()
    const reclaimedIds = order.tickets
      .filter(t => selectedNos.has(t.no) && t.status === "未使用")
      .map(t => t.id)
    const afterSales: AfterSalesRecord = {
      refundAmount,
      reclaimedTicketNos: [...selectedNos],
      reason: reason.trim() || undefined,
      processedAt: now,
    }

    // 1) 收回票券設為已失效
    if (reclaimedIds.length > 0) {
      const { error } = await supabase
        .from("tickets")
        .update({ status: "已失效" })
        .in("id", reclaimedIds)
      if (error) { setSaving(false); alert(`收回票券失敗：${error.message}`); return }
    }
    // 2) 訂單標記為已售後
    const { error: oErr } = await supabase
      .from("orders")
      .update({ status: "已售後", after_sales: afterSales })
      .eq("id", order.id)
    if (oErr) { setSaving(false); alert(`更新訂單失敗：${oErr.message}`); return }

    const updatedTickets: Ticket[] = order.tickets.map(t =>
      selectedNos.has(t.no) && t.status === "未使用"
        ? { ...t, status: "已失效" as const }
        : t
    )
    setSaving(false)
    onProcessed({ ...order, payStatus: "已售後", tickets: updatedTickets, afterSales })
  }

  const inputCls = "w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black focus:bg-white transition-colors"

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative w-full max-w-lg bg-white h-full flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f0f0] shrink-0">
          <div>
            <h2 className="text-base font-medium">售後處理</h2>
            <p className="text-xs text-[#aaa] mt-0.5">{order.orderNo} · {order.student}</p>
          </div>
          <button onClick={onClose} className="text-[#bbb] hover:text-black transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

          {/* Order summary */}
          <div className="bg-[#fafaf9] rounded-xl p-4 flex flex-col gap-2.5">
            {([
              ["學員",       order.student],
              ["所屬帳號",   order.account],
              ["課堂券組合", order.item],
              ["付款方式",   order.payMethod ?? "—"],
              ["原始金額",   `NT$ ${order.amount.toLocaleString()}`],
              ["使用進度",   `${consumed.length} 已用 / ${order.qty} 堂`],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4">
                <p className="text-xs text-[#999] shrink-0">{k}</p>
                <p className="text-sm text-[#555] text-right">{v}</p>
              </div>
            ))}
          </div>

          {/* Ticket reclaim */}
          <div>
            <p className="text-xs text-[#999] mb-2">收回票券（選擇要收回的未使用票券）</p>
            <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden divide-y divide-[#fafaf9]">
              {consumed.map(t => (
                <div key={t.no} className="flex items-center gap-3 px-4 py-2.5 opacity-40">
                  <div className="w-4 h-4 rounded border border-[#ddd] shrink-0" />
                  <p className="text-xs font-mono flex-1 text-[#555]">{t.no}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${
                    t.status === "已失效" ? "bg-[#fee2e2] text-[#991b1b]" : "bg-black text-white"
                  }`}>
                    {t.status === "已失效" ? "已失效" : t.transferredTo ? "已轉讓" : "已使用"}
                  </span>
                </div>
              ))}
              {unused.map(t => (
                <div
                  key={t.no}
                  onClick={() => toggle(t.no)}
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#fafaf9] transition-colors"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    selectedNos.has(t.no) ? "bg-black border-black" : "border-[#ddd] bg-white"
                  }`}>
                    {selectedNos.has(t.no) && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <p className="text-xs font-mono flex-1 text-[#555]">{t.no}</p>
                  <span className="text-[10px] bg-[#f5f5f5] text-[#aaa] px-2 py-0.5 rounded-full">未使用</span>
                </div>
              ))}
              {unused.length === 0 && (
                <p className="px-4 py-3 text-xs text-[#ccc]">所有票券均已使用，無可收回票券</p>
              )}
            </div>
            {unused.length > 0 && (
              <p className="text-[10px] text-[#aaa] mt-1.5">已選 {selectedNos.size} / {unused.length} 張</p>
            )}
          </div>

          {/* Refund amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-[#999]">退款金額（NT$）</p>
              <button
                onClick={() => setRefundAmount(suggestedRefund(order))}
                className="text-[10px] text-[#aaa] hover:text-black underline transition-colors"
              >
                套用建議 {suggestedRefund(order).toLocaleString()}
              </button>
            </div>
            <input
              type="number" min={0} max={order.amount}
              value={refundAmount}
              onChange={e => setRefundAmount(Number(e.target.value))}
              className={inputCls}
            />
            <p className="text-[10px] text-[#bbb] mt-1">
              建議 = 原始金額 × 未使用堂數 / 總堂數
              （{order.amount.toLocaleString()} × {unused.length} / {order.qty} = {suggestedRefund(order).toLocaleString()}）
            </p>
          </div>

          {/* Reason */}
          <div>
            <p className="text-xs text-[#999] mb-1.5">退款原因（選填）</p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. 學員因故無法繼續上課，協議退還剩餘課堂"
              className={`${inputCls} resize-none h-20`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#f0f0f0] shrink-0">
          {step === "view" ? (
            <button
              onClick={() => setStep("confirm")}
              className="w-full py-2.5 text-sm bg-black text-white rounded-xl hover:bg-[#222] transition-colors font-medium"
            >
              確認售後處理
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-800 leading-relaxed">
                  退款 NT$ {refundAmount.toLocaleString()}，收回 {selectedNos.size} 張票券。<br />
                  <span className="font-semibold">確認後無法復原，訂單將標記為「已售後」。</span>
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("view")}
                  className="flex-1 py-2.5 text-sm border border-[#f0f0f0] rounded-xl text-[#666] hover:border-[#ccc] transition-colors">
                  返回
                </button>
                <button onClick={handleConfirm} disabled={saving}
                  className="flex-1 py-2.5 text-sm bg-black text-white rounded-xl hover:bg-[#222] disabled:opacity-50 transition-colors font-medium">
                  {saving ? "處理中…" : "確認，不可撤銷"}
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
