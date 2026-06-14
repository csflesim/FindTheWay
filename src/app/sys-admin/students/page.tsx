'use client'

import { useState } from "react"
import { Search, Plus, X, Trash2, BookOpen, Ticket } from "lucide-react"

type Relation = "本人" | "子女" | "配偶" | "其他"

type Student = {
  id: number
  name: string
  age: number
  types: ("內部" | "外部")[]
  // 內部
  account?: string
  relation?: Relation
  tickets?: number
  courses?: string[]
  // 外部
  category?: string
  unit?: string
  classGroup?: string
  lastActive: string
  notes?: string
}

const RELATIONS: Relation[] = ["本人", "子女", "配偶", "其他"]

const INITIAL_STUDENTS: Student[] = [
  { id: 1, name: "鄭小德", age: 10, types: ["內部"],         account: "鄭大德", relation: "子女", tickets: 7, courses: ["基礎水彩入門", "水墨入門體驗"], lastActive: "06/13" },
  { id: 2, name: "鄭小明", age: 8,  types: ["內部"],         account: "鄭大德", relation: "子女", tickets: 3, courses: ["兒童創意素描"],                 lastActive: "06/12" },
  { id: 3, name: "賴小柏", age: 9,  types: ["內部"],         account: "賴大紫", relation: "子女", tickets: 7, courses: ["親子藝術探索"],                 lastActive: "06/11" },
  { id: 4, name: "賴小紫", age: 7,  types: ["內部"],         account: "賴大紫", relation: "子女", tickets: 1, courses: ["兒童創意素描"],                 lastActive: "06/10" },
  { id: 5, name: "陳小安", age: 9,  types: ["外部"],         category: "校外合作", unit: "大安國小", classGroup: "二年甲班", lastActive: "06/09" },
  { id: 6, name: "林小雅", age: 11, types: ["內部", "外部"], account: "賴大紫", relation: "其他", tickets: 2, courses: ["成人油畫工作坊"], category: "試課", unit: "—", classGroup: "—", lastActive: "06/08" },
]

const ACCOUNTS = ["鄭大德", "賴大紫"]

const UNITS = [
  { name: "大安國小",    subUnits: [{ name: "美術班" }, { name: "一年甲班" }, { name: "二年甲班" }] },
  { name: "社區發展協會", subUnits: [{ name: "長青班" }, { name: "親子班" }] },
]

