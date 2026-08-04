'use client'

import { useEffect, useMemo, useState } from "react"
import { Search, Plus, X, Trash2, ChevronDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type SubUnit = { id: number; name: string; location: string }

type Unit = {
  id: string
  name: string
  type: string
  contact: string
  phone: string
  address: string
  subUnits: SubUnit[]
  status: "合作中" | "已結束"
  notes?: string
}

type UnitRow = {
  id: string
  name: string
  type: string | null
  contact: string | null
  phone: string | null
  address: string | null
  status: "合作中" | "已結束"
  sub_units: SubUnit[]
  notes: string | null
}

function fromRow(r: UnitRow): Unit {
  return {
    id: r.id, name: r.name, type: r.type ?? "", contact: r.contact ?? "",
    phone: r.phone ?? "", address: r.address ?? "", status: r.status,
    subUnits: Array.isArray(r.sub_units) ? r.sub_units : [],
    notes: r.notes ?? "",
  }
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f0f0] shrink-0">
          <h2 className="text-base font-medium">{title}</h2>
          <button onClick={onClose} className="text-[#bbb] hover:text-black transition-colors"><X size={18} /></button>
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

type FormState = {
  name: string; type: string; contact: string; phone: string; address: string
  status: "合作中" | "已結束"; notes: string
  subUnits: SubUnit[]
}

const EMPTY_FORM: FormState = {
  name: "", type: "", contact: "", phone: "", address: "",
  status: "合作中", notes: "", subUnits: [],
}

function formToRow(form: FormState) {
  return {
    name: form.name.trim(),
    type: form.type || null,
    contact: form.contact || null,
    phone: form.phone || null,
    address: form.address || null,
    status: form.status,
    sub_units: form.subUnits,
    notes: form.notes || null,
  }
}

export default function UnitsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [units, setUnits]       = useState<Unit[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [query, setQuery]       = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [drawer, setDrawer]     = useState<"add" | "edit" | null>(null)
  const [editing, setEditing]   = useState<Unit | null>(null)
  const [form, setForm]         = useState<FormState>(EMPTY_FORM)
  const [newName, setNewName]   = useState("")
  const [newLoc,  setNewLoc]    = useState("")

  useEffect(() => {
    supabase.from("units").select("*").order("created_at").then(({ data, error }) => {
      if (error) { console.error("載入單位失敗:", error.message); setLoading(false); return }
      const list = (data as UnitRow[]).map(fromRow)
      setUnits(list)
      setExpanded(new Set(list.map(u => u.id)))
      setLoading(false)
    })
  }, [supabase])

  const filtered = units.filter(u =>
    !query.trim() || u.name.includes(query.trim()) || u.contact.includes(query.trim())
  )

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function openAdd() {
    setForm(EMPTY_FORM); setNewName(""); setNewLoc("")
    setDrawer("add")
  }

  function openEdit(u: Unit) {
    setEditing(u)
    setForm({
      name: u.name, type: u.type, contact: u.contact, phone: u.phone,
      address: u.address, status: u.status, notes: u.notes ?? "",
      subUnits: u.subUnits.map(s => ({ ...s })),
    })
    setNewName(""); setNewLoc("")
    setDrawer("edit")
  }

  function close() { setDrawer(null); setEditing(null) }

  function addSubUnit() {
    if (!newName.trim()) return
    const newId = Math.max(0, ...form.subUnits.map(s => s.id)) + 1
    setForm(f => ({ ...f, subUnits: [...f.subUnits, { id: newId, name: newName.trim(), location: newLoc.trim() }] }))
    setNewName(""); setNewLoc("")
  }

  function removeSubUnit(id: number) {
    setForm(f => ({ ...f, subUnits: f.subUnits.filter(s => s.id !== id) }))
  }

  async function saveAdd() {
    if (!form.name.trim() || saving) return
    setSaving(true)
    const { data, error } = await supabase.from("units").insert(formToRow(form)).select().single()
    setSaving(false)
    if (error) { alert(`新增失敗：${error.message}`); return }
    setUnits(prev => [...prev, fromRow(data as UnitRow)])
    close()
  }

  async function saveEdit() {
    if (!editing || saving) return
    setSaving(true)
    const { error } = await supabase.from("units").update(formToRow(form)).eq("id", editing.id)
    setSaving(false)
    if (error) { alert(`儲存失敗：${error.message}`); return }
    setUnits(prev => prev.map(u => u.id === editing.id ? { ...u, ...form } : u))
    close()
  }

  async function deleteUnit(id: string) {
    if (!confirm("確定刪除此單位？")) return
    const { error } = await supabase.from("units").delete().eq("id", id)
    if (error) { alert(`刪除失敗：${error.message}`); return }
    setUnits(prev => prev.filter(u => u.id !== id))
    close()
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Units</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">單位管理</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-black text-white text-sm px-3 md:px-4 py-2 rounded-lg hover:bg-[#222] transition-colors">
          <Plus size={15} /><span className="hidden sm:inline">新增單位</span><span className="sm:hidden">新增</span>
        </button>
      </div>

      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
        <input placeholder="搜尋單位名稱 / 聯絡人…" value={query} onChange={e => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black" />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
        <div className="grid grid-cols-[28px_1.5fr_0.8fr_1fr_1.2fr_0.8fr_auto] gap-4 px-5 py-3 border-b border-[#f5f5f5] text-[11px] text-[#aaa] uppercase tracking-widest">
          <span></span><span>單位</span><span>類型</span><span>聯絡人</span><span>電話</span><span>狀態</span><span></span>
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {loading && <p className="px-5 py-4 text-sm text-[#ccc]">載入中…</p>}
          {!loading && filtered.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無單位</p>}
          {filtered.map((u) => (
            <div key={u.id}>
              {/* Main row */}
              <div className="grid grid-cols-[28px_1.5fr_0.8fr_1fr_1.2fr_0.8fr_auto] gap-4 items-center px-5 py-4">
                <button onClick={() => toggleExpand(u.id)}
                  className="text-[#bbb] hover:text-black transition-colors">
                  <ChevronDown size={14} className={`transition-transform duration-200 ${expanded.has(u.id) ? "" : "-rotate-90"}`} />
                </button>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-[11px] text-[#999] font-medium">
                    {u.name.slice(0, 1)}
                  </div>
                  <p className="text-sm font-medium truncate">{u.name}</p>
                </div>
                <span className="text-[11px] bg-[#f5f5f5] text-[#666] px-2 py-0.5 rounded-full w-fit">{u.type || "—"}</span>
                <p className="text-xs text-[#666]">{u.contact || "—"}</p>
                <p className="text-xs text-[#999]">{u.phone || "—"}</p>
                <span className={`text-[11px] px-2.5 py-1 rounded-full w-fit ${
                  u.status === "合作中" ? "bg-black text-white" : "bg-[#f5f5f5] text-[#999]"
                }`}>{u.status}</span>
                <button onClick={() => openEdit(u)} className="text-xs text-[#999] hover:text-black">編輯</button>
              </div>

              {/* Sub-unit rows */}
              {expanded.has(u.id) && u.subUnits.length > 0 && (
                <div className="bg-[#fafaf9] border-t border-[#f5f5f5]">
                  {u.subUnits.map((s, i) => (
                    <div key={s.id}
                      className={`grid grid-cols-[28px_1.5fr_0.8fr_1fr_1.2fr_0.8fr_auto] gap-4 items-center px-5 py-2.5 ${i < u.subUnits.length - 1 ? "border-b border-[#f0f0f0]" : ""}`}>
                      <div />
                      <div className="flex items-center gap-2 pl-9">
                        <div className="w-1 h-1 rounded-full bg-[#ccc] shrink-0" />
                        <p className="text-sm text-[#555]">{s.name}</p>
                      </div>
                      <div /><div />
                      <p className="text-xs text-[#999]">{s.location || "—"}</p>
                      <div /><div />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {loading && <p className="text-sm text-[#ccc]">載入中…</p>}
        {filtered.map((u) => (
          <div key={u.id} className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-4 pb-3">
              <button onClick={() => toggleExpand(u.id)} className="text-[#bbb] hover:text-black transition-colors shrink-0">
                <ChevronDown size={14} className={`transition-transform duration-200 ${expanded.has(u.id) ? "" : "-rotate-90"}`} />
              </button>
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-8 h-8 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-sm text-[#999] font-medium">
                  {u.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-[#aaa]">{[u.type, u.contact].filter(Boolean).join(" · ") || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[11px] px-2.5 py-1 rounded-full ${
                  u.status === "合作中" ? "bg-black text-white" : "bg-[#f5f5f5] text-[#999]"
                }`}>{u.status}</span>
                <button onClick={() => openEdit(u)} className="text-xs text-[#999] hover:text-black">編輯</button>
              </div>
            </div>
            {expanded.has(u.id) && u.subUnits.length > 0 && (
              <div className="border-t border-[#f5f5f5] bg-[#fafaf9]">
                {u.subUnits.map((s, i) => (
                  <div key={s.id} className={`flex items-center justify-between px-4 py-2.5 ${i < u.subUnits.length - 1 ? "border-b border-[#f0f0f0]" : ""}`}>
                    <div className="flex items-center gap-2 pl-8">
                      <div className="w-1 h-1 rounded-full bg-[#ccc] shrink-0" />
                      <p className="text-sm text-[#555]">{s.name}</p>
                    </div>
                    <p className="text-xs text-[#999]">{s.location || "—"}</p>
                  </div>
                ))}
              </div>
            )}
            {expanded.has(u.id) && u.subUnits.length === 0 && (
              <p className="px-4 py-2.5 text-xs text-[#ccc] border-t border-[#f5f5f5] bg-[#fafaf9]">尚無子單位</p>
            )}
          </div>
        ))}
      </div>

      {/* ── Drawer ── */}
      {drawer && (
        <Drawer title={drawer === "add" ? "新增單位" : "編輯單位"} onClose={close}>
          <div className="px-6 py-5 flex flex-col gap-4">

            {/* Basic info */}
            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-[#aaa] uppercase tracking-widest">單位資料</p>
              <Field label="單位名稱">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="學校 / 機構名稱" className={inputCls} />
              </Field>
              <Field label="類型">
                <input value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  placeholder="學校、社區機構、企業…" className={inputCls} />
              </Field>
              <Field label="聯絡人">
                <input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                  placeholder="姓名" className={inputCls} />
              </Field>
              <Field label="聯絡電話">
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="02-xxxx-xxxx" className={inputCls} />
              </Field>
              <Field label="地址">
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="縣市區地址" className={inputCls} />
              </Field>
              <Field label="狀態">
                <div className="flex gap-2">
                  {(["合作中", "已結束"] as const).map(s => (
                    <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))}
                      className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${
                        form.status === s ? "bg-black text-white border-black" : "bg-white text-[#666] border-[#f0f0f0] hover:border-black"
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {/* Sub-units */}
            <div className="border-t border-[#f5f5f5]" />
            <div className="flex flex-col gap-2.5">
              <p className="text-[11px] text-[#aaa] uppercase tracking-widest">子單位</p>

              {form.subUnits.length === 0 && (
                <p className="text-xs text-[#ccc]">尚未新增</p>
              )}

              {form.subUnits.map(s => (
                <div key={s.id} className="flex items-center gap-3 bg-[#fafaf9] border border-[#f0f0f0] rounded-xl px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-[#999] mt-0.5">{s.location || <span className="text-[#ccc]">未設定地點</span>}</p>
                  </div>
                  <button onClick={() => removeSubUnit(s.id)}
                    className="text-[#e0e0e0] hover:text-red-400 transition-colors shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}

              {/* Add form */}
              <div className="flex flex-col gap-2 p-3 bg-[#f9f9f9] border border-[#f0f0f0] rounded-xl">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addSubUnit()}
                  placeholder="子單位名稱"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors"
                />
                <div className="flex gap-2">
                  <input
                    value={newLoc}
                    onChange={e => setNewLoc(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addSubUnit()}
                    placeholder="地點"
                    className="flex-1 px-3 py-2 text-sm bg-white border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors"
                  />
                  <button onClick={addSubUnit}
                    className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-[#222] transition-colors shrink-0">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="border-t border-[#f5f5f5]" />
            <Field label="備註">
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="合作備忘…" rows={3}
                className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black focus:bg-white transition-colors resize-none" />
            </Field>
          </div>

          <div className={`px-6 py-4 border-t border-[#f0f0f0] flex gap-2 ${drawer === "edit" ? "justify-between" : "justify-end"}`}>
            {drawer === "edit" && editing && (
              <button onClick={() => deleteUnit(editing.id)}
                className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors px-3 py-2">
                <Trash2 size={14} />刪除單位
              </button>
            )}
            <div className="flex gap-2">
              <button onClick={close} className="px-4 py-2 text-sm border border-[#f0f0f0] rounded-xl hover:border-black transition-colors">
                取消
              </button>
              <button onClick={drawer === "add" ? saveAdd : saveEdit} disabled={saving}
                className="px-5 py-2 text-sm bg-black text-white rounded-xl hover:bg-[#222] disabled:opacity-50 transition-colors">
                {saving ? "儲存中…" : drawer === "add" ? "建立單位" : "儲存"}
              </button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  )
}
