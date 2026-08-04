'use client'

import { useState, useEffect, useMemo } from "react"
import { Search, Plus, X, Trash2, BookOpen, Ticket, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Relation = "本人" | "子女" | "配偶" | "其他"
const RELATIONS: Relation[] = ["本人", "子女", "配偶", "其他"]

type StudentRow = {
  id: string
  owner_id: string | null
  name: string
  age: number | null
  relation: Relation
  status: "待審核" | "已核准" | "已拒絕"
  types: ("內部" | "外部")[]
  category: string | null
  unit_id: string | null
  class_group: string | null
  note: string | null
  created_at: string
  owner: { name: string } | null
  unit: { name: string } | null
}

type Student = StudentRow & {
  tickets: number
  courses: string[]
  lastActive: string
}

type AccountRef = { id: string; name: string }
type UnitRef = { id: string; name: string; subUnits: { name: string }[] }
type TicketLite = { status: string; student_id: string | null; transferred_to: string | null }
type OrderLite = { student_id: string | null; item_name: string; course_id: string | null; created_at: string }
type AttendanceRow = { date: string; records: { name: string; status: string }[]; course: { title: string } | null }

function fmtMMDD(iso: string) {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
}
function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

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

const EMPTY_FORM = {
  name: "", age: "", types: ["內部"] as ("內部" | "外部")[],
  ownerId: "", relation: "子女" as Relation,
  category: "", unitId: "", classGroup: "", notes: "",
}

export default function StudentsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [students, setStudents] = useState<Student[]>([])
  const [accounts, setAccounts] = useState<AccountRef[]>([])
  const [units, setUnits]       = useState<UnitRef[]>([])
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [query, setQuery]       = useState("")
  const [drawer, setDrawer]     = useState<"add" | "view" | null>(null)
  const [selected, setSelected] = useState<Student | null>(null)
  const [form, setForm]         = useState(EMPTY_FORM)

  useEffect(() => {
    Promise.all([
      supabase.from("students").select("*, owner:profiles!owner_id(name), unit:units!unit_id(name)").order("created_at"),
      supabase.from("tickets").select("status, student_id, transferred_to"),
      supabase.from("orders").select("student_id, item_name, course_id, created_at").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, name").order("name"),
      supabase.from("units").select("id, name, sub_units").order("created_at"),
      supabase.from("course_attendance").select("date, records, course:courses(title)").order("date", { ascending: false }),
    ]).then(([sRes, tRes, oRes, pRes, uRes, aRes]) => {
      if (sRes.error) console.error("載入學員失敗:", sRes.error.message)
      const tickets = (tRes.data ?? []) as TicketLite[]
      const orders  = (oRes.data ?? []) as OrderLite[]
      const rows    = (sRes.data ?? []) as unknown as StudentRow[]

      setStudents(rows.map(r => {
        const unused = tickets.filter(t =>
          t.status === "未使用" && ((t.transferred_to ?? t.student_id) === r.id)
        ).length
        const myOrders = orders.filter(o => o.student_id === r.id)
        const courses = [...new Set(myOrders.filter(o => o.course_id).map(o => o.item_name))]
        return {
          ...r,
          types: Array.isArray(r.types) && r.types.length ? r.types : ["內部"],
          tickets: unused,
          courses,
          lastActive: myOrders.length ? fmtMMDD(myOrders[0].created_at) : "—",
        }
      }))
      setAccounts((pRes.data ?? []) as AccountRef[])
      setUnits(((uRes.data ?? []) as { id: string; name: string; sub_units: { name: string }[] }[])
        .map(u => ({ id: u.id, name: u.name, subUnits: Array.isArray(u.sub_units) ? u.sub_units : [] })))
      setAttendance((aRes.data ?? []) as unknown as AttendanceRow[])
      setLoading(false)
    })
  }, [supabase])

  const matched = students.filter(s =>
    !query.trim() || s.name.includes(query.trim()) || (s.owner?.name ?? "").includes(query.trim())
  )
  const pending  = matched.filter(s => s.status === "待審核")
  const approved = matched.filter(s => s.status === "已核准")
  const internal = approved.filter(s => s.types.includes("內部"))
  const external = approved.filter(s => s.types.includes("外部"))

  async function updateRequest(id: string, status: "已核准" | "已拒絕") {
    const { error } = await supabase.from("students").update({ status }).eq("id", id)
    if (error) { alert(`操作失敗：${error.message}`); return }
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  function openAdd() {
    setForm(EMPTY_FORM)
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

  async function saveAdd() {
    if (!form.name.trim() || saving) return
    const isInternal = form.types.includes("內部")
    if (isInternal && !form.ownerId) { alert("內部學員請選擇所屬帳號"); return }
    setSaving(true)
    const { data, error } = await supabase.from("students").insert({
      owner_id: isInternal ? form.ownerId : null,
      name: form.name.trim(),
      age: parseInt(form.age) || null,
      relation: isInternal ? form.relation : "其他",
      status: "已核准",
      types: form.types,
      category: form.types.includes("外部") ? (form.category || null) : null,
      unit_id: form.types.includes("外部") && form.unitId ? form.unitId : null,
      class_group: form.types.includes("外部") ? (form.classGroup || null) : null,
      note: form.notes || null,
    }).select("*, owner:profiles!owner_id(name), unit:units!unit_id(name)").single()
    setSaving(false)
    if (error) { alert(`新增失敗：${error.message}`); return }
    const r = data as unknown as StudentRow
    setStudents(prev => [...prev, { ...r, types: r.types?.length ? r.types : ["內部"], tickets: 0, courses: [], lastActive: "—" }])
    close()
  }

  async function deleteStudent(id: string) {
    if (!confirm("確定刪除此學員？")) return
    const { error } = await supabase.from("students").delete().eq("id", id)
    if (error) { alert(`刪除失敗：${error.message}`); return }
    setStudents(prev => prev.filter(s => s.id !== id))
    close()
  }

  // 學員的出席紀錄（依姓名比對點名名單）
  function attendanceOf(name: string) {
    return attendance
      .flatMap(a => (a.records ?? [])
        .filter(r => r.name === name)
        .map(r => ({ date: a.date, course: a.course?.title ?? "—", status: r.status })))
      .slice(0, 10)
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
        <input placeholder="搜尋學員姓名 / 帳號…" value={query} onChange={e => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black" />
      </div>

      <div className="flex flex-col gap-5">

        {/* ── 待審核申請 ── */}
        {pending.length > 0 && (
          <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-100 bg-amber-50">
              <p className="text-xs font-medium text-amber-800">待審核申請</p>
              <span className="text-[11px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full">{pending.length}</span>
            </div>
            <div className="divide-y divide-[#f9f9f9]">
              {pending.map(r => (
                <div key={r.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-8 h-8 bg-amber-100 rounded-full shrink-0 flex items-center justify-center text-sm text-amber-700 font-medium">
                    {r.name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{r.name}</p>
                      {r.age != null && <span className="text-[10px] bg-[#f5f5f5] text-[#666] px-1.5 py-0.5 rounded-full">{r.age}歲</span>}
                      <span className="text-[10px] bg-[#f5f5f5] text-[#666] px-1.5 py-0.5 rounded-full">{r.relation}</span>
                    </div>
                    <p className="text-xs text-[#aaa] mt-0.5">{r.owner?.name ?? "—"} · {fmtDateTime(r.created_at)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => updateRequest(r.id, "已拒絕")}
                      className="px-3 py-1.5 text-xs border border-[#f0f0f0] rounded-lg text-[#999] hover:border-red-200 hover:text-red-500 transition-colors"
                    >
                      拒絕
                    </button>
                    <button
                      onClick={() => updateRequest(r.id, "已核准")}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-black text-white rounded-lg hover:bg-[#222] transition-colors"
                    >
                      <Check size={11} strokeWidth={2.5} />核准
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
              {loading && <p className="px-5 py-4 text-sm text-[#ccc]">載入中…</p>}
              {!loading && internal.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無內部學員</p>}
              {internal.map((s) => (
                <div key={s.id} className="grid grid-cols-[1.5fr_0.5fr_1.5fr_0.6fr_0.7fr_2fr_0.7fr_auto] gap-4 items-center px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-[11px] text-[#999] font-medium">{s.name.slice(0, 1)}</div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      {s.types.includes("外部") && <span className="text-[10px] bg-[#e8f4fd] text-[#1a6fa8] px-1.5 py-0.5 rounded-full shrink-0">外部</span>}
                    </div>
                  </div>
                  <p className="text-sm text-[#999]">{s.age != null ? `${s.age}歲` : "—"}</p>
                  <p className="text-xs text-[#666] truncate">{s.owner?.name ?? "—"}</p>
                  <p className="text-xs text-[#999]">{s.relation}</p>
                  <p className={`text-sm font-medium ${s.tickets === 0 ? "text-red-400" : ""}`}>{s.tickets} 堂</p>
                  <div className="flex flex-wrap gap-1">
                    {s.courses.map((c) => (
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
            {!loading && internal.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無內部學員</p>}
            {internal.map((s) => (
              <div key={s.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-sm text-[#999] font-medium">{s.name.slice(0, 1)}</div>
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-[#999]">{s.age != null ? `${s.age}歲 · ` : ""}{s.owner?.name ?? "—"} · {s.relation}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-medium ${s.tickets === 0 ? "text-red-400" : ""}`}>{s.tickets} 堂</p>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {s.courses.map((c) => (
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
              {!loading && external.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無外部學員</p>}
              {external.map((s) => (
                <div key={s.id} className="grid grid-cols-[1.5fr_0.5fr_1fr_1.5fr_1.5fr_0.8fr_auto] gap-4 items-center px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-[11px] text-[#999] font-medium">{s.name.slice(0, 1)}</div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      {s.types.includes("內部") && <span className="text-[10px] bg-[#f0f0f0] text-[#555] px-1.5 py-0.5 rounded-full shrink-0">內部</span>}
                    </div>
                  </div>
                  <p className="text-sm text-[#999]">{s.age != null ? `${s.age}歲` : "—"}</p>
                  <span className="text-[11px] bg-[#e8f4fd] text-[#1a6fa8] px-2 py-0.5 rounded-full w-fit">{s.category ?? "—"}</span>
                  <p className="text-xs text-[#666] truncate">{s.unit?.name ?? "—"}</p>
                  <p className="text-xs text-[#666] truncate">{s.class_group ?? "—"}</p>
                  <p className="text-xs text-[#999]">{s.lastActive}</p>
                  <button onClick={() => openView(s)} className="text-xs text-[#999] hover:text-black">查看</button>
                </div>
              ))}
            </div>
          </div>
          <div className="md:hidden divide-y divide-[#f9f9f9]">
            {!loading && external.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無外部學員</p>}
            {external.map((s) => (
              <div key={s.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-sm text-[#999] font-medium">{s.name.slice(0, 1)}</div>
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-[#999]">{s.age != null ? `${s.age}歲` : "—"}</p>
                    </div>
                  </div>
                  <span className="text-[11px] bg-[#e8f4fd] text-[#1a6fa8] px-2 py-0.5 rounded-full">{s.category ?? "—"}</span>
                </div>
                <div className="flex gap-4 mt-2">
                  <div>
                    <p className="text-[10px] text-[#bbb]">所屬單位</p>
                    <p className="text-xs text-[#666] mt-0.5">{s.unit?.name ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#bbb]">所屬班級</p>
                    <p className="text-xs text-[#666] mt-0.5">{s.class_group ?? "—"}</p>
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
                    <select value={form.ownerId} onChange={e => setForm(f => ({ ...f, ownerId: e.target.value }))}
                      className={inputCls}>
                      <option value="">選擇帳號…</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
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
                    <select value={form.unitId}
                      onChange={e => setForm(f => ({ ...f, unitId: e.target.value, classGroup: "" }))}
                      className={inputCls}>
                      <option value="">請選擇單位…</option>
                      {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </Field>
                  {form.unitId && (() => {
                    const unit = units.find(u => u.id === form.unitId)
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
            <button onClick={saveAdd} disabled={saving}
              className="px-5 py-2 text-sm bg-black text-white rounded-xl hover:bg-[#222] disabled:opacity-50 transition-colors">
              {saving ? "儲存中…" : "建立學員"}
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
                <p className="text-sm text-[#999] mt-0.5">{selected.age != null ? `${selected.age} 歲` : "—"}</p>
              </div>
            </div>

            {/* 內部 section */}
            {selected.types.includes("內部") && (
              <>
                <div>
                  <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-3">內部學員</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`rounded-xl p-4 ${selected.tickets === 0 ? "bg-red-50 border border-red-100" : "bg-[#fafaf9] border border-[#f0f0f0]"}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Ticket size={13} className={selected.tickets === 0 ? "text-red-400" : "text-[#aaa]"} />
                        <p className="text-[11px] text-[#aaa]">課堂券餘額</p>
                      </div>
                      <p className={`text-2xl font-light ${selected.tickets === 0 ? "text-red-400" : ""}`}>{selected.tickets} <span className="text-sm">堂</span></p>
                    </div>
                    <div className="bg-[#fafaf9] border border-[#f0f0f0] rounded-xl p-4">
                      <div className="flex items-center gap-1.5 mb-1">
                        <BookOpen size={13} className="text-[#aaa]" />
                        <p className="text-[11px] text-[#aaa]">報名課程</p>
                      </div>
                      <p className="text-2xl font-light">{selected.courses.length} <span className="text-sm">堂</span></p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 bg-[#fafaf9] border border-[#f0f0f0] rounded-xl px-4 py-3 flex items-center justify-between">
                    <p className="text-[11px] text-[#aaa]">所屬帳號</p>
                    <p className="text-sm font-medium">{selected.owner?.name ?? "—"}</p>
                  </div>
                  <div className="flex-1 bg-[#fafaf9] border border-[#f0f0f0] rounded-xl px-4 py-3 flex items-center justify-between">
                    <p className="text-[11px] text-[#aaa]">與帳號者關係</p>
                    <p className="text-sm font-medium">{selected.relation}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-2.5">報名中課程</p>
                  {selected.courses.length === 0 ? (
                    <p className="text-sm text-[#ccc]">尚未報名任何課程</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selected.courses.map(c => (
                        <div key={c} className="bg-[#fafaf9] border border-[#f0f0f0] rounded-xl px-4 py-3">
                          <p className="text-sm">{c}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 出席紀錄 */}
            <div>
              <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-2.5">出席紀錄</p>
              {attendanceOf(selected.name).length === 0 ? (
                <p className="text-sm text-[#ccc]">尚無出席紀錄</p>
              ) : (
                <div className="flex flex-col">
                  {attendanceOf(selected.name).map((r, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-[#f5f5f5] last:border-0">
                      <div>
                        <p className="text-sm">{r.course}</p>
                        <p className="text-xs text-[#aaa] mt-0.5">{r.date}</p>
                      </div>
                      <span className={`text-[11px] px-2.5 py-1 rounded-full ${
                        r.status === "出席" ? "bg-black text-white" : "bg-[#f5f5f5] text-[#999]"
                      }`}>{r.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* divider between sections */}
            {selected.types.length === 2 && <div className="border-t border-[#f0f0f0]" />}

            {/* 外部 section */}
            {selected.types.includes("外部") && (
              <div>
                <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-3">外部學員</p>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "類別",     value: selected.category },
                    { label: "所屬單位", value: selected.unit?.name },
                    { label: "所屬班級", value: selected.class_group },
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
