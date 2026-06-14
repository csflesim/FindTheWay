'use client'

import { useState } from "react"
import { Plus, Search, X, Trash2, ClipboardList, ChevronLeft, ChevronRight, Upload, CalendarDays } from "lucide-react"

type AttendRecord = { name: string; status: "出席" | "請假" | "缺席" }
type Session = { date: string; records: AttendRecord[] }

const ATTENDANCE_DATA: Record<number, Session[]> = {
  7: [
    {
      date: "2026/06/10", records: [
        { name: "陳小安", status: "出席" },
        { name: "王小明", status: "出席" },
        { name: "李小華", status: "請假" },
        { name: "林小雅", status: "出席" },
      ]
    },
    {
      date: "2026/06/03", records: [
        { name: "陳小安", status: "出席" },
        { name: "王小明", status: "缺席" },
        { name: "李小華", status: "出席" },
        { name: "林小雅", status: "出席" },
      ]
    },
    {
      date: "2026/05/27", records: [
        { name: "陳小安", status: "出席" },
        { name: "王小明", status: "出席" },
        { name: "李小華", status: "出席" },
        { name: "林小雅", status: "缺席" },
      ]
    },
  ],
  8: [
    {
      date: "2026/06/08", records: [
        { name: "賴小柏", status: "出席" },
        { name: "賴小紫", status: "出席" },
        { name: "陳小安", status: "請假" },
      ]
    },
    {
      date: "2026/06/01", records: [
        { name: "賴小柏", status: "出席" },
        { name: "賴小紫", status: "缺席" },
        { name: "陳小安", status: "出席" },
      ]
    },
  ],
}

type Course = {
  id: number
  title: string
  types: ("內部" | "外部")[]
  teachers: string[]
  schedule: string
  status: "開課中" | "草稿" | "已結束"
  visible: boolean
  imgSquare?: string
  imgLandscape?: string
  // 內部
  studio?: string
  enrolled?: number
  capacity?: number
  ticketTypes?: string[]
  // 外部
  partner?: string
  subUnit?: string
  location?: string
  notes?: string
  // 前台內容
  desc?: string
  highlights?: string[]
}

const INITIAL_COURSES: Course[] = [
  { id: 1, title: "基礎水彩入門", types: ["內部"], teachers: ["小紫老師", "明德老師"], schedule: "每週六 10:00–12:00", studio: "A", enrolled: 8, capacity: 10, status: "開課中", visible: true, imgSquare: "/image/watercolor800x800.png", imgLandscape: "/image/watercolor1200x400.png" },
  { id: 2, title: "成人油畫工作坊", types: ["內部"], teachers: ["小紫老師", "明德老師"], schedule: "每週五 19:00–21:00", studio: "B", enrolled: 6, capacity: 8, status: "開課中", visible: true, imgSquare: "/image/oilpainting800x800.png", imgLandscape: "/image/oilpainting1200x400.png" },
  { id: 3, title: "兒童創意素描", types: ["內部"], teachers: ["小紫老師", "明德老師"], schedule: "每週日 14:00–15:30", studio: "A", enrolled: 9, capacity: 10, status: "開課中", visible: true, imgSquare: "/image/sketch800x800.png", imgLandscape: "/image/sketch1200x400.png" },
  { id: 4, title: "親子藝術探索", types: ["內部"], teachers: ["小紫老師", "明德老師"], schedule: "每週六 14:00–15:30", studio: "B", enrolled: 4, capacity: 8, status: "開課中", visible: true, imgSquare: "/image/FamilyArt800x800.png", imgLandscape: "/image/FamilyArt1200x400.png" },
  { id: 5, title: "水墨入門體驗", types: ["內部"], teachers: ["小紫老師", "明德老師"], schedule: "每週三 19:00–21:00", studio: "C", enrolled: 5, capacity: 8, status: "開課中", visible: true, imgSquare: "/image/inkpainting800x800.png", imgLandscape: "/image/inkpainting1200x400.png" },
  { id: 6, title: "進階油畫技法", types: ["內部"], teachers: ["明德老師"], schedule: "待排課", studio: "–", enrolled: 0, capacity: 8, status: "草稿", visible: false },
  { id: 7, title: "兒童水彩啟蒙", types: ["外部"], teachers: ["小紫老師"], schedule: "每週二 15:00–16:30", partner: "大安國小", subUnit: "美術班", location: "美術教室", status: "開課中", visible: true },
  { id: 8, title: "親子創意手作", types: ["內部", "外部"], teachers: ["小紫老師", "明德老師"], schedule: "每週日 10:00–12:00", studio: "B", enrolled: 5, capacity: 8, partner: "社區發展協會", subUnit: "親子班", location: "工作坊", status: "開課中", visible: true },
]

const TIMES: string[] = (() => {
  const t: string[] = []
  for (let h = 6; h <= 22; h++) {
    t.push(`${String(h).padStart(2, "0")}:00`)
    if (h < 22) t.push(`${String(h).padStart(2, "0")}:30`)
  }
  return t
})()

