'use client'

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"

const LINE_ERROR_MSG: Record<string, string> = {
  invalid_state: "LINE 驗證失敗，請再試一次。",
  token_failed:  "LINE 授權失敗，請確認後台 Channel Secret 設定。",
  line_failed:   "LINE 登入錯誤，請稍後再試。",
}

const LINE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
  </svg>
)

export default function LoginPage() {
  const [tab, setTab]           = useState<"login" | "register">("login")
  const [showPw, setShowPw]     = useState(false)
  const [showPw2, setShowPw2]   = useState(false)
  const searchParams = useSearchParams()
  const lineError = searchParams.get("error")

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center px-4 pt-12 pb-4">
        <Link href="/m" className="p-2 -ml-2 text-[#999] hover:text-black transition-colors">
          <ArrowLeft size={20} />
        </Link>
      </div>

      {/* LINE error banner */}
      {lineError && (
        <div className="mx-6 mb-2 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
          {LINE_ERROR_MSG[lineError] ?? "登入發生錯誤，請再試一次。"}
        </div>
      )}

      {/* Brand */}
      <div className="px-6 mb-8">
        <p className="text-[10px] text-[#bbb] uppercase tracking-widest mb-1">Find the Way</p>
        <h1 className="text-2xl font-medium leading-snug">忙碌不迷路<br />藝術工作坊</h1>
      </div>

      {/* Tab switcher */}
      <div className="mx-6 mb-6 flex bg-white border border-[#f0f0f0] rounded-xl p-1">
        <button
          onClick={() => setTab("login")}
          className={`flex-1 py-2 text-sm rounded-lg transition-colors font-medium ${
            tab === "login" ? "bg-black text-white" : "text-[#999]"
          }`}
        >
          登入
        </button>
        <button
          onClick={() => setTab("register")}
          className={`flex-1 py-2 text-sm rounded-lg transition-colors font-medium ${
            tab === "register" ? "bg-black text-white" : "text-[#999]"
          }`}
        >
          註冊
        </button>
      </div>

      {/* Form */}
      <div className="mx-6 flex flex-col gap-3">
        {tab === "login" ? (
          <>
            <div>
              <label className="text-xs text-[#999] mb-1.5 block">Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full px-4 py-3 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-[#999] mb-1.5 block">密碼</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ccc] hover:text-[#999]"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button className="text-xs text-[#aaa] hover:text-black transition-colors">
                忘記密碼？
              </button>
            </div>

            <button className="mt-2 w-full bg-black text-white py-3.5 rounded-xl text-sm font-medium hover:bg-[#222] transition-colors">
              登入
            </button>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-[#f0f0f0]" />
              <span className="text-[11px] text-[#ccc]">或</span>
              <div className="flex-1 h-px bg-[#f0f0f0]" />
            </div>

            <a href="/api/auth/line"
              className="w-full bg-[#06C755] text-white text-sm py-3.5 rounded-xl font-medium hover:bg-[#05b34d] transition-colors flex items-center justify-center gap-2">
              {LINE_ICON}
              使用 LINE 登入
            </a>
          </>
        ) : (
          <>
            <div>
              <label className="text-xs text-[#999] mb-1.5 block">姓名</label>
              <input
                type="text"
                placeholder="您的稱呼"
                className="w-full px-4 py-3 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-[#999] mb-1.5 block">Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full px-4 py-3 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-[#999] mb-1.5 block">密碼</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="至少 8 個字元"
                  className="w-full px-4 py-3 pr-11 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ccc] hover:text-[#999]"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-[#999] mb-1.5 block">確認密碼</label>
              <div className="relative">
                <input
                  type={showPw2 ? "text" : "password"}
                  placeholder="再輸入一次"
                  className="w-full px-4 py-3 pr-11 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw2(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ccc] hover:text-[#999]"
                >
                  {showPw2 ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-[#bbb] leading-relaxed">
              註冊即代表您同意本工作坊的
              <button className="text-[#666] underline underline-offset-2 mx-0.5">使用條款</button>
              與
              <button className="text-[#666] underline underline-offset-2 mx-0.5">隱私政策</button>。
            </p>

            <button className="mt-1 w-full bg-black text-white py-3.5 rounded-xl text-sm font-medium hover:bg-[#222] transition-colors">
              建立帳號
            </button>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-[#f0f0f0]" />
              <span className="text-[11px] text-[#ccc]">或</span>
              <div className="flex-1 h-px bg-[#f0f0f0]" />
            </div>

            <a href="/api/auth/line"
              className="w-full bg-[#06C755] text-white text-sm py-3.5 rounded-xl font-medium hover:bg-[#05b34d] transition-colors flex items-center justify-center gap-2">
              {LINE_ICON}
              使用 LINE 註冊
            </a>
          </>
        )}
      </div>

      <div className="flex-1" />
      <p className="text-center text-[11px] text-[#ccc] pb-10">
        © 忙碌不迷路藝術工作坊
      </p>
    </div>
  )
}
