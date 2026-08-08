'use client'

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const LINE_ERROR_MSG: Record<string, string> = {
  invalid_state: "LINE 驗證失敗，請再試一次。",
  token_failed:  "LINE 授權失敗，請確認後台 Channel Secret 設定。",
  line_failed:   "LINE 登入錯誤，請稍後再試。",
}

const LINE_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
  </svg>
)

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const lineError = searchParams.get("error")
  const rawNext = searchParams.get("next") ?? "/m"
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/m"

  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin() {
    if (busy || !identifier.trim() || !password) return
    setBusy(true); setError("")
    const res = await fetch("/api/auth/portal-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portal: "member", identifier: identifier.trim(), password }),
    })
    const d = await res.json()
    setBusy(false)
    if (!res.ok || !d.ok) { setError(d.error ?? "登入失敗"); return }
    router.replace(next)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center px-4 pt-12 pb-4">
        <Link href="/m" className="p-2 -ml-2 text-[#999] hover:text-black transition-colors">
          <ArrowLeft size={20} />
        </Link>
      </div>

      {/* Error banner */}
      {lineError && (
        <div className="mx-6 mb-2 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
          {LINE_ERROR_MSG[lineError] ?? "登入發生錯誤，請再試一次。"}
        </div>
      )}

      {/* Brand */}
      <div className="px-6 mb-12 mt-4">
        <p className="text-[10px] text-[#bbb] uppercase tracking-widest mb-1">Find the Way</p>
        <h1 className="text-2xl font-medium leading-snug">忙碌不迷路<br />藝術工作坊</h1>
      </div>

      {/* LINE login */}
      <div className="mx-6 flex flex-col gap-4">
        <a
          href={`/api/auth/line?portal=member&next=${encodeURIComponent(next)}`}
          className="w-full bg-[#06C755] text-white py-4 rounded-2xl font-medium flex items-center justify-center gap-3 hover:bg-[#05b34d] active:scale-[0.98] transition-all text-base shadow-sm"
        >
          {LINE_ICON}
          使用 LINE 登入／註冊
        </a>
        <p className="text-center text-[11px] text-[#bbb] leading-relaxed px-4">
          首次使用請以 LINE 註冊，將自動建立會員帳號
        </p>

        {/* 帳密登入 */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-[#eee]" />
          <span className="text-[11px] text-[#ccc]">或以帳號密碼登入</span>
          <div className="flex-1 h-px bg-[#eee]" />
        </div>

        <input
          value={identifier}
          onChange={e => { setIdentifier(e.target.value); setError("") }}
          placeholder="Email 或手機號碼"
          className="w-full px-4 py-3 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors"
        />
        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError("") }}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          placeholder="密碼"
          className="w-full px-4 py-3 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={handleLogin}
          disabled={busy || !identifier.trim() || !password}
          className="w-full py-3.5 text-sm font-medium bg-black text-white rounded-2xl disabled:opacity-40 transition-opacity"
        >
          {busy ? "登入中…" : "登入"}
        </button>
        <p className="text-center text-[11px] text-[#bbb]">
          密碼可在 LINE 註冊後至「設定」建立
        </p>
      </div>

      <div className="flex-1" />
      <p className="text-center text-[11px] text-[#ccc] pb-10">
        © 忙碌不迷路藝術工作坊
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
