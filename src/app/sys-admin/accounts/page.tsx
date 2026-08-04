'use client'

import { useEffect, useMemo, useState } from "react"
import { Search, Plus, X, Trash2, UserPlus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type StudentRef = { id: string; name: string; age: number | null; owner_id: string | null }
type Account = {
  id: string
  name: string
  email: string
  phone: string
  lineUserId: string | null
  createdAt: string
  students: StudentRef[]
}

const EMPTY_FORM = { name: "", email: "", phone: "", password: "" }

function fmtYM(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`
}

function Drawer({
  title, onClose, children,
}: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f0f0] shrink-0">
          <h2 className="text-base font-medium">{title}</h2>
          <button onClick={onClose} className="text-[#bbb] hover:text-black transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-[#999] mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black focus:bg-white transition-colors"

export default function AccountsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [query, setQuery]       = useState("")
  const [drawer, setDrawer]     = useState<"add" | "edit" | null>(null)
  const [editing, setEditing]   = useState<Account | null>(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [newStudent, setNewStudent] = useState({ name: "", age: "" })

  async function load() {
    const [memberRes, studentsRes] = await Promise.all([
      fetch("/api/admin/members").then(r => r.ok ? r.json() : { members: [] }),
      supabase.from("students").select("id, name, age, owner_id").eq("status", "已核准"),
    ])
    const students = (studentsRes.data ?? []) as StudentRef[]
    setAccounts((memberRes.members ?? []).map((m: Omit<Account, "students">) => ({
      ...m,
      students: students.filter(s => s.owner_id === m.id),
    })))
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [])

  const filtered = accounts.filter(a =>
    !query.trim() || a.name.includes(query.trim()) || a.email.includes(query.trim())
  )

  function openAdd() {
    setForm(EMPTY_FORM)
    setDrawer("add")
  }

  function openEdit(a: Account) {
    setEditing(a)
    setForm({ name: a.name, email: a.email, phone: a.phone ?? "", password: "" })
    setDrawer("edit")
  }

  function close() { setDrawer(null); setEditing(null); setNewStudent({ name: "", age: "" }) }

  async function addStudent() {
    if (!editing || !newStudent.name.trim()) return
    const { data, error } = await supabase.from("students").insert({
      owner_id: editing.id,
      name: newStudent.name.trim(),
      age: parseInt(newStudent.age) || null,
      relation: "其他",
      status: "已核准",
    }).select("id, name, age, owner_id").single()
    if (error) { alert(`新增學員失敗：${error.message}`); return }
    const s = data as StudentRef
    setAccounts(prev => prev.map(a => a.id === editing.id ? { ...a, students: [...a.students, s] } : a))
    setEditing(prev => prev ? { ...prev, students: [...prev.students, s] } : prev)
    setNewStudent({ name: "", age: "" })
  }

  async function removeStudent(id: string) {
    if (!editing) return
    if (!confirm("確定移除此學員？")) return
    const { error } = await supabase.from("students").delete().eq("id", id)
    if (error) { alert(`移除失敗：${error.message}`); return }
    setAccounts(prev => prev.map(a => a.id === editing.id ? { ...a, students: a.students.filter(s => s.id !== id) } : a))
    setEditing(prev => prev ? { ...prev, students: prev.students.filter(s => s.id !== id) } : prev)
  }

  async function saveAdd() {
    if (saving) return
    if (!form.email.trim() || !form.password.trim()) { alert("Email 與密碼為必填"); return }
    setSaving(true)
    const res = await fetch("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password }),
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
      body: JSON.stringify({ id: editing.id, name: form.name.trim(), phone: form.phone.trim(), password: form.password || undefined }),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok || !d.ok) { alert(`儲存失敗：${d.error ?? res.status}`); return }
    setAccounts(prev => prev.map(a => a.id === editing.id ? { ...a, name: form.name.trim(), phone: form.phone.trim() } : a))
    close()
  }

  async function deleteAccount(id: string) {
    if (!confirm("確定刪除此會員帳號？名下學員與訂單紀錄將一併移除，無法復原。")) return
    const res = await fetch("/api/admin/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    const d = await res.json()
    if (!res.ok || !d.ok) { alert(`刪除失敗：${d.error ?? res.status}`); return }
    setAccounts(prev => prev.filter(a => a.id !== id))
    close()
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Members</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">會員管理</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-black text-white text-sm px-3 md:px-4 py-2 rounded-lg hover:bg-[#222] transition-colors"
        >
          <Plus size={15} /><span className="hidden sm:inline">新增會員</span><span className="sm:hidden">新增</span>
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
        <input placeholder="搜尋會員名稱 / Email…" value={query} onChange={e => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black" />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
        <div className="grid grid-cols-[1.5fr_2fr_1.4fr_1.8fr_0.8fr_0.8fr_auto] gap-4 px-5 py-3 border-b border-[#f5f5f5] text-[11px] text-[#aaa] uppercase tracking-widest">
          <span>會員</span><span>Email</span><span>電話</span><span>學生</span><span>加入</span><span>LINE</span><span></span>
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {loading && <p className="px-5 py-4 text-sm text-[#ccc]">載入中…</p>}
          {!loading && filtered.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無會員（會員以 LINE 登入後會自動出現在此）</p>}
          {filtered.map((a) => (
            <div key={a.id} className="grid grid-cols-[1.5fr_2fr_1.4fr_1.8fr_0.8fr_0.8fr_auto] gap-4 items-center px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-[11px] text-[#999] font-medium">
                  {(a.name || "?").slice(0, 1)}
                </div>
                <p className="text-sm font-medium truncate">{a.name || "—"}</p>
              </div>
              <p className="text-xs text-[#666] truncate">{a.email.endsWith("@findtheway.app") ? "（LINE 帳號）" : a.email}</p>
              <p className="text-xs text-[#999]">{a.phone || "—"}</p>
              <div className="flex flex-wrap gap-1">
                {a.students.map((s) => (
                  <span key={s.id} className="text-[10px] bg-[#f5f5f5] text-[#666] px-1.5 py-0.5 rounded">{s.name}</span>
                ))}
                {a.students.length === 0 && <span className="text-[10px] text-[#ccc]">—</span>}
              </div>
              <p className="text-xs text-[#999]">{fmtYM(a.createdAt)}</p>
              {a.lineUserId
                ? <span className="text-[11px] px-2 py-0.5 rounded-full w-fit bg-[#e8faf0] text-[#06C755]">已綁定</span>
                : <span className="text-[11px] px-2 py-0.5 rounded-full w-fit bg-[#f5f5f5] text-[#999]">未綁定</span>
              }
              <button onClick={() => openEdit(a)} className="text-xs text-[#999] hover:text-black">編輯</button>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {loading && <p className="text-sm text-[#ccc]">載入中…</p>}
        {filtered.map((a) => (
          <div key={a.id} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-sm text-[#999] font-medium">
                  {(a.name || "?").slice(0, 1)}
                </div>
                <div>
                  <p className="text-sm font-medium">{a.name || "—"}</p>
                  <p className="text-xs text-[#aaa]">{a.email.endsWith("@findtheway.app") ? "（LINE 帳號）" : a.email}</p>
                </div>
              </div>
              {a.lineUserId
                ? <span className="text-[11px] px-2 py-0.5 rounded-full shrink-0 bg-[#e8faf0] text-[#06C755]">LINE</span>
                : <span className="text-[11px] px-2 py-0.5 rounded-full shrink-0 bg-[#f5f5f5] text-[#999]">—</span>
              }
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {a.students.map((s) => (
                <span key={s.id} className="text-[10px] bg-[#f5f5f5] text-[#666] px-1.5 py-0.5 rounded">{s.name}</span>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-[10px] text-[#aaa]">{a.phone || "—"} · 加入 {fmtYM(a.createdAt)}</p>
              <button onClick={() => openEdit(a)} className="text-xs text-[#999] hover:text-black">編輯</button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Drawer ── */}
      {drawer && (
        <Drawer
          title={drawer === "add" ? "新增會員" : "編輯會員"}
          onClose={close}
        >
          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Account info */}
            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-[#aaa] uppercase tracking-widest">會員資料</p>

              <Field label="姓名">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="會員姓名" className={inputCls} />
              </Field>

              <Field label="Email">
                {drawer === "add" ? (
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com" className={inputCls} />
                ) : (
                  <div className="w-full px-3 py-2.5 text-sm bg-[#f5f5f5] border border-[#f0f0f0] rounded-xl text-[#999]">
                    {form.email.endsWith("@findtheway.app") ? "（LINE 帳號，無 Email）" : form.email}
                  </div>
                )}
              </Field>

              <Field label="電話">
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="09xx-xxx-xxx" className={inputCls} />
              </Field>

              <Field label="LINE User ID">
                <div className="w-full px-3 py-2.5 text-sm bg-[#f5f5f5] border border-[#f0f0f0] rounded-xl text-[#999] select-all break-all">
                  {editing?.lineUserId ?? <span className="text-[#ccc]">尚未綁定</span>}
                </div>
              </Field>

              <Field label={drawer === "add" ? "密碼" : "重設密碼（留空則不變更）"}>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••" className={inputCls} />
              </Field>
            </div>

            {drawer === "edit" && editing && (
              <>
                <div className="border-t border-[#f5f5f5]" />

                {/* Students */}
                <div className="flex flex-col gap-3">
                  <p className="text-[11px] text-[#aaa] uppercase tracking-widest">名下學生</p>

                  {editing.students.length === 0 && (
                    <p className="text-sm text-[#bbb]">尚未新增學生</p>
                  )}

                  <div className="flex flex-col gap-2">
                    {editing.students.map(s => (
                      <div key={s.id} className="flex items-center justify-between bg-[#fafaf9] rounded-xl px-4 py-3 border border-[#f0f0f0]">
                        <div>
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-[#aaa] mt-0.5">{s.age != null ? `${s.age} 歲` : "—"}</p>
                        </div>
                        <button onClick={() => removeStudent(s.id)} className="text-[#ccc] hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add student inline */}
                  <div className="bg-[#fafaf9] rounded-xl border border-[#f0f0f0] p-3 flex flex-col gap-2">
                    <p className="text-[11px] text-[#bbb]">新增學生（直接核准）</p>
                    <div className="flex gap-2">
                      <input
                        value={newStudent.name}
                        onChange={e => setNewStudent(p => ({ ...p, name: e.target.value }))}
                        placeholder="姓名"
                        className="flex-1 px-3 py-2 text-sm bg-white border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors"
                        onKeyDown={e => e.key === "Enter" && addStudent()}
                      />
                      <input
                        value={newStudent.age}
                        onChange={e => setNewStudent(p => ({ ...p, age: e.target.value }))}
                        placeholder="年齡"
                        type="number"
                        className="w-16 px-3 py-2 text-sm bg-white border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors"
                        onKeyDown={e => e.key === "Enter" && addStudent()}
                      />
                      <button onClick={addStudent}
                        className="px-3 py-2 bg-black text-white rounded-lg hover:bg-[#222] transition-colors">
                        <UserPlus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer actions */}
          <div className={`px-6 py-4 border-t border-[#f0f0f0] flex gap-2 ${drawer === "edit" ? "justify-between" : "justify-end"}`}>
            {drawer === "edit" && editing && (
              <button
                onClick={() => deleteAccount(editing.id)}
                className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors px-3 py-2"
              >
                <Trash2 size={14} />刪除帳號
              </button>
            )}
            <div className="flex gap-2">
              <button onClick={close} className="px-4 py-2 text-sm border border-[#f0f0f0] rounded-xl hover:border-black transition-colors">
                取消
              </button>
              <button
                onClick={drawer === "add" ? saveAdd : saveEdit}
                disabled={saving}
                className="px-5 py-2 text-sm bg-black text-white rounded-xl hover:bg-[#222] disabled:opacity-50 transition-colors"
              >
                {saving ? "儲存中…" : drawer === "add" ? "建立會員" : "儲存"}
              </button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  )
}
