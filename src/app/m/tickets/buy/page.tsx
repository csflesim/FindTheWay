'use client'

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, X, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Package = {
  id: string
  name: string
  qty: number
  price: number
  desc: string
  highlights: string[]
  popular: boolean
}

const PACKAGE_DESCS: Record<string, string> = {
  "單堂試課券": "適合初次體驗，單堂自由安排",
  "5堂精選包":  "適合短期體驗，彈性使用",
  "10堂體驗包": "最受歡迎，可轉讓給家人",
  "20堂年繳包": "最超值選擇，適合長期學習",
}

export default function BuyTicketsPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading]   = useState(true)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [step, setStep]         = useState<"list" | "confirm" | "done">("list")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from("products").select("id, name, sessions, price, validity_months").eq("active", true).order("sort_order"),
      supabase.auth.getUser(),
    ]).then(([pRes, uRes]) => {
      setPackages(((pRes.data ?? []) as { id: string; name: string; sessions: number; price: number; validity_months: number }[])
        .map(p => ({
          id: p.id,
          name: p.name,
          qty: p.sessions,
          price: p.price,
          desc: PACKAGE_DESCS[p.name] ?? `${p.sessions} 堂課程，任選使用`,
          highlights: [
            "任選課程",
            `有效期 ${p.validity_months} 個月`,
            ...(p.sessions >= 10 ? ["可轉讓"] : []),
          ],
          popular: p.sessions === 10,
        })))
      setMemberId(uRes.data.user?.id ?? null)
      setLoading(false)
    })
  }, [supabase])

  const pkg = packages.find(p => p.id === selected)

  function handleBuy(id: string) {
    if (!memberId) {
      router.push("/m/login")
      return
    }
    setSelected(id)
    setStep("confirm")
  }

  async function handleConfirm() {
    if (!pkg || !memberId || submitting) return
    setSubmitting(true)
    const { error } = await supabase.from("orders").insert({
      member_id: memberId,
      product_id: pkg.id,
      item_name: pkg.name,
      qty: pkg.qty,
      amount: pkg.price,
      status: "待確認",
      notes: "前台下單",
    })
    setSubmitting(false)
    if (error) {
      alert(`下單失敗：${error.message}`)
      return
    }
    setStep("done")
  }

  /* ── 成功畫面 ── */
  if (step === "done") {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center px-5 text-center">
        <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center mb-5">
          <Check size={28} className="text-white" />
        </div>
        <h2 className="text-lg font-medium mb-2">訂單已送出</h2>
        <p className="text-sm text-[#aaa] mb-1.5">等待工作室確認付款後，課堂券將自動開通</p>
        <p className="text-xs text-[#bbb] mb-8">請依付款說明完成匯款或現金繳費，並通知工作室</p>
        <Link href="/m/orders"
          className="bg-black text-white text-sm px-8 py-3 rounded-xl hover:bg-[#222] transition-colors">
          查看我的訂單
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
        <h1 className="text-base font-medium">購買課堂券</h1>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {loading && <p className="text-sm text-[#ccc] text-center py-8">載入中…</p>}
        {packages.map(p => (
          <div key={p.id} className={`bg-white rounded-2xl border p-5 relative ${p.popular ? "border-black" : "border-[#f0f0f0]"}`}>
            {p.popular && (
              <span className="absolute -top-2.5 left-5 text-[10px] bg-black text-white px-2.5 py-0.5 rounded-full">最受歡迎</span>
            )}
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-[#aaa] mt-0.5">{p.desc}</p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-lg font-medium">NT$ {p.price.toLocaleString()}</p>
                <p className="text-[10px] text-[#aaa]">{p.qty} 堂</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 mb-4">
              {p.highlights.map(h => (
                <div key={h} className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-[#aaa] shrink-0" />
                  <p className="text-xs text-[#666]">{h}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => handleBuy(p.id)}
              className={`w-full py-2.5 text-sm text-center rounded-xl transition-colors ${
                p.popular
                  ? "bg-black text-white hover:bg-[#222]"
                  : "border border-[#e8e8e8] text-black hover:border-black"
              }`}
            >
              購買
            </button>
          </div>
        ))}
      </div>

      {/* ── 購買確認 Modal ── */}
      {step === "confirm" && pkg && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setStep("list")} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl p-6 pb-safe-area-inset-bottom">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-medium">確認購買</h2>
              <button onClick={() => setStep("list")} className="text-[#bbb] hover:text-black transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* 商品摘要 */}
            <div className="bg-[#fafaf9] rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium">{pkg.name}</p>
                <p className="text-sm font-medium">NT$ {pkg.price.toLocaleString()}</p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {pkg.highlights.map(h => (
                  <span key={h} className="text-[10px] text-[#aaa] bg-[#f0f0f0] px-2 py-0.5 rounded-full">{h}</span>
                ))}
              </div>
            </div>

            {/* 付款說明 */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
              <p className="text-xs font-medium text-blue-700 mb-2">付款說明</p>
              <p className="text-xs text-blue-600 leading-relaxed mb-3">
                請確認購買後，以銀行轉帳或現金繳費，並通知工作室確認。收到款項後，課堂券將自動開通。
              </p>
              <div className="bg-white rounded-lg px-3 py-2.5">
                <p className="text-[10px] text-[#aaa] mb-1">匯款帳號（示範）</p>
                <p className="text-xs font-mono text-[#333]">台灣銀行 004 · 123-456789-001</p>
                <p className="text-[10px] text-[#aaa] mt-0.5">戶名：忙碌不迷路藝術工作坊</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("list")}
                className="flex-1 py-3 text-sm border border-[#e8e8e8] rounded-xl text-[#666] hover:border-[#ccc] transition-colors">
                取消
              </button>
              <button onClick={handleConfirm} disabled={submitting}
                className="flex-1 py-3 text-sm bg-black text-white rounded-xl hover:bg-[#222] disabled:opacity-50 transition-colors font-medium">
                {submitting ? "送出中…" : "確認購買"}
              </button>
            </div>
            <div className="h-6" />
          </div>
        </div>
      )}

      <div className="h-6" />
    </div>
  )
}
