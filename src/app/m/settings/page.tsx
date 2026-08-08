'use client'

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronRight, Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const inputCls = "w-full px-4 py-3 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors"
const NOTIFY_KEY = "ftw.notify.v1"

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
  const supabase = useMemo(() => createClient(), [])
  const [name, setName] = useState("")
  const [nameDraft, setNameDraft] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [phoneDraft, setPhoneDraft] = useState("")
  const [editingPhone, setEditingPhone] = useState(false)
  const [isLineAccount, setIsLineAccount] = useState(false)
  const [lineBound, setLineBound] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editingPwd, setEditingPwd] = useState(false)
  const [oldPwd, setOldPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notifyCourse, setNotifyCourse] = useState(true)
  const [notifyOrder, setNotifyOrder] = useState(true)
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  useEffect(() => {
    try {
      const s = localStorage.getItem(NOTIFY_KEY)
      if (s) {
        const p = JSON.parse(s)
        if (typeof p.course === "boolean") setNotifyCourse(p.course)
        if (typeof p.order === "boolean") setNotifyOrder(p.order)
      }
    } catch {}
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? "")
      setIsLineAccount(user.user_metadata?.registered_via === "line")
      const { data: profile } = await supabase.from("profiles")
        .select("name, line_user_id, phone").eq("id", user.id).maybeSingle()
      if (profile) {
        setName(profile.name || "")
        setNameDraft(profile.name || "")
        setLineBound(!!profile.line_user_id)
        setPhone(profile.phone || "")
        setPhoneDraft(profile.phone || "")
      }
    })
    // LINE 綁定回跳（whoami 模式帶回 lineUserId）
    const params = new URLSearchParams(window.location.search)
    const lineUserId = params.get("lineUserId")
    if (lineUserId) {
      window.history.replaceState({}, "", "/m/settings")
      fetch("/api/member/line-binding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserId }),
      }).then(r => r.json()).then(d => {
        if (d.ok) setLineBound(true)
        else alert(d.error ?? "綁定失敗")
      })
    }
  }, [supabase])

  async function savePhone() {
    if (busy) return
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBusy(false); return }
    const v = phoneDraft.replace(/[- ]/g, "")
    if (v && !/^\d{8,15}$/.test(v)) { setBusy(false); alert("電話格式不正確"); return }
    const { error } = await supabase.from("profiles").update({ phone: v || null }).eq("id", user.id)
    setBusy(false)
    if (error) { alert(`儲存失敗：${error.message}`); return }
    setPhone(v)
    setEditingPhone(false)
  }

  async function unbindLine() {
    if (!confirm("確定要解除 LINE 綁定？解除後將無法使用 LINE 快捷登入。")) return
    const res = await fetch("/api/member/line-binding", { method: "DELETE" })
    const d = await res.json()
    if (!res.ok || !d.ok) { alert(d.error ?? "解除失敗"); return }
    setLineBound(false)
  }

  function saveNotify(course: boolean, order: boolean) {
    try { localStorage.setItem(NOTIFY_KEY, JSON.stringify({ course, order })) } catch {}
  }

  async function saveName() {
    if (busy) return
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBusy(false); return }
    const { error } = await supabase.from("profiles")
      .update({ name: nameDraft.trim() }).eq("id", user.id)
    setBusy(false)
    if (error) { alert(`儲存失敗：${error.message}`); return }
    setName(nameDraft.trim())
    setEditingName(false)
  }

  async function savePassword() {
    if (busy) return
    setBusy(true)
    // 先用舊密碼驗證身分，再更新
    const { error: verifyErr } = await supabase.auth.signInWithPassword({ email, password: oldPwd })
    if (verifyErr) { setBusy(false); alert("舊密碼錯誤"); return }
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setBusy(false)
    if (error) { alert(`更新失敗：${error.message}`); return }
    alert("密碼已更新")
    setEditingPwd(false); setOldPwd(""); setNewPwd("")
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = "/m/login"
  }

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
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                className={inputCls}
                autoFocus
              />
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => { setEditingName(false); setNameDraft(name) }}
                  className="flex-1 py-2 text-sm border border-[#f0f0f0] rounded-xl"
                >
                  取消
                </button>
                <button
                  onClick={saveName}
                  disabled={busy || !nameDraft.trim()}
                  className="flex-1 py-2 text-sm bg-black text-white rounded-xl disabled:opacity-40"
                >
                  {busy ? "儲存中…" : "儲存"}
                </button>
              </div>
            </div>
          ) : (
            <Row label="顯示名稱" value={name || "—"} onClick={() => setEditingName(true)} />
          )}
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm">電子信箱</span>
            <span className="text-sm text-[#aaa]">{email || "—"}</span>
          </div>
          {editingPhone ? (
            <div className="px-4 py-3.5 flex flex-col gap-2">
              <label className="text-xs text-[#aaa]">手機號碼（可用於登入）</label>
              <input
                value={phoneDraft}
                onChange={e => setPhoneDraft(e.target.value)}
                placeholder="0912345678"
                inputMode="tel"
                className={inputCls}
                autoFocus
              />
              <div className="flex gap-2 mt-1">
                <button onClick={() => { setEditingPhone(false); setPhoneDraft(phone) }}
                  className="flex-1 py-2 text-sm border border-[#f0f0f0] rounded-xl">取消</button>
                <button onClick={savePhone} disabled={busy}
                  className="flex-1 py-2 text-sm bg-black text-white rounded-xl disabled:opacity-40">
                  {busy ? "儲存中…" : "儲存"}
                </button>
              </div>
            </div>
          ) : (
            <Row label="手機號碼" value={phone || "未設定"} onClick={() => { setPhoneDraft(phone); setEditingPhone(true) }} />
          )}
        </Section>

        {/* Password */}
        <Section title="安全性">
          {isLineAccount && !editingPwd ? (
            <Row label="設定密碼" value="設定後可用 Email／電話登入" onClick={() => setEditingPwd(true)} />
          ) : isLineAccount && editingPwd ? (
            <div className="px-4 py-3.5 flex flex-col gap-2">
              <label className="text-xs text-[#aaa]">設定密碼（至少 8 位，供 Email／電話登入使用）</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  placeholder="輸入新密碼"
                  className={inputCls + " pr-10"}
                />
                <button onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa]">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex gap-2 mt-1">
                <button onClick={() => { setEditingPwd(false); setNewPwd("") }}
                  className="flex-1 py-2 text-sm border border-[#f0f0f0] rounded-xl">取消</button>
                <button
                  disabled={busy || newPwd.length < 8}
                  onClick={async () => {
                    if (busy) return
                    setBusy(true)
                    const { error } = await supabase.auth.updateUser({ password: newPwd })
                    setBusy(false)
                    if (error) { alert(`設定失敗：${error.message}`); return }
                    alert("密碼已設定，之後可用 Email 或電話＋密碼登入")
                    setEditingPwd(false); setNewPwd("")
                  }}
                  className="flex-1 py-2 text-sm bg-black text-white rounded-xl disabled:opacity-40">
                  {busy ? "設定中…" : "儲存密碼"}
                </button>
              </div>
            </div>
          ) : editingPwd ? (
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
                  disabled={busy || !oldPwd || newPwd.length < 8}
                  onClick={savePassword}
                  className="flex-1 py-2 text-sm bg-black text-white rounded-xl disabled:opacity-40"
                >
                  {busy ? "更新中…" : "更新密碼"}
                </button>
              </div>
            </div>
          ) : (
            <Row label="修改密碼" onClick={() => setEditingPwd(true)} />
          )}
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm">LINE 帳號綁定</p>
              <p className="text-xs text-[#aaa] mt-0.5">{lineBound ? "已綁定，可用 LINE 快捷登入" : "綁定後可用 LINE 快捷登入"}</p>
            </div>
            {lineBound ? (
              <button onClick={unbindLine} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                解除綁定
              </button>
            ) : (
              <a href="/api/auth/line?mode=whoami&next=/m/settings"
                className="text-xs px-3 py-1.5 rounded-full text-white font-medium"
                style={{ backgroundColor: "#06C755" }}>
                綁定
              </a>
            )}
          </div>
        </Section>

        {/* Notifications */}
        <Section title="通知設定">
          <Toggle label="課程提醒" value={notifyCourse} onChange={() => { setNotifyCourse(v => { saveNotify(!v, notifyOrder); return !v }) }} />
          <Toggle label="訂單通知" value={notifyOrder} onChange={() => { setNotifyOrder(v => { saveNotify(notifyCourse, !v); return !v }) }} />
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
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-[60]">
          <div className="bg-white rounded-t-2xl w-full max-w-md px-5 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <p className="text-base font-medium mb-1">確定登出？</p>
            <p className="text-sm text-[#aaa] mb-5">您的資料將安全保存，下次可重新登入。</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleLogout}
                className="block w-full py-3 text-sm text-center bg-black text-white rounded-xl"
              >
                確認登出
              </button>
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
