'use client'

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"

export default function LoginPage() {
  const [tab, setTab]           = useState<"login" | "register">("login")
  const [showPw, setShowPw]     = useState(false)
  const [showPw2, setShowPw2]   = useState(false)

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center px-4 pt-12 pb-4">
        <Link href="/m" className="p-2 -ml-2 text-[#999] hover:text-black transition-colors">
          <ArrowLeft size={20} />
        </Link>
      </div>

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

            <button className="w-full bg-white border border-[#f0f0f0] text-sm py-3.5 rounded-xl text-[#444] hover:border-black transition-colors flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              使用 Google 登入
            </button>
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

            <button className="w-full bg-white border border-[#f0f0f0] text-sm py-3.5 rounded-xl text-[#444] hover:border-black transition-colors flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              使用 Google 註冊
            </button>
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
