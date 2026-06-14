'use client'

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronRight, Eye, EyeOff } from "lucide-react"

const inputCls = "w-full px-4 py-3 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-3">{title}</p>
      <div className="bg-white rounded-xl divide-y divide-[#f5f5f5] border border-[#f0f0f0]">
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, onClick }: { label: string; value?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 text-left"
    >
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm text-[#aaa]">{value}</span>}
        <ChevronRight size={16} className="text-[#ccc]" />
      </div>
    </button>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm">{label}</span>
      <button
        onClick={onChange}
        className={`w-10 h-6 rounded-full transition-colors relative ${value ? "bg-black" : "bg-[#ddd]"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${value ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const [name, setName] = useState("賴大紫")
  const [email] = useState("purple@findtheway.com")
  const [editingName, setEditingName] = useState(false)
  const [editingPwd, setEditingPwd] = useState(false)
  const [oldPwd, setOldPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [notifyCourse, setNotifyCourse] = useState(true)
  const [notifyOrder, setNotifyOrder] = useState(true)
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="bg-white border-b border-[#ebebeb] px-5 py-4 flex items-center gap-3">
        <Link href="/m/profile" className="p-1 -ml-1 text-[#999] hover:text-black">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-base font-medium">帳號設定</h1>
      </div>

      <div className="px-4 py-5 flex flex-col gap-6">

        {/* Profile info */}
        <Section title="個人資料">
          {editingName ? (
            <div className="px-4 py-3.5 flex flex-col gap-2">
              <label className="text-xs text-[#aaa]">顯示名稱</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className={inputCls}
                autoFocus
              />
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setEditingName(false)}
                  className="flex-1 py-2 text-sm border border-[#f0f0f0] rounded-xl"
                >
                  取消
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="flex-1 py-2 text-sm bg-black text-white rounded-xl"
                >
                  儲存
                </button>
              </div>
            </div>
          ) : (
            <Row label="顯示名稱" value={name} onClick={() => setEditingName(true)} />
          )}
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm">電子信箱</span>
            <span className="text-sm text-[#aaa]">{email}</span>
          </div>
        </Section>

        {/* Password */}
        <Section title="安全性">
          {editingPwd ? (
            <div className="px-4 py-3.5 flex flex-col gap-2">
              <label className="text-xs text-[#aaa]">舊密碼</label>
              <div className="relative">
                <input
                  type={showOld ? "text" : "password"}
                  value={oldPwd}
                  onChange={e => setOldPwd(e.target.value)}
                  placeholder="輸入舊密碼"
                  className={inputCls + " pr-10"}
                />
                <button
                  onClick={() => setShowOld(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa]"
                >
                  {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <label className="text-xs text-[#aaa] mt-1">新密碼</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  placeholder="輸入新密碼（至少8位）"
                  className={inputCls + " pr-10"}
                />
                <button
                  onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa]"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => { setEditingPwd(false); setOldPwd(""); setNewPwd("") }}
                  className="flex-1 py-2 text-sm border border-[#f0f0f0] rounded-xl"
                >
                  取消
                </button>
                <button
                  disabled={!oldPwd || newPwd.length < 8}
                  onClick={() => { setEditingPwd(false); setOldPwd(""); setNewPwd("") }}
                  className="flex-1 py-2 text-sm bg-black text-white rounded-xl disabled:opacity-40"
                >
                  更新密碼
                </button>
              </div>
            </div>
          ) : (
            <Row label="修改密碼" onClick={() => setEditingPwd(true)} />
          )}
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm">LINE 帳號綁定</p>
              <p className="text-xs text-[#aaa] mt-0.5">已綁定</p>
            </div>
            <span className="text-xs text-[#22c55e] font-medium">已綁定</span>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="通知設定">
          <Toggle label="課程提醒" value={notifyCourse} onChange={() => setNotifyCourse(v => !v)} />
          <Toggle label="訂單通知" value={notifyOrder} onChange={() => setNotifyOrder(v => !v)} />
        </Section>

        {/* Danger zone */}
        <Section title="帳號">
          <button
            onClick={() => setLogoutConfirm(true)}
            className="w-full flex items-center px-4 py-3.5 text-sm text-red-500"
          >
            登出
          </button>
        </Section>

      </div>

      {/* Logout confirm overlay */}
      {logoutConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 pb-safe">
          <div className="bg-white rounded-t-2xl w-full max-w-md px-5 py-6">
            <p className="text-base font-medium mb-1">確定登出？</p>
            <p className="text-sm text-[#aaa] mb-5">您的資料將安全保存，下次可重新登入。</p>
            <div className="flex flex-col gap-2">
              <Link
                href="/m/login"
                className="block w-full py-3 text-sm text-center bg-black text-white rounded-xl"
              >
                確認登出
              </Link>
              <button
                onClick={() => setLogoutConfirm(false)}
                className="w-full py-3 text-sm border border-[#f0f0f0] rounded-xl"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-6" />
    </div>
  )
}