function parseSchedule(s: string) {
  const weekly = s.match(/每週([日一二三四五六]) (\d{2}:\d{2})–(\d{2}:\d{2})/)
  if (weekly) return { scheduleType: "固定週期" as const, scheduleDay: weekly[1], scheduleDate: "", scheduleStart: weekly[2], scheduleEnd: weekly[3] }
  const single = s.match(/(\d{4}\/\d{2}\/\d{2}) (\d{2}:\d{2})–(\d{2}:\d{2})/)
  if (single) return { scheduleType: "單堂課" as const, scheduleDay: "", scheduleDate: single[1].replace(/\//g, "-"), scheduleStart: single[2], scheduleEnd: single[3] }
  return { scheduleType: "固定週期" as const, scheduleDay: "", scheduleDate: "", scheduleStart: "10:00", scheduleEnd: "12:00" }
}

function buildSchedule(f: { scheduleType: string; scheduleDay: string; scheduleDate: string; scheduleStart: string; scheduleEnd: string }) {
  if (f.scheduleType === "固定週期") {
    if (!f.scheduleDay) return "待排課"
    return `每週${f.scheduleDay} ${f.scheduleStart}–${f.scheduleEnd}`
  }
  if (!f.scheduleDate) return "待排課"
  return `${f.scheduleDate.replace(/-/g, "/")} ${f.scheduleStart}–${f.scheduleEnd}`
}

const TEACHERS = ["小紫老師", "明德老師"]

// ── Teacher schedule data ────────────────────────────
type TCourse = { title: string; time: string; studio: string }
type TSchedule = Record<string, TCourse[]>

const TEACHER_SCHEDULE: Record<string, TSchedule> = {
  "小紫老師": {
    "2026-06-07": [{ title: "兒童創意素描",  time: "14:00–15:30", studio: "A" }],
    "2026-06-08": [{ title: "親子藝術探索",  time: "14:00–15:30", studio: "B" }],
    "2026-06-14": [{ title: "兒童創意素描",  time: "14:00–15:30", studio: "A" }],
    "2026-06-15": [{ title: "親子藝術探索",  time: "14:00–15:30", studio: "B" }],
    "2026-06-21": [{ title: "兒童創意素描",  time: "14:00–15:30", studio: "A" }],
    "2026-06-22": [{ title: "親子藝術探索",  time: "14:00–15:30", studio: "B" }],
    "2026-06-28": [{ title: "兒童創意素描",  time: "14:00–15:30", studio: "A" }],
    "2026-06-29": [{ title: "親子藝術探索",  time: "14:00–15:30", studio: "B" }],
  },
  "明德老師": {
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

const WEEKDAYS_SHORT = ["日","一","二","三","四","五","六"]
function tpad(n: number) { return String(n).padStart(2,"0") }
function dkey(y: number, m: number, d: number) { return `${y}-${tpad(m+1)}-${tpad(d)}` }

function TeacherScheduleModal({ name, onClose }: { name: string; onClose: () => void }) {
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(5)
  const [sel, setSel] = useState<string | null>(null)
  const schedule = TEACHER_SCHEDULE[name] ?? {}
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  function prev() { if (month === 0) { setYear(y => y-1); setMonth(11) } else setMonth(m => m-1); setSel(null) }
  function next() { if (month === 11) { setYear(y => y+1); setMonth(0)  } else setMonth(m => m+1); setSel(null) }

  const selCourses = sel ? (schedule[sel] ?? []) : []

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] shrink-0">
          <div>
            <p className="text-sm font-medium">{name} 的課表</p>
          </div>
          <button onClick={onClose} className="text-[#bbb] hover:text-black"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 pb-4">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <button onClick={prev} className="p-1.5 rounded-lg hover:bg-[#f5f5f5]"><ChevronLeft size={15} /></button>
            <p className="text-sm font-medium">{year} 年 {month + 1} 月</p>
            <button onClick={next} className="p-1.5 rounded-lg hover:bg-[#f5f5f5]"><ChevronRight size={15} /></button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 px-4 mb-1">
            {WEEKDAYS_SHORT.map(d => <div key={d} className="text-center text-[10px] text-[#bbb] py-1">{d}</div>)}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 px-4 gap-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const k = dkey(year, month, day)
              const courses = schedule[k] ?? []
              const isSelected = sel === k
              return (
                <button key={i} onClick={() => setSel(isSelected ? null : k)}
                  className={`rounded-xl p-1 min-h-[44px] flex flex-col items-center transition-colors ${
                    isSelected ? "bg-black text-white" : courses.length ? "bg-[#f5f5f5] hover:bg-[#ebebeb]" : "hover:bg-[#f9f9f9]"
                  }`}>
                  <span className={`text-[11px] font-medium mb-0.5 ${isSelected ? "text-white" : courses.length ? "text-black" : "text-[#aaa]"}`}>{day}</span>
                  {courses.slice(0, 1).map((c, ci) => (
                    <span key={ci} className={`w-full text-center text-[8px] leading-tight px-0.5 py-0.5 rounded truncate ${
                      isSelected ? "bg-white/20 text-white" : "bg-black text-white"
                    }`}>{c.time.split("–")[0]}</span>
                  ))}
                  {courses.length > 1 && <span className={`text-[8px] ${isSelected ? "text-white/70" : "text-[#999]"}`}>+{courses.length - 1}</span>}
                </button>
              )
            })}
          </div>

          {/* Selected day detail */}
          {sel && (
            <div className="mx-4 mt-3 rounded-xl border border-[#f0f0f0] overflow-hidden">
              <div className="px-4 py-2.5 bg-[#f9f9f9] border-b border-[#f0f0f0]">
                <p className="text-xs font-medium text-[#666]">{sel.replace(/(\d{4})-(\d{2})-(\d{2})/, "$2/$3")}</p>
              </div>
              {selCourses.length === 0 ? (
                <p className="px-4 py-3 text-sm text-[#aaa]">無課程</p>
              ) : selCourses.map((c, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 border-t first:border-t-0 border-[#f5f5f5]">
                  <div>
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-[#999] mt-0.5">{c.time} · Studio {c.studio}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
const STUDIOS = ["A", "B", "C"]
const TICKET_TYPES = ["通用課堂券", "兒童課堂券", "成人課堂券", "體驗券"]
const UNITS = [
  { name: "大安國小", subUnits: [{ name: "美術班", location: "美術教室" }, { name: "一年甲班", location: "活動中心" }, { name: "二年甲班", location: "體育館" }] },
  { name: "社區發展協會", subUnits: [{ name: "長青班", location: "社區活動中心" }, { name: "親子班", location: "工作坊" }] },
]

const statusStyle: Record<string, string> = {
  "開課中": "bg-black text-white",
  "草稿": "bg-[#f5f5f5] text-[#999]",
  "已結束": "bg-[#f5f5f5] text-[#999]",
}

// ── Drawer ──────────────────────────────────────────

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

const EMPTY_FORM = {
  title: "", types: ["內部"] as ("內部" | "外部")[], teachers: [] as string[],
  scheduleType: "固定週期" as "固定週期" | "單堂課",
  scheduleDay: "", scheduleDate: "", scheduleStart: "10:00", scheduleEnd: "12:00",
  status: "草稿" as Course["status"],
  studio: "A", enrolled: 0, capacity: 10, ticketTypes: [] as string[], visible: true,
  imgSquare: "", imgLandscape: "",
  partner: "", subUnit: "", location: "", notes: "",
  desc: "", highlights: "",
}

// ── Teacher multi-select (with schedule modal) ───────

function TeacherMultiSelect({ selected, onChange }: {
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [scheduleFor, setScheduleFor] = useState<string | null>(null)

  function toggle(o: string) {
    onChange(selected.includes(o) ? selected.filter(s => s !== o) : [...selected, o])
  }

  return (
    <>
      <div className="relative">
        <button type="button" onClick={() => setOpen(v => !v)}
          className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none text-left flex items-center justify-between hover:border-black transition-colors">
          <span className={selected.length === 0 ? "text-[#bbb]" : ""}>
            {selected.length === 0 ? "選擇教師…" : selected.join("、")}
          </span>
          <ChevronRight size={14} className={`text-[#bbb] transition-transform ${open ? "rotate-90" : ""}`} />
        </button>
        {open && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-[#f0f0f0] rounded-xl shadow-lg overflow-hidden">
            <div className="max-h-48 overflow-y-auto">
              {TEACHERS.map(o => (
                <div key={o} className="flex items-center px-4 py-2.5 hover:bg-[#f9f9f9] transition-colors">
                  <button type="button" onClick={() => toggle(o)} className="flex items-center gap-3 flex-1 text-left text-sm">
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected.includes(o) ? "bg-black border-black" : "border-[#ddd]"}`}>
                      {selected.includes(o) && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </span>
                    {o}
                  </button>
                  <button type="button"
                    onClick={e => { e.stopPropagation(); setScheduleFor(o); setOpen(false) }}
                    className="text-[#bbb] hover:text-black transition-colors ml-2 shrink-0 flex items-center gap-1 text-[11px]">
                    <CalendarDays size={13} />課表
                  </button>
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-[#f5f5f5]">
              <button type="button" onClick={() => setOpen(false)}
                className="w-full py-1.5 text-xs text-[#999] hover:text-black transition-colors">確認</button>
            </div>
          </div>
        )}
      </div>
      {scheduleFor && <TeacherScheduleModal name={scheduleFor} onClose={() => setScheduleFor(null)} />}
    </>
  )
}

// ── Multi-select dropdown ────────────────────────────

function MultiSelect({ options, selected, onChange, placeholder }: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const filtered = options.filter(o => o.includes(query))

  function toggle(o: string) {
    onChange(selected.includes(o) ? selected.filter(s => s !== o) : [...selected, o])
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none text-left flex items-center justify-between hover:border-black transition-colors">
        <span className={selected.length === 0 ? "text-[#bbb]" : ""}>
          {selected.length === 0 ? placeholder : selected.join("、")}
        </span>
        <ChevronRight size={14} className={`text-[#bbb] transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-[#f0f0f0] rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-[#f5f5f5]">
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder="搜尋…"
              className="w-full px-3 py-2 text-sm bg-[#f9f9f9] rounded-lg outline-none" />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && <p className="px-4 py-3 text-sm text-[#ccc]">無結果</p>}
            {filtered.map(o => (
              <button key={o} type="button" onClick={() => toggle(o)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[#f9f9f9] transition-colors text-left">
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected.includes(o) ? "bg-black border-black" : "border-[#ddd]"
                  }`}>
                  {selected.includes(o) && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </span>
                {o}
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-[#f5f5f5]">
            <button type="button" onClick={() => setOpen(false)}
              className="w-full py-1.5 text-xs text-[#999] hover:text-black transition-colors">
              確認
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Enrollment bar ──────────────────────────────────

function EnrollBar({ enrolled, capacity }: { enrolled: number; capacity: number }) {
  const pct = capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
        <div className="h-full bg-black rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-[#999] shrink-0">{enrolled}/{capacity}</span>
    </div>
  )
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES)
  const [drawer, setDrawer] = useState<"add" | "edit" | null>(null)
  const [editing, setEditing] = useState<Course | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [nextId, setNextId] = useState(20)
  const [attendCourse, setAttendCourse] = useState<Course | null>(null)
  const [attendance, setAttendance] = useState<Record<number, Session[]>>(ATTENDANCE_DATA)
  const [sessionIdx, setSessionIdx] = useState(0)
  const [newName, setNewName] = useState("")

  const internal = courses.filter(c => c.types.includes("內部"))
  const external = courses.filter(c => c.types.includes("外部"))

  function handleImageChange(key: "imgSquare" | "imgLandscape", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setForm(f => ({ ...f, [key]: reader.result as string }))
    reader.readAsDataURL(file)
  }

  function openAdd() { setForm(EMPTY_FORM); setDrawer("add") }

  function openEdit(c: Course) {
    setEditing(c)
    const parsed = parseSchedule(c.schedule)
    setForm({
      title: c.title, types: c.types, teachers: c.teachers,
      ...parsed,
      status: c.status,
      studio: c.studio ?? "A", enrolled: c.enrolled ?? 0, capacity: c.capacity ?? 10, ticketTypes: c.ticketTypes ?? [], visible: c.visible,
      imgSquare: c.imgSquare ?? "", imgLandscape: c.imgLandscape ?? "",
      partner: c.partner ?? "", subUnit: c.subUnit ?? "", location: c.location ?? "", notes: c.notes ?? "",
      desc: c.desc ?? "", highlights: (c.highlights ?? []).join("\n"),
    })
    setDrawer("edit")
  }

  function close() { setDrawer(null); setEditing(null) }

  function toggleType(t: "內部" | "外部") {
    setForm(f => {
      const has = f.types.includes(t)
      const next = has ? f.types.filter(x => x !== t) : [...f.types, t]
      return { ...f, types: next.length === 0 ? [t] : next }
    })
  }

  function saveAdd() {
    if (!form.title.trim()) return
    const c: Course = {
      id: nextId, title: form.title, types: form.types, teachers: form.teachers,
      schedule: buildSchedule(form), status: form.status, visible: form.visible,
      ...(form.types.includes("內部") ? { studio: form.studio, enrolled: form.enrolled, capacity: form.capacity, ticketTypes: form.ticketTypes } : {}),
      ...(form.types.includes("外部") ? { partner: form.partner, subUnit: form.subUnit, location: form.location } : {}),
      notes: form.notes,
      desc: form.desc,
      highlights: form.highlights.split("\n").map(s => s.trim()).filter(Boolean),
    }
    setCourses(prev => [...prev, c])
    setNextId(n => n + 1)
    close()
  }

  function saveEdit() {
    if (!editing) return
    setCourses(prev => prev.map(c => c.id === editing.id ? {
      ...c, title: form.title, types: form.types, teachers: form.teachers,
      schedule: buildSchedule(form), status: form.status, visible: form.visible,
      studio: form.studio, enrolled: form.enrolled, capacity: form.capacity, ticketTypes: form.ticketTypes,
      partner: form.partner, subUnit: form.subUnit, location: form.location, notes: form.notes,
      desc: form.desc,
      highlights: form.highlights.split("\n").map(s => s.trim()).filter(Boolean),
    } : c))
    close()
  }

  function deleteCourse(id: number) {
    setCourses(prev => prev.filter(c => c.id !== id))
    close()
  }

  function openAttend(c: Course) {
    setAttendCourse(c)
    setSessionIdx(0)
    setNewName("")
    if (!attendance[c.id]) {
      setAttendance(prev => ({ ...prev, [c.id]: [] }))
    }
  }

  function closeAttend() { setAttendCourse(null) }

  function addSession(courseId: number) {
    const today = new Date()
    const date = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`
    setAttendance(prev => ({
      ...prev,
      [courseId]: [{ date, records: [] }, ...(prev[courseId] ?? [])],
    }))
    setSessionIdx(0)
  }

  function setStatus(courseId: number, sidx: number, name: string, status: AttendRecord["status"]) {
    setAttendance(prev => {
      const sessions = prev[courseId] ? [...prev[courseId]] : []
      const session = { ...sessions[sidx], records: sessions[sidx].records.map(r => r.name === name ? { ...r, status } : r) }
      sessions[sidx] = session
      return { ...prev, [courseId]: sessions }
    })
  }

  function addRecord(courseId: number, sidx: number) {
    if (!newName.trim()) return
    setAttendance(prev => {
      const sessions = prev[courseId] ? [...prev[courseId]] : []
      const session = { ...sessions[sidx], records: [...sessions[sidx].records, { name: newName.trim(), status: "出席" as const }] }
      sessions[sidx] = session
      return { ...prev, [courseId]: sessions }
    })
    setNewName("")
  }

  function removeRecord(courseId: number, sidx: number, name: string) {
    setAttendance(prev => {
      const sessions = [...(prev[courseId] ?? [])]
      sessions[sidx] = { ...sessions[sidx], records: sessions[sidx].records.filter(r => r.name !== name) }
      return { ...prev, [courseId]: sessions }
    })
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Courses</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">課程管理</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-black text-white text-sm px-3 md:px-4 py-2 rounded-lg hover:bg-[#222] transition-colors">
          <Plus size={15} /><span className="hidden sm:inline">新增課程</span><span className="sm:hidden">新增</span>
        </button>
      </div>

      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
        <input placeholder="搜尋課程名稱 / 教師…"
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black" />
      </div>

      <div className="flex flex-col gap-5">

        {/* ── 內部課程 ── */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[#f5f5f5]">
            <p className="text-xs font-medium text-[#555]">內部課程</p>
            <span className="text-[11px] bg-[#f5f5f5] text-[#aaa] px-1.5 py-0.5 rounded-full">{internal.length}</span>
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[2fr_1fr_2fr_0.6fr_1.2fr_0.8fr_auto] gap-4 px-5 py-2.5 text-[11px] text-[#bbb] uppercase tracking-widest border-b border-[#f9f9f9]">
              <span>課程</span><span>教師</span><span>時間</span><span>教室</span><span>報名</span><span>狀態</span><span></span>
            </div>
            <div className="divide-y divide-[#f9f9f9]">
              {internal.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無內部課程</p>}
              {internal.map((c) => (
                <div key={c.id} className="grid grid-cols-[2fr_1fr_2fr_0.6fr_1.2fr_0.8fr_auto] gap-4 items-center px-5 py-4">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    {c.types.includes("外部") && <span className="text-[10px] bg-[#e8f4fd] text-[#1a6fa8] px-1.5 py-0.5 rounded-full shrink-0">外部</span>}
                    {!c.visible && <span className="text-[10px] bg-[#f5f5f5] text-[#bbb] px-1.5 py-0.5 rounded-full shrink-0">隱藏</span>}
                  </div>
                  <p className="text-sm text-[#666]">{c.teachers.join("、")}</p>
                  <p className="text-xs text-[#999]">{c.schedule}</p>
                  <p className="text-xs text-[#999]">Studio {c.studio}</p>
                  <EnrollBar enrolled={c.enrolled ?? 0} capacity={c.capacity ?? 0} />
                  <span className={`text-[11px] px-2.5 py-1 rounded-full w-fit ${statusStyle[c.status]}`}>{c.status}</span>
                  <button onClick={() => openEdit(c)} className="text-xs text-[#999] hover:text-black">編輯</button>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-[#f9f9f9]">
            {internal.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無內部課程</p>}
            {internal.map((c) => (
              <div key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">{c.title}</p>
                    {c.types.includes("外部") && <span className="text-[10px] bg-[#e8f4fd] text-[#1a6fa8] px-1.5 py-0.5 rounded-full shrink-0">外部</span>}
                    {!c.visible && <span className="text-[10px] bg-[#f5f5f5] text-[#bbb] px-1.5 py-0.5 rounded-full shrink-0">隱藏</span>}
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full shrink-0 ${statusStyle[c.status]}`}>{c.status}</span>
                </div>
                <p className="text-xs text-[#999]">{c.teachers.join("、")} · Studio {c.studio} · {c.schedule}</p>
                <div className="flex items-center gap-2 mt-3">
                  <EnrollBar enrolled={c.enrolled ?? 0} capacity={c.capacity ?? 0} />
                  <button onClick={() => openEdit(c)} className="text-xs text-[#999] hover:text-black ml-1">編輯</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 外部課程 ── */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[#f5f5f5]">
            <p className="text-xs font-medium text-[#555]">外部課程</p>
            <span className="text-[11px] bg-[#f5f5f5] text-[#aaa] px-1.5 py-0.5 rounded-full">{external.length}</span>
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[2fr_1fr_2fr_1.5fr_1.5fr_0.8fr_auto] gap-4 px-5 py-2.5 text-[11px] text-[#bbb] uppercase tracking-widest border-b border-[#f9f9f9]">
              <span>課程</span><span>教師</span><span>時間</span><span>合作單位</span><span>地點</span><span>狀態</span><span></span>
            </div>
            <div className="divide-y divide-[#f9f9f9]">
              {external.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無外部課程</p>}
              {external.map((c) => (
                <div key={c.id} className="grid grid-cols-[2fr_1fr_2fr_1.5fr_1.5fr_0.8fr_auto] gap-4 items-center px-5 py-4">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    {c.types.includes("內部") && <span className="text-[10px] bg-[#f0f0f0] text-[#555] px-1.5 py-0.5 rounded-full shrink-0">內部</span>}
                    {!c.visible && <span className="text-[10px] bg-[#f5f5f5] text-[#bbb] px-1.5 py-0.5 rounded-full shrink-0">隱藏</span>}
                  </div>
                  <p className="text-sm text-[#666]">{c.teachers.join("、")}</p>
                  <p className="text-xs text-[#999]">{c.schedule}</p>
                  <p className="text-xs text-[#666] truncate">{c.partner ?? "—"}</p>
                  <p className="text-xs text-[#999] truncate">
                    {[c.subUnit, c.location].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full w-fit ${statusStyle[c.status]}`}>{c.status}</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => openAttend(c)} className="flex items-center gap-1 text-xs text-[#999] hover:text-black transition-colors">
                      <ClipboardList size={13} />點名
                    </button>
                    <button onClick={() => openEdit(c)} className="text-xs text-[#999] hover:text-black">編輯</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-[#f9f9f9]">
            {external.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無外部課程</p>}
            {external.map((c) => (
              <div key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">{c.title}</p>
                    {c.types.includes("內部") && <span className="text-[10px] bg-[#f0f0f0] text-[#555] px-1.5 py-0.5 rounded-full shrink-0">內部</span>}
                    {!c.visible && <span className="text-[10px] bg-[#f5f5f5] text-[#bbb] px-1.5 py-0.5 rounded-full shrink-0">隱藏</span>}
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full shrink-0 ${statusStyle[c.status]}`}>{c.status}</span>
                </div>
                <p className="text-xs text-[#999]">{c.teachers.join("、")} · {c.schedule}</p>
                <div className="flex gap-4 mt-2">
                  <div>
                    <p className="text-[10px] text-[#bbb]">合作單位</p>
                    <p className="text-xs text-[#666] mt-0.5">{c.partner ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#bbb]">地點</p>
                    <p className="text-xs text-[#999] mt-0.5">
                      {[c.subUnit, c.location].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-2">
                  <button onClick={() => openAttend(c)} className="flex items-center gap-1 text-xs text-[#999] hover:text-black">
                    <ClipboardList size={13} />點名
                  </button>
                  <button onClick={() => openEdit(c)} className="text-xs text-[#999] hover:text-black">編輯</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── 新增 / 編輯 Drawer ── */}
      {drawer && (
        <Drawer title={drawer === "add" ? "新增課程" : "編輯課程"} onClose={close}>
          <div className="px-6 py-5 flex flex-col gap-4">

            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-[#aaa] uppercase tracking-widest">基本資料</p>

              <Field label="課程名稱">
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="課程名稱" className={inputCls} />
              </Field>

              <Field label="課程類別（可複選）">
                <div className="flex gap-2">
                  {(["內部", "外部"] as const).map(t => (
                    <button key={t} onClick={() => toggleType(t)}
                      className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${form.types.includes(t) ? "bg-black text-white border-black" : "bg-white text-[#666] border-[#f0f0f0] hover:border-black"
                        }`}>
                      {t}課程
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="教師">
                <TeacherMultiSelect
                  selected={form.teachers}
                  onChange={v => setForm(f => ({ ...f, teachers: v }))}
                />
              </Field>

              <Field label="上課時間">
                <div className="flex flex-col gap-3">
                  {/* Type toggle */}
                  <div className="flex gap-2">
                    {(["固定週期", "單堂課"] as const).map(t => (
                      <button key={t} type="button"
                        onClick={() => setForm(f => ({ ...f, scheduleType: t, scheduleDay: "", scheduleDate: "" }))}
                        className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${form.scheduleType === t ? "bg-black text-white border-black" : "bg-white text-[#666] border-[#f0f0f0] hover:border-black"
                          }`}>
                        {t}
                      </button>
                    ))}
                  </div>

                  {form.scheduleType === "固定週期" ? (
                    <>
                      <div>
                        <p className="text-[11px] text-[#bbb] mb-1.5">星期</p>
                        <div className="flex gap-1">
                          {["日", "一", "二", "三", "四", "五", "六"].map(d => (
                            <button key={d} type="button"
                              onClick={() => setForm(f => ({ ...f, scheduleDay: d }))}
                              className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${form.scheduleDay === d ? "bg-black text-white border-black" : "bg-white text-[#555] border-[#f0f0f0] hover:border-black"
                                }`}>
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <p className="text-[11px] text-[#bbb] mb-1.5">開始</p>
                          <select value={form.scheduleStart}
                            onChange={e => setForm(f => ({ ...f, scheduleStart: e.target.value }))}
                            className={inputCls}>
                            {TIMES.map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <p className="text-[#bbb] pb-2.5">–</p>
                        <div className="flex-1">
                          <p className="text-[11px] text-[#bbb] mb-1.5">結束</p>
                          <select value={form.scheduleEnd}
                            onChange={e => setForm(f => ({ ...f, scheduleEnd: e.target.value }))}
                            className={inputCls}>
                            {TIMES.map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-[11px] text-[#bbb] mb-1.5">日期</p>
                        <input type="date" value={form.scheduleDate}
                          onChange={e => setForm(f => ({ ...f, scheduleDate: e.target.value }))}
                          className={inputCls} />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <p className="text-[11px] text-[#bbb] mb-1.5">開始</p>
                          <select value={form.scheduleStart}
                            onChange={e => setForm(f => ({ ...f, scheduleStart: e.target.value }))}
                            className={inputCls}>
                            {TIMES.map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <p className="text-[#bbb] pb-2.5">–</p>
                        <div className="flex-1">
                          <p className="text-[11px] text-[#bbb] mb-1.5">結束</p>
                          <select value={form.scheduleEnd}
                            onChange={e => setForm(f => ({ ...f, scheduleEnd: e.target.value }))}
                            className={inputCls}>
                            {TIMES.map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Field>

              <Field label="狀態">
                <div className="flex gap-2">
                  {(["草稿", "開課中", "已結束"] as const).map(s => (
                    <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))}
                      className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${form.status === s ? "bg-black text-white border-black" : "bg-white text-[#666] border-[#f0f0f0] hover:border-black"
                        }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="前台顯示">
                <div className="flex gap-2">
                  {([true, false] as const).map(v => (
                    <button key={String(v)} onClick={() => setForm(f => ({ ...f, visible: v }))}
                      className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${form.visible === v ? "bg-black text-white border-black" : "bg-white text-[#666] border-[#f0f0f0] hover:border-black"
                        }`}>
                      {v ? "顯示" : "隱藏"}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="課程圖片">
                <div className="flex flex-col gap-3">
                  {/* 橫圖 */}
                  <div>
                    <p className="text-[11px] text-[#bbb] mb-1.5">橫圖（課程列表封面）<span className="ml-1 text-[#ccc]">比例：3:1 建議尺寸：1200 × 400 px</span></p>
                    <label className="block cursor-pointer group">
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => handleImageChange("imgLandscape", e)} />
                      <div className="w-full h-28 rounded-xl border-2 border-dashed border-[#e8e8e8] group-hover:border-black transition-colors overflow-hidden flex items-center justify-center bg-[#fafaf9]">
                        {form.imgLandscape ? (
                          <img src={form.imgLandscape} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Upload size={16} className="text-[#ccc]" />
                            <p className="text-[10px] text-[#bbb]">點擊上傳</p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                  {/* 方圖 */}
                  <div>
                    <p className="text-[11px] text-[#bbb] mb-1.5">方圖（首頁縮圖）<span className="ml-1 text-[#ccc]">比例：1:1 建議尺寸：800 × 800 px</span></p>
                    <label className="block cursor-pointer group w-24">
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => handleImageChange("imgSquare", e)} />
                      <div className="w-24 h-24 rounded-xl border-2 border-dashed border-[#e8e8e8] group-hover:border-black transition-colors overflow-hidden flex items-center justify-center bg-[#fafaf9]">
                        {form.imgSquare ? (
                          <img src={form.imgSquare} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Upload size={16} className="text-[#ccc]" />
                            <p className="text-[10px] text-[#bbb]">點擊上傳</p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </Field>
            </div>

            {/* 課程內容 */}
            <div className="border-t border-[#f5f5f5]" />
            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-[#aaa] uppercase tracking-widest">課程內容</p>
              <Field label="課程介紹">
                <textarea
                  value={form.desc}
                  onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
                  placeholder="課程說明文字…"
                  rows={4}
                  className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black focus:bg-white transition-colors resize-none"
                />
              </Field>
              <Field label="課程重點（每行一項）">
                <textarea
                  value={form.highlights}
                  onChange={e => setForm(f => ({ ...f, highlights: e.target.value }))}
                  placeholder={"基礎調色技法\n濕畫法與乾畫法\n簡單靜物練習"}
                  rows={4}
                  className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black focus:bg-white transition-colors resize-none"
                />
              </Field>
            </div>

            {/* 內部 fields */}
            {form.types.includes("內部") && (
              <>
                <div className="border-t border-[#f5f5f5]" />
                <div className="flex flex-col gap-3">
                  <p className="text-[11px] text-[#aaa] uppercase tracking-widest">內部課程設定</p>

                  <Field label="教室">
                    <select value={form.studio} onChange={e => setForm(f => ({ ...f, studio: e.target.value }))}
                      className={inputCls}>
                      {STUDIOS.map(s => <option key={s}>Studio {s}</option>)}
                    </select>
                  </Field>

                  <Field label="可使用課堂券（可複選）">
                    <MultiSelect
                      options={TICKET_TYPES}
                      selected={form.ticketTypes}
                      onChange={v => setForm(f => ({ ...f, ticketTypes: v }))}
                      placeholder="選擇可用券別…"
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="已報名">
                      <input type="number" value={form.enrolled} onChange={e => setForm(f => ({ ...f, enrolled: parseInt(e.target.value) || 0 }))}
                        className={inputCls} />
                    </Field>
                    <Field label="人數上限">
                      <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 0 }))}
                        className={inputCls} />
                    </Field>
                  </div>
                </div>
              </>
            )}

            {/* 外部 fields */}
            {form.types.includes("外部") && (
              <>
                <div className="border-t border-[#f5f5f5]" />
                <div className="flex flex-col gap-3">
                  <p className="text-[11px] text-[#aaa] uppercase tracking-widest">外部課程設定</p>

                  <Field label="合作單位">
                    <select value={form.partner}
                      onChange={e => setForm(f => ({ ...f, partner: e.target.value, subUnit: "", location: "" }))}
                      className={inputCls}>
                      <option value="">請選擇單位…</option>
                      {UNITS.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                    </select>
                  </Field>

                  {form.partner && (() => {
                    const unit = UNITS.find(u => u.name === form.partner)
                    if (!unit || unit.subUnits.length === 0) return null
                    return (
                      <>
                        <Field label="子單位">
                          <select value={form.subUnit}
                            onChange={e => {
                              const sub = unit.subUnits.find(s => s.name === e.target.value)
                              setForm(f => ({ ...f, subUnit: e.target.value, location: sub?.location ?? "" }))
                            }}
                            className={inputCls}>
                            <option value="">請選擇子單位…</option>
                            {unit.subUnits.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                          </select>
                        </Field>
                        {form.location && (
                          <Field label="地點">
                            <div className="w-full px-3 py-2.5 text-sm bg-[#f5f5f5] border border-[#f0f0f0] rounded-xl text-[#666]">
                              {form.location}
                            </div>
                          </Field>
                        )}
                      </>
                    )
                  })()}
                </div>
              </>
            )}

            <div className="border-t border-[#f5f5f5]" />
            <Field label="備註">
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="其他注意事項…" rows={3}
                className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black focus:bg-white transition-colors resize-none" />
            </Field>

          </div>

          <div className={`px-6 py-4 border-t border-[#f0f0f0] flex gap-2 ${drawer === "edit" ? "justify-between" : "justify-end"}`}>
            {drawer === "edit" && editing && (
              <button onClick={() => deleteCourse(editing.id)}
                className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors px-3 py-2">
                <Trash2 size={14} />刪除課程
              </button>
            )}
            <div className="flex gap-2">
              <button onClick={close} className="px-4 py-2 text-sm border border-[#f0f0f0] rounded-xl hover:border-black transition-colors">
                取消
              </button>
              <button onClick={drawer === "add" ? saveAdd : saveEdit}
                className="px-5 py-2 text-sm bg-black text-white rounded-xl hover:bg-[#222] transition-colors">
                {drawer === "add" ? "建立課程" : "儲存"}
              </button>
            </div>
          </div>
        </Drawer>
      )}

      {/* ── 點名 Drawer ── */}
      {attendCourse && (() => {
        const sessions = attendance[attendCourse.id] ?? []
        const session = sessions[sessionIdx]
        const present = session?.records.filter(r => r.status === "出席").length ?? 0
        const leave = session?.records.filter(r => r.status === "請假").length ?? 0
        const absent = session?.records.filter(r => r.status === "缺席").length ?? 0
        return (
          <Drawer title="出席紀錄" onClose={closeAttend}>
            <div className="px-6 py-5 flex flex-col gap-4">

              {/* Course info */}
              <div>
                <p className="text-base font-medium">{attendCourse.title}</p>
                <p className="text-xs text-[#999] mt-0.5">{attendCourse.partner} · {attendCourse.teachers.join("、")}</p>
              </div>

              {/* Session nav */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => setSessionIdx(i => Math.min(i + 1, sessions.length - 1))}
                    disabled={sessionIdx >= sessions.length - 1}
                    className="p-1 rounded-lg hover:bg-[#f5f5f5] disabled:opacity-30 transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <p className="text-sm font-medium w-28 text-center">{session?.date ?? "—"}</p>
                  <button onClick={() => setSessionIdx(i => Math.max(i - 1, 0))}
                    disabled={sessionIdx <= 0}
                    className="p-1 rounded-lg hover:bg-[#f5f5f5] disabled:opacity-30 transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </div>
                <button onClick={() => addSession(attendCourse.id)}
                  className="flex items-center gap-1 text-xs text-[#999] hover:text-black border border-[#f0f0f0] px-2.5 py-1.5 rounded-lg hover:border-black transition-colors">
                  <Plus size={12} />新增課堂
                </button>
              </div>

              {/* Stats */}
              {session && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "出席", value: present, color: "text-black" },
                    { label: "請假", value: leave, color: "text-[#aaa]" },
                    { label: "缺席", value: absent, color: "text-red-400" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-[#fafaf9] border border-[#f0f0f0] rounded-xl py-3 text-center">
                      <p className={`text-xl font-light ${color}`}>{value}</p>
                      <p className="text-[11px] text-[#aaa] mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Records */}
              {!session ? (
                <p className="text-sm text-[#ccc]">尚無課堂，請點「新增課堂」</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] text-[#aaa] uppercase tracking-widest">學員名單</p>
                  {session.records.length === 0 && (
                    <p className="text-sm text-[#ccc]">尚無學員，請在下方新增</p>
                  )}
                  {session.records.map((r) => (
                    <div key={r.name} className="flex items-center justify-between bg-[#fafaf9] border border-[#f0f0f0] rounded-xl px-4 py-3">
                      <p className="text-sm font-medium">{r.name}</p>
                      <div className="flex items-center gap-1.5">
                        {(["出席", "請假", "缺席"] as const).map(s => (
                          <button key={s} onClick={() => setStatus(attendCourse.id, sessionIdx, r.name, s)}
                            className={`text-[11px] px-2 py-1 rounded-lg transition-colors ${r.status === s
                                ? s === "出席" ? "bg-black text-white"
                                  : s === "請假" ? "bg-[#f5f5f5] text-[#555]"
                                    : "bg-red-50 text-red-400"
                                : "text-[#ccc] hover:text-[#999]"
                              }`}>
                            {s}
                          </button>
                        ))}
                        <button onClick={() => removeRecord(attendCourse.id, sessionIdx, r.name)}
                          className="text-[#e0e0e0] hover:text-red-400 transition-colors ml-1">
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add student inline */}
                  <div className="flex gap-2 mt-1">
                    <input value={newName} onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addRecord(attendCourse.id, sessionIdx)}
                      placeholder="新增學員姓名…"
                      className="flex-1 px-3 py-2 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors" />
                    <button onClick={() => addRecord(attendCourse.id, sessionIdx)}
                      className="px-3 py-2 bg-black text-white text-sm rounded-xl hover:bg-[#222] transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#f0f0f0] flex justify-end">
              <button onClick={closeAttend} className="px-5 py-2 text-sm bg-black text-white rounded-xl hover:bg-[#222] transition-colors">
                完成
              </button>
            </div>
          </Drawer>
        )
      })()}
    </div>
  )
}
