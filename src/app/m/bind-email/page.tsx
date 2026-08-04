'use client'

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, Mail } from "lucide-react"

const inputCls = "w-full px-4 py-3 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors"

function BindEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawNext = searchParams.get("next") ?? "/m"
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/m"

  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [sent, setSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  // LINE 暫存身分逾時或不存在 → 回登入頁重新用 LINE 登入
  useEffect(() => {
    fetch("/api/member/email-code")
      .then(r => r.json())
      .then(d => { if (!d.pending) router.replace("/m/login") })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function sendCode() {
    if (busy || cooldown > 0) return
    setError("")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("請輸入正確的 Email")
      return
    }
    setBusy(true)
    const res = await fetch("/api/member/email-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    })
    const d = await res.json()
    setBusy(false)
    if (!res.ok || !d.ok) { setError(d.error ?? "寄送失敗，請稍後再試"); return }
    setSent(true)
    setCooldown(60)
  }

  async function verify() {
    if (busy) return
    setError("")
    setBusy(true)
    const res = await fetch("/api/member/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    })
    const d = await res.json()
    setBusy(false)
    if (!res.ok || !d.ok) { setError(d.error ?? "驗證失敗"); return }
    setDone(true)
    setTimeout(() => router.replace(next), 1200)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center px-5 text-center">
        <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center mb-5">
          <Check size={28} className="text-white" />
        </div>
        <h2 className="text-lg font-medium mb-2">註冊完成</h2>
        <p className="text-sm text-[#aaa]">課程與訂單通知將寄送至 {email.trim()}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col max-w-md mx-auto">
      <div className="px-6 pt-16 mb-8">
        <p className="text-[10px] text-[#bbb] uppercase tracking-widest mb-1">Find the Way</p>
        <h1 className="text-2xl font-medium leading-snug">綁定 Email</h1>
        <p className="text-xs text-[#aaa] mt-2 leading-relaxed">
          完成註冊前請綁定你的 Email——課程提醒、訂單通知都會寄到這個信箱。
        </p>
      </div>

      <div className="mx-6 flex flex-col gap-4">
        <div>
          <label className="text-xs text-[#999] mb-1.5 block">Email</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError("") }}
              placeholder="your@email.com"
              disabled={busy}
              className={inputCls}
            />
            <button
              onClick={sendCode}
              disabled={busy || cooldown > 0 || !email.trim()}
              className="shrink-0 px-4 py-3 text-sm bg-black text-white rounded-xl disabled:opacity-40 whitespace-nowrap"
            >
              {cooldown > 0 ? `${cooldown}s` : sent ? "重新寄送" : "寄驗證碼"}
            </button>
          </div>
        </div>

        {sent && (
          <div>
            <label className="text-xs text-[#999] mb-1.5 block">驗證碼</label>
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, "")); setError("") }}
              placeholder="6 位數驗證碼"
              className={`${inputCls} tracking-[0.5em] text-center text-lg`}
            />
            <div className="flex items-center gap-1.5 mt-2">
              <Mail size={12} className="text-[#bbb]" />
              <p className="text-[11px] text-[#aaa]">驗證碼已寄至 {email.trim()}，10 分鐘內有效</p>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        {sent && (
          <button
            onClick={verify}
            disabled={busy || code.length !== 6}
            className="w-full py-3 text-sm font-medium bg-black text-white rounded-xl disabled:opacity-40"
          >
            {busy ? "驗證中…" : "完成綁定"}
          </button>
        )}
      </div>

      <div className="flex-1" />
      <p className="text-center text-[11px] text-[#ccc] pb-10">
        © 忙碌不迷路藝術工作坊
      </p>
    </div>
  )
}

export default function BindEmailPage() {
  return (
    <Suspense>
      <BindEmailContent />
    </Suspense>
  )
}
