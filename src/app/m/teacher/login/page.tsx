'use client'

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function TeacherLoginPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [showPw, setShowPw] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!email || !password) {
      setError("請填寫帳號與密碼")
      return
    }
    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setLoading(false)
      setError("帳號或密碼錯誤，請再試一次")
      return
    }
    // 確認此帳號對應到教師檔（以 email / LINE 比對並自動綁定）
    const res = await fetch("/api/teacher/me")
    const d = await res.json()
    setLoading(false)
    if (!d.teacher) {
      await supabase.auth.signOut()
      setError("此帳號不是教師，請確認後台教師管理的 Email 設定")
      return
    }
    router.replace("/m/teacher")
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col max-w-md mx-auto">
      {/* Top bar */}
      <div className="flex items-center px-4 pt-12 pb-4">
        <Link href="/m/teacher" className="p-2 -ml-2 text-[#999] hover:text-black transition-colors">
          <ArrowLeft size={20} />
        </Link>
      </div>

      {/* Brand */}
      <div className="px-6 mb-8">
        <p className="text-[10px] text-[#bbb] uppercase tracking-widest mb-1">Find the Way</p>
        <h1 className="text-2xl font-medium leading-snug">忙碌不迷路<br />藝術工作坊</h1>
        <p className="text-xs text-[#aaa] mt-2">教師專區</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mx-6 flex flex-col gap-3">
        <div>
          <label className="text-xs text-[#999] mb-1.5 block">Email</label>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setError("") }}
            className="w-full px-4 py-3 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors"
          />
        </div>

        <div>
          <label className="text-xs text-[#999] mb-1.5 block">密碼</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); setError("") }}
              className="w-full px-4 py-3 pr-11 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ccc] hover:text-[#999] transition-colors"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="flex justify-end mt-1.5">
            <button type="button" className="text-xs text-[#aaa] hover:text-black transition-colors">
              忘記密碼？
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 w-full py-3 text-sm font-medium bg-black text-white rounded-xl hover:bg-[#222] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "登入中..." : "登入"}
        </button>
      </form>

      {/* Divider */}
      <div className="mx-6 flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-[#f0f0f0]" />
        <span className="text-[11px] text-[#ccc]">或</span>
        <div className="flex-1 h-px bg-[#f0f0f0]" />
      </div>

      {/* LINE login */}
      <a
        href="/api/auth/line?next=/m/teacher"
        className="mx-6 flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
        style={{ backgroundColor: "#06C755" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
        </svg>
        使用 LINE 登入
      </a>

      <div className="flex-1" />
      <p className="text-center text-[11px] text-[#ccc] pb-10">
        © 忙碌不迷路藝術工作坊
      </p>
    </div>
  )
}
