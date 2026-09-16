'use client'

import { useState } from "react"
import { Order, Ticket, ticketLabel, ticketLabelStyle } from "./orders"

// 券詳情抽屜：歷程時間軸＋人工操作（延期／人工核銷／退回未使用）
// 供卡券管理與訂單詳情共用。

export function fmtEventTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false,
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
}

export function TicketDrawer({ ticket, order, onClose, onChanged }: {
  ticket: Ticket; order: Order; onClose: () => void; onChanged: () => void
}) {
  const [extendDays, setExtendDays] = useState("")
  const [busy, setBusy] = useState(false)

  async function act(action: "extend" | "restore" | "redeem") {
    if (busy) return
    const n = Math.floor(Number(extendDays))
    if (action === "extend" && (!n || n < 1)) { alert("請輸入要延長的天數"); return }
    if (action === "restore" && !confirm(`確定要把 ${ticket.no} 退回「未使用」？\n若原本已預約課程，綁定會一併解除。`)) return
    if (action === "redeem" && !confirm(`確定要核銷 ${ticket.no}？\n用於補登實際已上過課的舊券，核銷後狀態為「已使用」。`)) return
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
    <div className="fixed inset-0 z-[70] flex justify-end">
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
            {(ticket.status === "未使用" || ticket.status === "待使用") && (
              <button onClick={() => act("redeem")} disabled={busy}
                className="w-full py-2.5 text-sm border border-[#e8e8e8] rounded-xl text-[#333] hover:border-black disabled:opacity-40 transition-colors">
                人工核銷（補登已上過的課）
              </button>
            )}
            {(ticket.status === "已使用" || ticket.status === "待使用") && (
              <button onClick={() => act("restore")} disabled={busy}
                className="w-full py-2.5 text-sm border border-[#e8e8e8] rounded-xl text-[#333] hover:border-black disabled:opacity-40 transition-colors">
                退回未使用{ticket.status === "已使用" ? "（撤銷核銷）" : "（解除預約）"}
              </button>
            )}
            <p className="text-[10px] text-[#bbb] leading-relaxed">
              延期：過期棄權的券以天數往後延。人工核銷：補登系統外已上過的課。退回未使用：缺席核銷放人補課、或代會員解除預約。所有操作都會記入歷程。
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
