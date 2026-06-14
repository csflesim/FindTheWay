'use client'

import { useState } from "react"
import { Search, Plus, X, ChevronLeft, ChevronRight, CalendarDays, Trash2, Upload } from "lucide-react"

type Teacher = {
  id: number
  name: string
  specialty: string
  courses: number
  monthlyClasses: number
  attendanceRate: number
  joined: string
  status: "在職" | "休假中" | "離職"
  email?: string
  phone?: string
  bio?: string
  photo?: string
}

const INITIAL_TEACHERS: Teacher[] = [
  { id: 1, name: "小紫老師", specialty: "兒童創意・親子",  courses: 2, monthlyClasses: 8,  attendanceRate: 100, joined: "2023/06", status: "在職", email: "zico@findtheway.com",   phone: "0911-111-111", photo: "/image/purple.jpg" },
  { id: 2, name: "明德老師", specialty: "水彩・水墨・油畫", courses: 3, monthlyClasses: 12, attendanceRate: 96,  joined: "2023/09", status: "在職", email: "mingdez@findtheway.com", phone: "0922-222-222", photo: "/image/mingdez.jpg" },
]

type Course = { title: string; time: string; studio: string }
type ScheduleMap = Record<string, Course[]>

const scheduleByTeacher: Record<number, ScheduleMap> = {
  1: {
    "2026-06-07": [{ title: "兒童創意素描",  time: "14:00–15:30", studio: "A" }],
    "2026-06-08": [{ title: "親子藝術探索",  time: "14:00–15:30", studio: "B" }],
    "2026-06-14": [{ title: "兒童創意素描",  time: "14:00–15:30", studio: "A" }],
    "2026-06-15": [{ title: "親子藝術探索",  time: "14:00–15:30", studio: "B" }],
    "2026-06-21": [{ title: "兒童創意素描",  time: "14:00–15:30", studio: "A" }],
    "2026-06-22": [{ title: "親子藝術探索",  time: "14:00–15:30", studio: "B" }],
    "2026-06-28": [{ title: "兒童創意素描",  time: "14:00–15:30", studio: "A" }],
    "2026-06-29": [{ title: "親子藝術探索",  time: "14:00–15:30", studio: "B" }],
  },
  2: {
    "2026-06-06": [{ title: "基礎水彩入門",  time: "10:00–12:00", studio: "A" }],
    "2026-06-07": [{ title: "成人油畫工作坊", time: "19:00–21:00", studio: "B" }],
    "2026-06-10": [{ title: "水墨入門體驗",  time: "19:00–21:00", studio: "C" }],
    "2026-06-13": [{ title: "基礎水彩入門",  time: "10:00–12:00", studio: "A" }],
    "2026-06-14": [{ title: "成人油畫工作坊", time: "19:00–21:00", studio: "B" }],
    "2026-06-17": [{ title: "水墨入門體驗",  time: "19:00–21:00", studio: "C" }],
    "2026-06-20": [{ title: "基礎水彩入門",  time: "10:00–12:00", studio: "A" }],
    "2026-06-21": [{ title: "成人油畫工作坊", time: "19:00–21:00", studio: "B" }],
    "2026-06-24": [{ title: "水墨入門體驗",  time: "19:00–21:00", studio: "C" }],
    "2026-06-27": [{ title: "基礎水彩入門",  time: "10:00–12:00", studio: "A" }],
    "2026-06-28": [{ title: "成人油畫工作坊", time: "19:00–21:00", studio: "B" }],
  },
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"]
const MONTH_NAMES = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"]

function pad(n: number) { return String(n).padStart(2, "0") }
function dateKey(y: number, m: number, d: number) { return `${y}-${pad(m+1)}-${pad(d)}` }

function TeacherCalendarModal({ teacher, onClose }: { teacher: Teacher; onClose: () => void }) {
  const [year, setYear]   = useState(2026)
  const [month, setMonth] = useState(5)
  const [selected, setSelected] = useState<string | null>(null)

  const schedule = scheduleByTeacher[teacher.id] ?? {}
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] shrink-0">
          <div className="flex items-center gap-3">
            {teacher.photo
              ? <img src={teacher.photo} alt={teacher.name} className="w-8 h-8 rounded-full shrink-0 object-cover" />
              : <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-xs text-white font-medium shrink-0">{teacher.name.slice(0, 1)}</div>
            }
            <div>
              <p className="text-sm font-medium">{teacher.name} 的課表</p>
              <p className="text-xs text-[#999]">{teacher.specialty}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#bbb] hover:text-black transition-colors"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[#f5f5f5] transition-colors"><ChevronLeft size={16} /></button>
            <p className="text-sm font-medium">{year} 年 {MONTH_NAMES[month]}</p>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[#f5f5f5] transition-colors"><ChevronRight size={16} /></button>
          </div>

          <div className="grid grid-cols-7 px-4 mb-1">
            {WEEKDAYS.map(d => <div key={d} className="text-center text-[11px] text-[#bbb] py-1">{d}</div>)}
          </div>

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
                        <p className="text-xs text-[#999] mt-0.5">{c.time} · Studio {c.studio}</p>
                      </div>
                      <span className="text-[11px] bg-black text-white px-2.5 py-1 rounded-full">已排課</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
                        <p className="text-xs text-[#999] mt-0.5">{k.replace(/(\d{4})-(\d{2})-(\d{2})/, "$2/$3")} · {c.time} · Studio {c.studio}</p>
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

const statusStyle: Record<string, string> = {
  "在職":  "bg-black text-white",
  "休假中": "bg-[#fff3cd] text-[#856404]",
  "離職":  "bg-[#f5f5f5] text-[#999]",
}

const EMPTY_FORM = { name: "", specialty: "", email: "", phone: "", bio: "", status: "在職" as Teacher["status"], photo: "" }

export default function TeachersPage() {
  const [teachers, setTeachers]         = useState<Teacher[]>(INITIAL_TEACHERS)
  const [calendarTeacher, setCalendar]  = useState<Teacher | null>(null)
  const [drawer, setDrawer]             = useState<"add" | "edit" | null>(null)
  const [editing, setEditing]           = useState<Teacher | null>(null)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [nextId, setNextId]             = useState(10)

  function openAdd() { setForm(EMPTY_FORM); setDrawer("add") }

  function openEdit(t: Teacher) {
    setEditing(t)
    setForm({ name: t.name, specialty: t.specialty, email: t.email ?? "", phone: t.phone ?? "", bio: t.bio ?? "", status: t.status, photo: t.photo ?? "" })
    setDrawer("edit")
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setForm(f => ({ ...f, photo: reader.result as string }))
    reader.readAsDataURL(file)
  }

  function close() { setDrawer(null); setEditing(null) }

  function saveAdd() {
    if (!form.name.trim()) return
    const today = new Date()
    const joined = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}`
    setTeachers(prev => [...prev, {
      id: nextId, name: form.name, specialty: form.specialty, email: form.email,
      phone: form.phone, bio: form.bio, status: form.status, photo: form.photo || undefined,
      courses: 0, monthlyClasses: 0, attendanceRate: 100, joined,
    }])
    setNextId(n => n + 1)
    close()
  }

  function saveEdit() {
    if (!editing) return
    setTeachers(prev => prev.map(t => t.id === editing.id
      ? { ...t, name: form.name, specialty: form.specialty, email: form.email, phone: form.phone, bio: form.bio, status: form.status, photo: form.photo || undefined }
      : t
    ))
    close()
  }

  function deleteTeacher(id: number) {
    setTeachers(prev => prev.filter(t => t.id !== id))
    close()
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Teachers</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">教師管理</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-black text-white text-sm px-3 md:px-4 py-2 rounded-lg hover:bg-[#222] transition-colors">
          <Plus size={15} /><span className="hidden sm:inline">新增教師</span><span className="sm:hidden">新增</span>
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
        <input placeholder="搜尋教師姓名 / 專長…"
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black" />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
        <div className="grid grid-cols-[1.5fr_2fr_0.8fr_1fr_1fr_0.8fr_0.7fr_auto] gap-4 px-5 py-3 border-b border-[#f5f5f5] text-[11px] text-[#aaa] uppercase tracking-widest">
          <span>教師</span><span>專長</span><span>課程數</span><span>本月課堂</span><span>出席率</span><span>加入</span><span>狀態</span><span></span>
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {teachers.map((t) => (
            <div key={t.id} className="grid grid-cols-[1.5fr_2fr_0.8fr_1fr_1fr_0.8fr_0.7fr_auto] gap-4 items-center px-5 py-4">
              <div className="flex items-center gap-2.5">
                {t.photo
                  ? <img src={t.photo} alt={t.name} className="w-7 h-7 rounded-full shrink-0 object-cover" />
                  : <div className="w-7 h-7 bg-black rounded-full shrink-0 flex items-center justify-center text-[11px] text-white font-medium">{t.name.slice(0, 1)}</div>
                }
                <p className="text-sm font-medium">{t.name}</p>
              </div>
              <p className="text-xs text-[#999]">{t.specialty}</p>
              <p className="text-sm text-center">{t.courses}</p>
              <p className="text-sm text-center">{t.monthlyClasses} 堂</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
                  <div className="h-full bg-black rounded-full" style={{ width: `${t.attendanceRate}%` }} />
                </div>
                <span className="text-xs text-[#999] shrink-0">{t.attendanceRate}%</span>
              </div>
              <p className="text-xs text-[#999]">{t.joined}</p>
              <span className={`text-[11px] px-2.5 py-1 rounded-full w-fit ${statusStyle[t.status]}`}>{t.status}</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setCalendar(t)} className="flex items-center gap-1 text-xs text-[#999] hover:text-black transition-colors">
                  <CalendarDays size={13} />課表
                </button>
                <button onClick={() => openEdit(t)} className="text-xs text-[#999] hover:text-black">編輯</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {teachers.map((t) => (
          <div key={t.id} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                {t.photo
                  ? <img src={t.photo} alt={t.name} className="w-9 h-9 rounded-full shrink-0 object-cover" />
                  : <div className="w-9 h-9 bg-black rounded-full shrink-0 flex items-center justify-center text-sm text-white font-medium">{t.name.slice(0, 1)}</div>
                }
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-[#999]">{t.specialty}</p>
                </div>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full shrink-0 ${statusStyle[t.status]}`}>{t.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 py-3 border-t border-[#f5f5f5]">
              <div className="text-center">
                <p className="text-base font-medium">{t.courses}</p>
                <p className="text-[10px] text-[#aaa] mt-0.5">課程數</p>
              </div>
              <div className="text-center border-x border-[#f5f5f5]">
                <p className="text-base font-medium">{t.monthlyClasses}</p>
                <p className="text-[10px] text-[#aaa] mt-0.5">本月課堂</p>
              </div>
              <div className="text-center">
                <p className="text-base font-medium">{t.attendanceRate}%</p>
                <p className="text-[10px] text-[#aaa] mt-0.5">出席率</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-[#aaa]">加入 {t.joined}</p>
              <div className="flex gap-3">
                <button onClick={() => setCalendar(t)} className="flex items-center gap-1 text-xs text-[#999] hover:text-black">
                  <CalendarDays size={13} />課表
                </button>
                <button onClick={() => openEdit(t)} className="text-xs text-[#999] hover:text-black">編輯</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Calendar modal */}
      {calendarTeacher && (
        <TeacherCalendarModal teacher={calendarTeacher} onClose={() => setCalendar(null)} />
      )}

      {/* ── 新增 / 編輯 Drawer ── */}
      {drawer && (
        <Drawer title={drawer === "add" ? "新增教師" : "編輯教師"} onClose={close}>
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-[#aaa] uppercase tracking-widest">基本資料</p>

              <Field label="頭貼（1:1 建議尺寸：800 × 800 px）">
                <label className="block cursor-pointer group w-20">
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#e8e8e8] group-hover:border-black transition-colors overflow-hidden flex items-center justify-center bg-[#fafaf9]">
                    {form.photo ? (
                      <img src={form.photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload size={16} className="text-[#ccc]" />
                        <p className="text-[10px] text-[#bbb]">上傳</p>
                      </div>
                    )}
                  </div>
                </label>
              </Field>

              <Field label="姓名">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="老師姓名" className={inputCls} />
              </Field>

              <Field label="專長">
                <input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                  placeholder="水彩・油畫…" className={inputCls} />
              </Field>

              <Field label="Email">
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="teacher@findtheway.com" className={inputCls} />
              </Field>

              <Field label="電話">
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="09xx-xxx-xxx" className={inputCls} />
              </Field>

              <Field label="簡介">
                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="老師的教學理念、經歷…" rows={3}
                  className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black focus:bg-white transition-colors resize-none" />
              </Field>

              <Field label="狀態">
                <div className="flex gap-2">
                  {(["在職", "休假中", "離職"] as const).map(s => (
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
          </div>

          <div className={`px-6 py-4 border-t border-[#f0f0f0] flex gap-2 ${drawer === "edit" ? "justify-between" : "justify-end"}`}>
            {drawer === "edit" && editing && (
              <button onClick={() => deleteTeacher(editing.id)}
                className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors px-3 py-2">
                <Trash2 size={14} />刪除教師
              </button>
            )}
            <div className="flex gap-2">
              <button onClick={close} className="px-4 py-2 text-sm border border-[#f0f0f0] rounded-xl hover:border-black transition-colors">
                取消
              </button>
              <button onClick={drawer === "add" ? saveAdd : saveEdit}
                className="px-5 py-2 text-sm bg-black text-white rounded-xl hover:bg-[#222] transition-colors">
                {drawer === "add" ? "建立教師" : "儲存"}
              </button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  )
}
