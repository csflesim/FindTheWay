'use client'

import { useEffect, useState } from "react"
import { Search, Plus, X, Trash2 } from "lucide-react"

type StaffMember = {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  lastSignInAt: string | null
  avatarUrl: string | null
}

function Avatar({ m, size }: { m: StaffMember; size: string }) {
  if (m.avatarUrl) {
    return <img src={m.avatarUrl} alt={m.name} className={`${size} rounded-full shrink-0 object-cover`} />
  }
  return (
    <div className={`${size} bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-[11px] text-[#999] font-medium`}>
      {(m.name || "?").slice(0, 1)}
    </div>
  )
}

const ROLE_LABELS: Record<string, string> = {
  admin: "超級管理員",
  staff: "管理員",
  teacher: "教師",
}

const roleColor: Record<string, string> = {
  admin:   "bg-black text-white",
  staff:   "bg-[#f0f0f0] text-[#555]",
  teacher: "bg-[#e8f4fd] text-[#1a6fa8]",
}

const EMPTY_FORM = { name: "", email: "", phone: "", password: "", role: "staff" }

function fmtDateTime(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

const inputCls = "w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black focus:bg-white transition-colors"

export default function MembersPage() {
  const [members, setMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState("")
  const [drawer, setDrawer] = useState<"add" | "edit" | null>(null)
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  async function load() {
    const res = await fetch("/api/admin/members?scope=staff")
    const d = res.ok ? await res.json() : { members: [] }
    setMembers(d.members ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = members.filter(m =>
    !query.trim() || m.name.includes(query.trim()) || m.email.includes(query.trim())
  )

  function openAdd() { setForm(EMPTY_FORM); setDrawer("add") }
  function openEdit(m: StaffMember) {
    setEditing(m)
    setForm({ name: m.name, email: m.email, phone: m.phone ?? "", password: "", role: m.role })
    setDrawer("edit")
  }
  function close() { setDrawer(null); setEditing(null) }

  async function saveAdd() {
    if (saving) return
    if (!form.email.trim() || !form.password.trim()) { alert("Email 與密碼為必填"); return }
    setSaving(true)
    const res = await fetch("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password, role: form.role }),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok || !d.ok) { alert(`建立失敗：${d.error ?? res.status}`); return }
    await load()
    close()
  }

  async function saveEdit() {
    if (!editing || saving) return
    setSaving(true)
    const res = await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, name: form.name.trim(), phone: form.phone.trim(), password: form.password || undefined, role: form.role }),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok || !d.ok) { alert(`儲存失敗：${d.error ?? res.status}`); return }
    await load()
    close()
  }

  async function deleteMember(id: string) {
    if (!confirm("確定刪除此人員帳號？無法復原。")) return
    const res = await fetch("/api/admin/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    const d = await res.json()
    if (!res.ok || !d.ok) { alert(`刪除失敗：${d.error ?? res.status}`); return }
    setMembers(prev => prev.filter(m => m.id !== id))
    close()
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">System / Members</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">人員管理</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-black text-white text-sm px-3 md:px-4 py-2 rounded-lg hover:bg-[#222] transition-colors">
          <Plus size={15} /><span className="hidden sm:inline">新增人員</span><span className="sm:hidden">新增</span>
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
        <input placeholder="搜尋姓名 / Email…" value={query} onChange={e => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black" />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
        <div className="grid grid-cols-[1.5fr_2fr_1.4fr_2fr_auto] gap-4 px-5 py-3 border-b border-[#f5f5f5] text-[11px] text-[#aaa] uppercase tracking-widest">
          <span>姓名</span><span>Email</span><span>角色</span><span>最後登入</span><span></span>
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {loading && <p className="px-5 py-4 text-sm text-[#ccc]">載入中…</p>}
          {!loading && filtered.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無系統人員</p>}
          {filtered.map((m) => (
            <div key={m.id} className="grid grid-cols-[1.5fr_2fr_1.4fr_2fr_auto] gap-4 items-center px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Avatar m={m} size="w-7 h-7" />
                <p className="text-sm font-medium">{m.name || "—"}</p>
              </div>
              <p className="text-xs text-[#666]">{m.email}</p>
              <span className={`text-[11px] px-2.5 py-1 rounded-full w-fit ${roleColor[m.role] ?? "bg-[#f5f5f5] text-[#999]"}`}>
                {ROLE_LABELS[m.role] ?? m.role}
              </span>
              <p className="text-xs text-[#999]">{fmtDateTime(m.lastSignInAt)}</p>
              <button onClick={() => openEdit(m)} className="text-xs text-[#999] hover:text-black">編輯</button>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {loading && <p className="text-sm text-[#ccc]">載入中…</p>}
        {filtered.map((m) => (
          <div key={m.id} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <Avatar m={m} size="w-8 h-8" />
                <div>
                  <p className="text-sm font-medium">{m.name || "—"}</p>
                  <p className="text-xs text-[#aaa]">{m.email}</p>
                </div>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full shrink-0 ${roleColor[m.role] ?? "bg-[#f5f5f5] text-[#999]"}`}>
                {ROLE_LABELS[m.role] ?? m.role}
              </span>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-[10px] text-[#aaa]">最後登入 {fmtDateTime(m.lastSignInAt)}</p>
              <button onClick={() => openEdit(m)} className="text-xs text-[#999] hover:text-black">編輯</button>
            </div>
          </div>
        ))}
      </div>

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={close} />
          <aside className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f0f0] shrink-0">
              <h2 className="text-base font-medium">{drawer === "add" ? "新增人員" : "編輯人員"}</h2>
              <button onClick={close} className="text-[#bbb] hover:text-black transition-colors"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
              <div>
                <label className="text-xs text-[#999] mb-1.5 block">姓名</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="人員姓名" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-[#999] mb-1.5 block">Email</label>
                {drawer === "add" ? (
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com（純帳號會補 @findtheway.com）" className={inputCls}
                    onBlur={() => { if (form.email && !form.email.includes("@")) setForm(f => ({ ...f, email: `${f.email}@findtheway.com` })) }} />
                ) : (
                  <div className="w-full px-3 py-2.5 text-sm bg-[#f5f5f5] border border-[#f0f0f0] rounded-xl text-[#999]">{form.email}</div>
                )}
              </div>
              <div>
                <label className="text-xs text-[#999] mb-1.5 block">電話</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="09xx-xxx-xxx" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-[#999] mb-1.5 block">{drawer === "add" ? "密碼" : "重設密碼（留空則不變更）"}</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-[#999] mb-1.5 block">角色</label>
                <div className="flex gap-2">
                  {(["admin", "staff", "teacher"] as const).map(r => (
                    <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                      className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${
                        form.role === r ? "bg-black text-white border-black" : "bg-white text-[#666] border-[#f0f0f0] hover:border-black"
                      }`}>
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#aaa] mt-1.5">超級管理員／管理員可登入後台；教師可登入教師專區（點名、排班）</p>
              </div>
            </div>

            <div className={`px-6 py-4 border-t border-[#f0f0f0] flex gap-2 ${drawer === "edit" ? "justify-between" : "justify-end"}`}>
              {drawer === "edit" && editing && (
                <button onClick={() => deleteMember(editing.id)}
                  className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors px-3 py-2">
                  <Trash2 size={14} />刪除人員
                </button>
              )}
              <div className="flex gap-2">
                <button onClick={close} className="px-4 py-2 text-sm border border-[#f0f0f0] rounded-xl hover:border-black transition-colors">
                  取消
                </button>
                <button onClick={drawer === "add" ? saveAdd : saveEdit} disabled={saving}
                  className="px-5 py-2 text-sm bg-black text-white rounded-xl hover:bg-[#222] disabled:opacity-50 transition-colors">
                  {saving ? "儲存中…" : drawer === "add" ? "建立人員" : "儲存"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
