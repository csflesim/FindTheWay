'use client'

import { useState } from "react"
import { Search, Plus, X, Trash2, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"

type Classroom = {
  id: number
  name: string
  capacity: number
  equipment: string[]
  status: "使用中" | "維修中" | "停用"
  notes?: string
}

type RoomCourse = { title: string; time: string; teachers: string[] }
type RoomScheduleMap = Record<string, RoomCourse[]>

const scheduleByRoom: Record<string, RoomScheduleMap> = {
  "Studio A": {
    "2026-06-06": [{ title: "基礎水彩入門", time: "10:00–12:00", teachers: ["明德老師"] }],
    "2026-06-07": [{ title: "兒童創意素描", time: "14:00–15:30", teachers: ["小紫老師"] }],
    "2026-06-13": [{ title: "基礎水彩入門", time: "10:00–12:00", teachers: ["明德老師"] }],
    "2026-06-14": [{ title: "兒童創意素描", time: "14:00–15:30", teachers: ["小紫老師"] }],
    "2026-06-20": [{ title: "基礎水彩入門", time: "10:00–12:00", teachers: ["明德老師"] }],
    "2026-06-21": [{ title: "兒童創意素描", time: "14:00–15:30", teachers: ["小紫老師"] }],
    "2026-06-27": [{ title: "基礎水彩入門", time: "10:00–12:00", teachers: ["明德老師"] }],
    "2026-06-28": [{ title: "兒童創意素描", time: "14:00–15:30", teachers: ["小紫老師"] }],
  },
  "Studio B": {
    "2026-06-05": [{ title: "成人油畫工作坊", time: "19:00–21:00", teachers: ["明德老師"] }],
    "2026-06-06": [{ title: "親子藝術探索",   time: "14:00–15:30", teachers: ["小紫老師"] }],
    "2026-06-07": [{ title: "親子創意手作",   time: "10:00–12:00", teachers: ["小紫老師", "明德老師"] }],
    "2026-06-12": [{ title: "成人油畫工作坊", time: "19:00–21:00", teachers: ["明德老師"] }],
    "2026-06-13": [{ title: "親子藝術探索",   time: "14:00–15:30", teachers: ["小紫老師"] }],
    "2026-06-14": [{ title: "親子創意手作",   time: "10:00–12:00", teachers: ["小紫老師", "明德老師"] }],
    "2026-06-19": [{ title: "成人油畫工作坊", time: "19:00–21:00", teachers: ["明德老師"] }],
    "2026-06-20": [{ title: "親子藝術探索",   time: "14:00–15:30", teachers: ["小紫老師"] }],
    "2026-06-21": [{ title: "親子創意手作",   time: "10:00–12:00", teachers: ["小紫老師", "明德老師"] }],
    "2026-06-26": [{ title: "成人油畫工作坊", time: "19:00–21:00", teachers: ["明德老師"] }],
    "2026-06-27": [{ title: "親子藝術探索",   time: "14:00–15:30", teachers: ["小紫老師"] }],
    "2026-06-28": [{ title: "親子創意手作",   time: "10:00–12:00", teachers: ["小紫老師", "明德老師"] }],
  },
  "Studio C": {
    "2026-06-03": [{ title: "水墨入門體驗", time: "19:00–21:00", teachers: ["明德老師"] }],
    "2026-06-10": [{ title: "水墨入門體驗", time: "19:00–21:00", teachers: ["明德老師"] }],
    "2026-06-17": [{ title: "水墨入門體驗", time: "19:00–21:00", teachers: ["明德老師"] }],
    "2026-06-24": [{ title: "水墨入門體驗", time: "19:00–21:00", teachers: ["明德老師"] }],
  },
}

const INITIAL_CLASSROOMS: Classroom[] = [
  { id: 1, name: "忙碌不迷路工作室", capacity: 20, equipment: [], status: "使用中" },
  { id: 2, name: "Studio A", capacity: 10, equipment: ["畫架", "投影機", "白板"],   status: "使用中" },
  { id: 3, name: "Studio B", capacity: 8,  equipment: ["畫架", "工作桌"],           status: "使用中" },
  { id: 4, name: "Studio C", capacity: 8,  equipment: ["拉坯機", "窯爐", "工作桌"], status: "使用中" },
]

const WEEKDAYS   = ["日", "一", "二", "三", "四", "五", "六"]
const MONTH_NAMES = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"]

function pad(n: number) { return String(n).padStart(2, "0") }
function dateKey(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}` }

function ClassroomCalendarModal({ room, onClose }: { room: Classroom; onClose: () => void }) {
  const [year, setYear]   = useState(2026)
  const [month, setMonth] = useState(5)
  const [selected, setSelected] = useState<string | null>(null)

  const schedule = scheduleByRoom[room.name] ?? {}
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
    setSelected(null)
  }

  const selectedCourses = selected ? (schedule[selected] ?? []) : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#f2f2f2] rounded-lg flex items-center justify-center text-xs text-[#999] font-medium shrink-0">
              {room.name.slice(0, 1)}
            </div>
            <div>
              <p className="text-sm font-medium">{room.name} 的課表</p>
              <p className="text-xs text-[#999]">容納 {room.capacity} 人{room.equipment.length > 0 ? ` · ${room.equipment.join("、")}` : ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#bbb] hover:text-black transition-colors"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[#f5f5f5] transition-colors"><ChevronLeft size={16} /></button>
            <p className="text-sm font-medium">{year} 年 {MONTH_NAMES[month]}</p>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[#f5f5f5] transition-colors"><ChevronRight size={16} /></button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 px-4 mb-1">
            {WEEKDAYS.map(d => <div key={d} className="text-center text-[11px] text-[#bbb] py-1">{d}</div>)}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 px-4 pb-4 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const key = dateKey(year, month, day)
              const courses = schedule[key] ?? []
              const isSelected = selected === key
              const hasClass = courses.length > 0
              return (
                <button key={i} onClick={() => setSelected(isSelected ? null : key)}
                  className={`rounded-xl p-1 min-h-[52px] flex flex-col items-center transition-colors ${
                    isSelected ? "bg-black text-white" : hasClass ? "bg-[#f5f5f5] hover:bg-[#ebebeb]" : "hover:bg-[#f9f9f9]"
                  }`}>
                  <span className={`text-xs font-medium mb-1 ${isSelected ? "text-white" : hasClass ? "text-black" : "text-[#999]"}`}>{day}</span>
                  {courses.map((c, ci) => (
                    <span key={ci} className={`w-full text-center text-[9px] leading-tight px-1 py-0.5 rounded truncate ${
                      isSelected ? "bg-white/20 text-white" : "bg-black text-white"
                    }`}>{c.time.split("–")[0]}</span>
                  ))}
                </button>
              )
            })}
          </div>

          {/* Selected day detail */}
          {selected && (
            <div className="mx-4 mb-4 rounded-xl border border-[#f0f0f0] overflow-hidden">
              <div className="px-4 py-3 bg-[#f9f9f9] border-b border-[#f0f0f0]">
                <p className="text-xs font-medium text-[#666]">{selected.replace(/(\d{4})-(\d{2})-(\d{2})/, "$1/$2/$3")}</p>
              </div>
              {selectedCourses.length === 0 ? (
                <p className="px-4 py-3 text-sm text-[#aaa]">無課程安排</p>
              ) : (
                <div className="divide-y divide-[#f5f5f5]">
                  {selectedCourses.map((c, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-[#999] mt-0.5">{c.time} · {c.teachers.join("、")}</p>
                      </div>
                      <span className="text-[11px] bg-black text-white px-2.5 py-1 rounded-full">已排課</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Monthly list */}
          <div className="px-4 pb-5">
            <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-3">本月課程清單</p>
            {Object.entries(schedule).filter(([k]) => k.startsWith(`${year}-${pad(month + 1)}`)).length === 0 ? (
              <p className="text-sm text-[#aaa]">本月無排課</p>
            ) : (
              <div className="flex flex-col gap-2">
                {Object.entries(schedule)
                  .filter(([k]) => k.startsWith(`${year}-${pad(month + 1)}`))
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([k, courses]) => courses.map((c, ci) => (
                    <div key={`${k}-${ci}`} className="flex items-center justify-between bg-[#f9f9f9] rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-[#999] mt-0.5">
                          {k.replace(/(\d{4})-(\d{2})-(\d{2})/, "$2/$3")} · {c.time} · {c.teachers.join("、")}
                        </p>
                      </div>
                    </div>
                  )))
                }
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Drawer ──────────────────────────────────────────────

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
  name: string
  capacity: string
  equipment: string[]
  status: Classroom["status"]
  notes: string
}

const EMPTY_FORM: FormState = {
  name: "", capacity: "", equipment: [], status: "使用中", notes: "",
}

const statusStyle: Record<Classroom["status"], string> = {
  "使用中": "bg-black text-white",
  "維修中": "bg-amber-50 text-amber-600 border border-amber-200",
  "停用":   "bg-[#f5f5f5] text-[#999]",
}

export default function ClassroomsPage() {
  const [classrooms, setClassrooms]     = useState<Classroom[]>(INITIAL_CLASSROOMS)
  const [calendarRoom, setCalendarRoom] = useState<Classroom | null>(null)
  const [drawer, setDrawer]             = useState<"add" | "edit" | null>(null)
  const [editing, setEditing]           = useState<Classroom | null>(null)
  const [form, setForm]                 = useState<FormState>(EMPTY_FORM)
  const [nextId, setNextId]             = useState(10)
  const [newEquip, setNewEquip]         = useState("")

  function openAdd() {
    setForm(EMPTY_FORM); setNewEquip("")
    setDrawer("add")
  }

  function openEdit(c: Classroom) {
    setEditing(c)
    setForm({ name: c.name, capacity: String(c.capacity), equipment: [...c.equipment], status: c.status, notes: c.notes ?? "" })
    setNewEquip("")
    setDrawer("edit")
  }

  function close() { setDrawer(null); setEditing(null) }

  function addEquip() {
    if (!newEquip.trim()) return
    setForm(f => ({ ...f, equipment: [...f.equipment, newEquip.trim()] }))
    setNewEquip("")
  }

  function removeEquip(item: string) {
    setForm(f => ({ ...f, equipment: f.equipment.filter(e => e !== item) }))
  }

  function saveAdd() {
    if (!form.name.trim()) return
    setClassrooms(prev => [...prev, {
      id: nextId, name: form.name.trim(),
      capacity: parseInt(form.capacity) || 0,
      equipment: form.equipment, status: form.status, notes: form.notes,
    }])
    setNextId(n => n + 1)
    close()
  }

  function saveEdit() {
    if (!editing) return
    setClassrooms(prev => prev.map(c => c.id === editing.id ? {
      ...c, name: form.name, capacity: parseInt(form.capacity) || 0,
      equipment: form.equipment, status: form.status, notes: form.notes,
    } : c))
    close()
  }

  function deleteClassroom(id: number) {
    setClassrooms(prev => prev.filter(c => c.id !== id))
    close()
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Classrooms</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">教室管理</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-black text-white text-sm px-3 md:px-4 py-2 rounded-lg hover:bg-[#222] transition-colors">
          <Plus size={15} /><span className="hidden sm:inline">新增教室</span><span className="sm:hidden">新增</span>
        </button>
      </div>

      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
        <input placeholder="搜尋教室名稱…"
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black" />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
        <div className="grid grid-cols-[1.5fr_0.6fr_2.5fr_0.8fr_auto] gap-4 px-5 py-3 border-b border-[#f5f5f5] text-[11px] text-[#aaa] uppercase tracking-widest">
          <span>教室</span><span>容納人數</span><span>設備</span><span>狀態</span><span></span>
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {classrooms.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無教室</p>}
          {classrooms.map((c) => (
            <div key={c.id} className="grid grid-cols-[1.5fr_0.6fr_2.5fr_0.8fr_auto] gap-4 items-center px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-[#f2f2f2] rounded-lg shrink-0 flex items-center justify-center text-[11px] text-[#999] font-medium">
                  {c.name.slice(0, 1)}
                </div>
                <p className="text-sm font-medium">{c.name}</p>
              </div>
              <p className="text-sm text-[#666]">{c.capacity} 人</p>
              <div className="flex flex-wrap gap-1">
                {c.equipment.map(e => (
                  <span key={e} className="text-[10px] bg-[#f5f5f5] text-[#666] px-1.5 py-0.5 rounded">{e}</span>
                ))}
                {c.equipment.length === 0 && <span className="text-[10px] text-[#ccc]">—</span>}
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full w-fit ${statusStyle[c.status]}`}>{c.status}</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setCalendarRoom(c)}
                  className="flex items-center gap-1 text-xs text-[#999] hover:text-black transition-colors">
                  <CalendarDays size={13} />課表
                </button>
                <button onClick={() => openEdit(c)} className="text-xs text-[#999] hover:text-black">編輯</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {classrooms.map((c) => (
          <div key={c.id} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[#f2f2f2] rounded-lg shrink-0 flex items-center justify-center text-sm text-[#999] font-medium">
                  {c.name.slice(0, 1)}
                </div>
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-[#aaa]">容納 {c.capacity} 人</p>
                </div>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full shrink-0 ${statusStyle[c.status]}`}>{c.status}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {c.equipment.map(e => (
                <span key={e} className="text-[10px] bg-[#f5f5f5] text-[#666] px-1.5 py-0.5 rounded">{e}</span>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 mt-3">
              <button onClick={() => setCalendarRoom(c)}
                className="flex items-center gap-1 text-xs text-[#999] hover:text-black transition-colors">
                <CalendarDays size={13} />課表
              </button>
              <button onClick={() => openEdit(c)} className="text-xs text-[#999] hover:text-black">編輯</button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Calendar Modal ── */}
      {calendarRoom && (
        <ClassroomCalendarModal room={calendarRoom} onClose={() => setCalendarRoom(null)} />
      )}

      {/* ── 新增 / 編輯 Drawer ── */}
      {drawer && (
        <Drawer title={drawer === "add" ? "新增教室" : "編輯教室"} onClose={close}>
          <div className="px-6 py-5 flex flex-col gap-4">

            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-[#aaa] uppercase tracking-widest">教室資料</p>

              <Field label="教室名稱">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Studio A、多功能教室…" className={inputCls} />
              </Field>

              <Field label="容納人數">
                <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  placeholder="人" className={inputCls} />
              </Field>

              <Field label="狀態">
                <div className="flex gap-2">
                  {(["使用中", "維修中", "停用"] as const).map(s => (
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

            {/* Equipment */}
            <div className="border-t border-[#f5f5f5]" />
            <div className="flex flex-col gap-2.5">
              <p className="text-[11px] text-[#aaa] uppercase tracking-widest">設備</p>
              {form.equipment.length === 0 && <p className="text-xs text-[#ccc]">尚未新增</p>}
              <div className="flex flex-wrap gap-2">
                {form.equipment.map(e => (
                  <div key={e} className="flex items-center gap-1.5 bg-[#f5f5f5] text-[#555] text-sm px-3 py-1.5 rounded-lg">
                    <span>{e}</span>
                    <button onClick={() => removeEquip(e)} className="text-[#ccc] hover:text-red-400 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newEquip} onChange={e => setNewEquip(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addEquip()}
                  placeholder="新增設備…"
                  className="flex-1 px-3 py-2 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors" />
                <button onClick={addEquip}
                  className="px-3 py-2 bg-black text-white rounded-xl hover:bg-[#222] transition-colors shrink-0">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="border-t border-[#f5f5f5]" />
            <Field label="備註">
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="其他說明…" rows={3}
                className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black focus:bg-white transition-colors resize-none" />
            </Field>
          </div>

          <div className={`px-6 py-4 border-t border-[#f0f0f0] flex gap-2 ${drawer === "edit" ? "justify-between" : "justify-end"}`}>
            {drawer === "edit" && editing && (
              <button onClick={() => deleteClassroom(editing.id)}
                className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors px-3 py-2">
                <Trash2 size={14} />刪除教室
              </button>
            )}
            <div className="flex gap-2">
              <button onClick={close} className="px-4 py-2 text-sm border border-[#f0f0f0] rounded-xl hover:border-black transition-colors">
                取消
              </button>
              <button onClick={drawer === "add" ? saveAdd : saveEdit}
                className="px-5 py-2 text-sm bg-black text-white rounded-xl hover:bg-[#222] transition-colors">
                {drawer === "add" ? "建立教室" : "儲存"}
              </button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  )
}