const ATTENDANCE = [
  { date: "2026/06/13", course: "基礎水彩入門",  teacher: "明德老師", status: "出席" },
  { date: "2026/06/06", course: "水墨入門體驗",  teacher: "明德老師", status: "出席" },
  { date: "2026/05/30", course: "基礎水彩入門",  teacher: "明德老師", status: "請假" },
  { date: "2026/05/23", course: "水墨入門體驗",  teacher: "明德老師", status: "出席" },
]

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS)
  const [drawer, setDrawer]     = useState<"add" | "view" | null>(null)
  const [selected, setSelected] = useState<Student | null>(null)
  const [nextId, setNextId]     = useState(10)
  const [form, setForm]         = useState({ name: "", age: "", types: ["內部"] as ("內部"|"外部")[], account: ACCOUNTS[0], relation: "子女" as Relation, category: "", unit: "", classGroup: "", notes: "" })

  const internal = students.filter(s => s.types.includes("內部"))
  const external = students.filter(s => s.types.includes("外部"))

  function openAdd() {
    setForm({ name: "", age: "", types: ["內部"], account: ACCOUNTS[0], relation: "子女", category: "", unit: "", classGroup: "", notes: "" })
    setDrawer("add")
  }

  function toggleFormType(t: "內部" | "外部") {
    setForm(f => {
      const has = f.types.includes(t)
      const next = has ? f.types.filter(x => x !== t) : [...f.types, t]
      return { ...f, types: next.length === 0 ? [t] : next }
    })
  }

  function openView(s: Student) {
    setSelected(s)
    setDrawer("view")
  }

  function close() { setDrawer(null); setSelected(null) }

  function saveAdd() {
    if (!form.name.trim()) return
    const s: Student = {
      id: nextId,
      name: form.name.trim(),
      age: parseInt(form.age) || 0,
      types: form.types,
      ...(form.types.includes("內部") ? { account: form.account, relation: form.relation, tickets: 0, courses: [] } : {}),
      ...(form.types.includes("外部") ? { category: form.category, unit: form.unit, classGroup: form.classGroup } : {}),
      lastActive: "—",
      notes: form.notes,
    }
    setStudents(prev => [...prev, s])
    setNextId(n => n + 1)
    close()
  }

  function deleteStudent(id: number) {
    setStudents(prev => prev.filter(s => s.id !== id))
    close()
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Students</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">學員管理</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-black text-white text-sm px-3 md:px-4 py-2 rounded-lg hover:bg-[#222] transition-colors"
        >
          <Plus size={15} /><span className="hidden sm:inline">新增學員</span><span className="sm:hidden">新增</span>
        </button>
      </div>

      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
        <input placeholder="搜尋學員姓名 / 帳號…"
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black" />
      </div>

      <div className="flex flex-col gap-5">

        {/* ── 內部學員 ── */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[#f5f5f5]">
            <p className="text-xs font-medium text-[#555]">內部學員</p>
            <span className="text-[11px] bg-[#f5f5f5] text-[#aaa] px-1.5 py-0.5 rounded-full">{internal.length}</span>
          </div>
          <div className="hidden md:block">
            <div className="grid grid-cols-[1.5fr_0.5fr_1.5fr_0.6fr_0.7fr_2fr_0.7fr_auto] gap-4 px-5 py-2.5 text-[11px] text-[#bbb] uppercase tracking-widest border-b border-[#f9f9f9]">
              <span>學生</span><span>年齡</span><span>帳號</span><span>關係</span><span>課堂券</span><span>報名課程</span><span>最後動態</span><span></span>
            </div>
            <div className="divide-y divide-[#f9f9f9]">
              {internal.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無內部學員</p>}
              {internal.map((s) => (
                <div key={s.id} className="grid grid-cols-[1.5fr_0.5fr_1.5fr_0.6fr_0.7fr_2fr_0.7fr_auto] gap-4 items-center px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-[11px] text-[#999] font-medium">{s.name.slice(0, 1)}</div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      {s.types.includes("外部") && <span className="text-[10px] bg-[#e8f4fd] text-[#1a6fa8] px-1.5 py-0.5 rounded-full shrink-0">外部</span>}
                    </div>
                  </div>
                  <p className="text-sm text-[#999]">{s.age}歲</p>
                  <p className="text-xs text-[#666] truncate">{s.account}</p>
                  <p className="text-xs text-[#999]">{s.relation ?? "—"}</p>
                  <p className={`text-sm font-medium ${(s.tickets ?? 0) === 0 ? "text-red-400" : ""}`}>{s.tickets} 堂</p>
                  <div className="flex flex-wrap gap-1">
                    {(s.courses ?? []).map((c) => (
                      <span key={c} className="text-[10px] bg-[#f5f5f5] text-[#666] px-1.5 py-0.5 rounded truncate max-w-[120px]">{c}</span>
                    ))}
                  </div>
                  <p className="text-xs text-[#999]">{s.lastActive}</p>
                  <button onClick={() => openView(s)} className="text-xs text-[#999] hover:text-black">查看</button>
                </div>
              ))}
            </div>
          </div>
          <div className="md:hidden divide-y divide-[#f9f9f9]">
            {internal.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無內部學員</p>}
            {internal.map((s) => (
              <div key={s.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-sm text-[#999] font-medium">{s.name.slice(0, 1)}</div>
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-[#999]">{s.age}歲 · {s.account}{s.relation ? ` · ${s.relation}` : ""}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-medium ${(s.tickets ?? 0) === 0 ? "text-red-400" : ""}`}>{s.tickets} 堂</p>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(s.courses ?? []).map((c) => (
                    <span key={c} className="text-[10px] bg-[#f5f5f5] text-[#666] px-1.5 py-0.5 rounded">{c}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-[10px] text-[#aaa]">最後動態 {s.lastActive}</p>
                  <button onClick={() => openView(s)} className="text-xs text-[#999] hover:text-black">查看</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 外部學員 ── */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[#f5f5f5]">
            <p className="text-xs font-medium text-[#555]">外部學員</p>
            <span className="text-[11px] bg-[#f5f5f5] text-[#aaa] px-1.5 py-0.5 rounded-full">{external.length}</span>
          </div>
          <div className="hidden md:block">
            <div className="grid grid-cols-[1.5fr_0.5fr_1fr_1.5fr_1.5fr_0.8fr_auto] gap-4 px-5 py-2.5 text-[11px] text-[#bbb] uppercase tracking-widest border-b border-[#f9f9f9]">
              <span>學生</span><span>年齡</span><span>類別</span><span>所屬單位</span><span>所屬班級</span><span>最後動態</span><span></span>
            </div>
            <div className="divide-y divide-[#f9f9f9]">
              {external.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無外部學員</p>}
              {external.map((s) => (
                <div key={s.id} className="grid grid-cols-[1.5fr_0.5fr_1fr_1.5fr_1.5fr_0.8fr_auto] gap-4 items-center px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-[11px] text-[#999] font-medium">{s.name.slice(0, 1)}</div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      {s.types.includes("內部") && <span className="text-[10px] bg-[#f0f0f0] text-[#555] px-1.5 py-0.5 rounded-full shrink-0">內部</span>}
                    </div>
                  </div>
                  <p className="text-sm text-[#999]">{s.age}歲</p>
                  <span className="text-[11px] bg-[#e8f4fd] text-[#1a6fa8] px-2 py-0.5 rounded-full w-fit">{s.category ?? "—"}</span>
                  <p className="text-xs text-[#666] truncate">{s.unit ?? "—"}</p>
                  <p className="text-xs text-[#666] truncate">{s.classGroup ?? "—"}</p>
                  <p className="text-xs text-[#999]">{s.lastActive}</p>
                  <button onClick={() => openView(s)} className="text-xs text-[#999] hover:text-black">查看</button>
                </div>
              ))}
            </div>
          </div>
          <div className="md:hidden divide-y divide-[#f9f9f9]">
            {external.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無外部學員</p>}
            {external.map((s) => (
              <div key={s.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-sm text-[#999] font-medium">{s.name.slice(0, 1)}</div>
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-[#999]">{s.age}歲</p>
                    </div>
                  </div>
                  <span className="text-[11px] bg-[#e8f4fd] text-[#1a6fa8] px-2 py-0.5 rounded-full">{s.category ?? "—"}</span>
                </div>
                <div className="flex gap-4 mt-2">
                  <div>
                    <p className="text-[10px] text-[#bbb]">所屬單位</p>
                    <p className="text-xs text-[#666] mt-0.5">{s.unit ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#bbb]">所屬班級</p>
                    <p className="text-xs text-[#666] mt-0.5">{s.classGroup ?? "—"}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-[10px] text-[#aaa]">最後動態 {s.lastActive}</p>
                  <button onClick={() => openView(s)} className="text-xs text-[#999] hover:text-black">查看</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── 新增學員 Drawer ── */}
      {drawer === "add" && (
        <Drawer title="新增學員" onClose={close}>
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-[#aaa] uppercase tracking-widest">學員資料</p>

              <Field label="姓名">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="學員姓名" className={inputCls} />
              </Field>

              <Field label="年齡">
                <input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                  placeholder="歲" className={inputCls} />
              </Field>

              <Field label="學員類別（可複選）">
                <div className="flex gap-2">
                  {(["內部", "外部"] as const).map(t => {
                    const active = form.types.includes(t)
                    return (
                      <button key={t} onClick={() => toggleFormType(t)}
                        className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${
                          active ? "bg-black text-white border-black" : "bg-white text-[#666] border-[#f0f0f0] hover:border-black"
                        }`}>
                        {t}學員
                      </button>
                    )
                  })}
                </div>
              </Field>

              {form.types.includes("內部") && (
                <>
                  <Field label="所屬帳號">
                    <select value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value }))}
                      className={inputCls}>
                      {ACCOUNTS.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </Field>
                  <Field label="與帳號者關係">
                    <div className="grid grid-cols-4 gap-2">
                      {RELATIONS.map(r => (
                        <button key={r} onClick={() => setForm(f => ({ ...f, relation: r }))}
                          className={`py-2 text-sm rounded-xl border transition-colors ${
                            form.relation === r ? "bg-black text-white border-black" : "bg-white text-[#666] border-[#f0f0f0] hover:border-black"
                          }`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </Field>
                </>
              )}

              {form.types.includes("外部") && (
                <>
                  <Field label="類別">
                    <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      placeholder="校外合作、試課…" className={inputCls} />
                  </Field>
                  <Field label="所屬單位">
                    <select value={form.unit}
                      onChange={e => setForm(f => ({ ...f, unit: e.target.value, classGroup: "" }))}
                      className={inputCls}>
                      <option value="">請選擇單位…</option>
                      {UNITS.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                    </select>
                  </Field>
                  {form.unit && (() => {
                    const unit = UNITS.find(u => u.name === form.unit)
                    if (!unit || unit.subUnits.length === 0) return null
                    return (
                      <Field label="所屬班級">
                        <select value={form.classGroup}
                          onChange={e => setForm(f => ({ ...f, classGroup: e.target.value }))}
                          className={inputCls}>
                          <option value="">請選擇班級…</option>
                          {unit.subUnits.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                        </select>
                      </Field>
                    )
                  })()}
                </>
              )}

              <Field label="備註">
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="過敏、特殊需求…" rows={3}
                  className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black focus:bg-white transition-colors resize-none" />
              </Field>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[#f0f0f0] flex justify-end gap-2">
            <button onClick={close} className="px-4 py-2 text-sm border border-[#f0f0f0] rounded-xl hover:border-black transition-colors">
              取消
            </button>
            <button onClick={saveAdd} className="px-5 py-2 text-sm bg-black text-white rounded-xl hover:bg-[#222] transition-colors">
              建立學員
            </button>
          </div>
        </Drawer>
      )}

      {/* ── 查看學員 Drawer ── */}
      {drawer === "view" && selected && (
        <Drawer title="學員詳情" onClose={close}>
          <div className="px-6 py-5 flex flex-col gap-5">

            {/* Profile */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-xl text-[#999] font-medium">
                {selected.name.slice(0, 1)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-base font-medium">{selected.name}</p>
                  {selected.types.map(t => (
                    <span key={t} className={`text-[11px] px-2 py-0.5 rounded-full ${
                      t === "內部" ? "bg-[#f0f0f0] text-[#555]" : "bg-[#e8f4fd] text-[#1a6fa8]"
                    }`}>{t}</span>
                  ))}
                </div>
                <p className="text-sm text-[#999] mt-0.5">{selected.age} 歲</p>
              </div>
            </div>

            {/* 內部 section */}
            {selected.types.includes("內部") && (
              <>
                <div>
                  <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-3">內部學員</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`rounded-xl p-4 ${(selected.tickets ?? 0) === 0 ? "bg-red-50 border border-red-100" : "bg-[#fafaf9] border border-[#f0f0f0]"}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Ticket size={13} className={(selected.tickets ?? 0) === 0 ? "text-red-400" : "text-[#aaa]"} />
                        <p className="text-[11px] text-[#aaa]">課堂券餘額</p>
                      </div>
                      <p className={`text-2xl font-light ${(selected.tickets ?? 0) === 0 ? "text-red-400" : ""}`}>{selected.tickets ?? 0} <span className="text-sm">堂</span></p>
                    </div>
                    <div className="bg-[#fafaf9] border border-[#f0f0f0] rounded-xl p-4">
                      <div className="flex items-center gap-1.5 mb-1">
                        <BookOpen size={13} className="text-[#aaa]" />
                        <p className="text-[11px] text-[#aaa]">報名課程</p>
                      </div>
                      <p className="text-2xl font-light">{(selected.courses ?? []).length} <span className="text-sm">堂</span></p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 bg-[#fafaf9] border border-[#f0f0f0] rounded-xl px-4 py-3 flex items-center justify-between">
                    <p className="text-[11px] text-[#aaa]">所屬帳號</p>
                    <p className="text-sm font-medium">{selected.account ?? "—"}</p>
                  </div>
                  <div className="flex-1 bg-[#fafaf9] border border-[#f0f0f0] rounded-xl px-4 py-3 flex items-center justify-between">
                    <p className="text-[11px] text-[#aaa]">與帳號者關係</p>
                    <p className="text-sm font-medium">{selected.relation ?? "—"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-2.5">報名中課程</p>
                  {(selected.courses ?? []).length === 0 ? (
                    <p className="text-sm text-[#ccc]">尚未報名任何課程</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {(selected.courses ?? []).map(c => (
                        <div key={c} className="bg-[#fafaf9] border border-[#f0f0f0] rounded-xl px-4 py-3">
                          <p className="text-sm">{c}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-2.5">出席紀錄</p>
                  {(selected.id === 1 ? ATTENDANCE : []).length === 0 ? (
                    <p className="text-sm text-[#ccc]">尚無出席紀錄</p>
                  ) : (
                    <div className="flex flex-col">
                      {(selected.id === 1 ? ATTENDANCE : []).map((r, i) => (
                        <div key={i} className="flex items-center justify-between py-2.5 border-b border-[#f5f5f5] last:border-0">
                          <div>
                            <p className="text-sm">{r.course}</p>
                            <p className="text-xs text-[#aaa] mt-0.5">{r.date} · {r.teacher}</p>
                          </div>
                          <span className={`text-[11px] px-2.5 py-1 rounded-full ${
                            r.status === "出席" ? "bg-black text-white" : "bg-[#f5f5f5] text-[#999]"
                          }`}>{r.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* divider between sections */}
            {selected.types.length === 2 && <div className="border-t border-[#f0f0f0]" />}

            {/* 外部 section */}
            {selected.types.includes("外部") && (
              <div>
                <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-3">外部學員</p>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "類別",     value: selected.category },
                    { label: "所屬單位", value: selected.unit },
                    { label: "所屬班級", value: selected.classGroup },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-[#fafaf9] border border-[#f0f0f0] rounded-xl px-4 py-3 flex items-center justify-between">
                      <p className="text-[11px] text-[#aaa]">{label}</p>
                      <p className="text-sm font-medium">{value ?? "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#f0f0f0] flex justify-between">
            <button onClick={() => deleteStudent(selected.id)}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors px-3 py-2">
              <Trash2 size={14} />刪除學員
            </button>
            <button onClick={close} className="px-5 py-2 text-sm bg-black text-white rounded-xl hover:bg-[#222] transition-colors">
              關閉
            </button>
          </div>
        </Drawer>
      )}
    </div>
  )
}
