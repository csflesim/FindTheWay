'use client'

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { fetchMemberData, type MemberStudent, type MemberOrderLite } from "../../_lib/studentsDb"

type TicketPack = {
  orderId: string
  name: string
  holder: string      // 目前持有人顯示名
  remaining: number   // 可轉讓（未使用且未曾轉讓）
}

export default function TransferPage() {
  const supabase = useMemo(() => createClient(), [])
  const [packs, setPacks] = useState<TicketPack[]>([])
  const [recipients, setRecipients] = useState<MemberStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [selectedRecipient, setSelectedRecipient] = useState("")
  const [qty, setQty] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle()
      const { approved, orders } = await fetchMemberData(supabase, profile?.name ?? "本人")
      setRecipients(approved)
      setPacks(buildPacks(orders, profile?.name ?? "本人", approved))
      setLoading(false)
    })
  }, [supabase])

  function buildPacks(orders: MemberOrderLite[], selfName: string, students: MemberStudent[]): TicketPack[] {
    const nameOf = (sid: string | null) =>
      sid == null ? selfName : (students.find(s => s.id === sid)?.name ?? "學員")
    return orders
      .filter(o => o.status === "已付款" && o.tickets.length > 0 && o.product?.transferable)
      .map(o => ({
        orderId: o.id,
        name: o.item_name,
        holder: nameOf(o.student_id),
        remaining: o.tickets.filter(t => t.status === "未使用" && !t.transferred_to).length,
      }))
      .filter(p => p.remaining > 0)
  }

  const pack = packs.find(p => p.orderId === selectedOrder)
  const recipient = recipients.find(r => r.id === selectedRecipient)
  const canSubmit = !!pack && !!recipient && qty >= 1 && qty <= (pack?.remaining ?? 0)

  async function handleTransfer() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    const res = await fetch("/api/member/transfer-tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: selectedOrder, toStudentId: selectedRecipient, qty }),
    })
    const d = await res.json()
    setSubmitting(false)
    if (!res.ok || !d.ok) { alert(`轉讓失敗：${d.error ?? res.status}`); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center gap-4 px-6">
        <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L19 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="text-lg font-medium">轉讓成功</p>
        <p className="text-sm text-[#aaa] text-center">
          已將 {qty} 堂課堂券轉讓給 {recipient?.name}
        </p>
        <Link href="/m/orders" className="mt-2 px-6 py-2.5 bg-black text-white text-sm rounded-xl">
          查看訂單
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="bg-white border-b border-[#ebebeb] px-5 py-4 flex items-center gap-3">
        <Link href="/m/profile" className="p-1 -ml-1 text-[#999] hover:text-black">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-base font-medium">轉讓課堂券</h1>
      </div>

      <div className="px-4 py-5 flex flex-col gap-5">
        {/* Select ticket */}
        <div>
          <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-3">選擇課堂券</p>
          {loading && <p className="text-sm text-[#ccc] py-4">載入中…</p>}
          {!loading && packs.length === 0 && (
            <p className="text-sm text-[#ccc] py-4">沒有可轉讓的課堂券</p>
          )}
          <div className="flex flex-col gap-2">
            {packs.map(t => (
              <button
                key={t.orderId}
                onClick={() => { setSelectedOrder(t.orderId); setQty(1) }}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-colors ${
                  selectedOrder === t.orderId ? "border-black bg-black text-white" : "border-[#f0f0f0] bg-white"
                }`}
              >
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className={`text-xs mt-0.5 ${selectedOrder === t.orderId ? "text-white/60" : "text-[#aaa]"}`}>
                    {t.holder} · 可轉讓 {t.remaining} 堂
                  </p>
                </div>
                {selectedOrder === t.orderId && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12l5 5L19 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Transfer qty */}
        {selectedOrder && (
          <div>
            <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-3">轉讓堂數</p>
            <div className="bg-white rounded-xl border border-[#f0f0f0] px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg border border-[#f0f0f0] flex items-center justify-center text-lg text-[#555] hover:border-black transition-colors"
              >
                −
              </button>
              <span className="text-xl font-light">{qty}</span>
              <button
                onClick={() => setQty(q => Math.min(pack?.remaining ?? 1, q + 1))}
                className="w-8 h-8 rounded-lg border border-[#f0f0f0] flex items-center justify-center text-lg text-[#555] hover:border-black transition-colors"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Select recipient */}
        {selectedOrder && (
          <div>
            <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-3">轉讓對象</p>
            {recipients.length === 0 ? (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-700 leading-relaxed">
                  尚無可轉讓的學員。請先到「名下學員」新增學員並通過審核。
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {recipients.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRecipient(r.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
                      selectedRecipient === r.id ? "border-black bg-[#fafaf9]" : "border-[#f0f0f0] bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#f2f2f2] rounded-full flex items-center justify-center text-xs text-[#999]">
                        {r.name.slice(0, 1)}
                      </div>
                      <p className="text-sm">{r.name}</p>
                    </div>
                    {selectedRecipient === r.id && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12l5 5L19 7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          disabled={!canSubmit || submitting}
          onClick={handleTransfer}
          className="mt-2 w-full py-3 bg-black text-white text-sm rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#222] transition-colors"
        >
          {submitting ? "轉讓中…" : "確認轉讓"}
        </button>
      </div>
    </div>
  )
}
