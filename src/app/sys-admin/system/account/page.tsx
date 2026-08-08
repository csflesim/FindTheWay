'use client'

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

// 後台個人設定：聯絡電話／Email（Email＋密碼、電話＋密碼登入的查表鍵）、LINE 綁定、改密碼

const inputCls = "w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black focus:bg-white transition-colors"

const ROLE_LABELS: Record<string, string> = { admin: "超級管理員", staff: "管理員" }

export default function AccountPage() {
  const supabase = useMemo(() => createClient(), [])
  const [me, setMe] = useState({ name: "", role: "", account: "", phone: "", contactEmail: "", lineBound: false })
  const [phone, setPhone] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  function load() {
    fetch("/api/admin/self").then(r => r.json()).then(d => {
      if (d.error) return
      setMe(d)
      setPhone(d.phone ?? "")
      setContactEmail(d.contactEmail ?? "")
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
    // LINE 綁定回跳
    const params = new URLSearchParams(window.location.search)
    const lineUserId = params.get("lineUserId")
    if (lineUserId) {
      window.history.replaceState({}, "", "/sys-admin/system/account")
      fetch("/api/admin/self", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserId }),
      }).then(r => r.json()).then(d => {
        if (d.ok) load()
        else alert(d.error ?? "綁定失敗")
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveContact() {
    if (busy) return
    setBusy(true)
    const res = await fetch("/api/admin/self", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, contactEmail }),
    })
    const d = await res.json()
    setBusy(false)
    if (!res.ok || !d.ok) { alert(d.error ?? "儲存失敗"); return }
    alert("已儲存")
    load()
  }

  async function changePassword() {
    if (busy || newPwd.length < 8) return
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setBusy(false)
    if (error) { alert(`更新失敗：${error.message}`); return }
    alert("密碼已更新")
    setNewPwd("")
  }

  async function unbindLine() {
    if (!confirm("確定要解除 LINE 綁定？")) return
    const res = await fetch("/api/admin/self", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unbindLine: true }),
    })
    const d = await res.json()
    if (!res.ok || !d.ok) { alert(d.error ?? "解除失敗"); return }
    load()
  }

  if (loading) return <div className="p-6 text-[#aaa] text-sm">載入中…</div>

  return (
    <div className="p-4 md:p-6 w-full max-w-2xl">
      <div className="mb-5">
        <p className="text-[11px] text-[#aaa] uppercase tracking-widest">System / Account</p>
        <h1 className="text-lg md:text-xl font-medium mt-0.5">個人設定</h1>
        <p className="text-xs text-[#aaa] mt-1">{me.name} · {ROLE_LABELS[me.role] ?? me.role} · <span className="font-mono">{me.account}</span></p>
      </div>

      <div className="flex flex-col gap-4">
        {/* 聯絡資訊（登入查表鍵） */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-5 flex flex-col gap-4">
          <p className="text-sm font-medium">聯絡資訊（可作為登入帳號）</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#999] mb-1.5 block">手機號碼</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="0912345678" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-[#999] mb-1.5 block">聯絡 Email</label>
              <input value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                placeholder="your@email.com" className={inputCls} />
            </div>
          </div>
          <p className="text-[11px] text-[#bbb]">設定後可在後台登入頁用「電話＋密碼」或「Email＋密碼」登入（密碼同帳號密碼）</p>
          <button onClick={saveContact} disabled={busy}
            className="self-end px-5 py-2 text-sm bg-black text-white rounded-xl disabled:opacity-40">
            {busy ? "儲存中…" : "儲存"}
          </button>
        </div>

        {/* LINE 綁定 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">LINE 帳號綁定</p>
            <p className="text-xs text-[#aaa] mt-0.5">{me.lineBound ? "已綁定，可用 LINE 快捷登入後台" : "綁定後可在後台登入頁使用 LINE 快捷登入"}</p>
          </div>
          {me.lineBound ? (
            <button onClick={unbindLine} className="text-xs text-red-400 hover:text-red-600 transition-colors">解除綁定</button>
          ) : (
            <a href="/api/auth/line?mode=whoami&next=/sys-admin/system/account"
              className="text-xs px-4 py-2 rounded-full text-white font-medium"
              style={{ backgroundColor: "#06C755" }}>
              綁定 LINE
            </a>
          )}
        </div>

        {/* 改密碼 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-5 flex flex-col gap-3">
          <p className="text-sm font-medium">修改密碼</p>
          <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
            placeholder="新密碼（至少 8 位）" className={inputCls} />
          <button onClick={changePassword} disabled={busy || newPwd.length < 8}
            className="self-end px-5 py-2 text-sm bg-black text-white rounded-xl disabled:opacity-40">
            {busy ? "更新中…" : "更新密碼"}
          </button>
        </div>
      </div>
    </div>
  )
}
