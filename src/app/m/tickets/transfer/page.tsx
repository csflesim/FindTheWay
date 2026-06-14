'use client'

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronRight } from "lucide-react"

const myTickets = [
  { id: 1, name: "10堂體驗包", student: "小明", remaining: 7 },
]

const recipients = ["本人", "小華"]

export default function TransferPage() {
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null)
  const [selectedRecipient, setSelectedRecipient] = useState("")
  const [qty, setQty] = useState(1)
  const [done, setDone] = useState(false)

  const ticket = myTickets.find(t => t.id === selectedTicket)
  const canSubmit = selectedTicket && selectedRecipient && qty >= 1 && (ticket ? qty <= ticket.remaining : false)

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
          已將 {qty} 堂課堂券轉讓給 {selectedRecipient}
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
          <div className="flex flex-col gap-2">
            {myTickets.map(t => (
              <button
                key={t.id}
                onClick={() => { setSelectedTicket(t.id); setQty(1) }}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-colors ${
                  selectedTicket === t.id ? "border-black bg-black text-white" : "border-[#f0f0f0] bg-white"
                }`}
              >
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className={`text-xs mt-0.5 ${selectedTicket === t.id ? "text-white/60" : "text-[#aaa]"}`}>
                    {t.student} · 剩餘 {t.remaining} 堂
                  </p>
                </div>
                {selectedTicket === t.id && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12l5 5L19 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Transfer qty */}
        {selectedTicket && (
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
                onClick={() => setQty(q => Math.min(ticket?.remaining ?? 1, q + 1))}
                className="w-8 h-8 rounded-lg border border-[#f0f0f0] flex items-center justify-center text-lg text-[#555] hover:border-black transition-colors"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Select recipient */}
        {selectedTicket && (
          <div>
            <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-3">轉讓對象</p>
            <div className="flex flex-col gap-2">
              {recipients.map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedRecipient(r)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
                    selectedRecipient === r ? "border-black bg-[#fafaf9]" : "border-[#f0f0f0] bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#f2f2f2] rounded-full flex items-center justify-center text-xs text-[#999]">
                      {r.slice(0, 1)}
                    </div>
                    <p className="text-sm">{r}</p>
                  </div>
                  {selectedRecipient === r && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12l5 5L19 7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          disabled={!canSubmit}
          onClick={() => setDone(true)}
          className="mt-2 w-full py-3 bg-black text-white text-sm rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#222] transition-colors"
        >
          確認轉讓
        </button>
      </div>
    </div>
  )
}
