'use client'

import { useEffect, useMemo, useState } from "react"
import { Plus, Search, X, Trash2, ClipboardList, ChevronLeft, ChevronRight, Upload, CalendarDays } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { uploadImage } from "@/lib/upload"
import { expandScheduleToMonth, mergeMonthEvents, type ScheduleEvent } from "@/lib/schedule"

type AttendRecord = { name: string; status: "出席" | "延期" | "缺席"; ticketId?: string; ticketNo?: string }
type Session = { id: string | null; date: string; records: AttendRecord[] }

type Course = {
  id: string
  title: string
  types: ("內部" | "外部")[]
  teacherIds: string[]
  schedule: string
  status: "開課中" | "草稿" | "已結束"
  visible: boolean
  imgSquare?: string
  imgLandscape?: string
  // 內部
  classroomId?: string | null
  enrolled?: number
  capacity?: number
  ticketTypes?: string[]
  // 外部
  unitId?: string | null
  subUnit?: string
  location?: string
  notes?: string
  // 前台內容
  desc?: string
  highlights?: string[]
}

type TeacherRef = { id: string; name: string }
type ClassroomRef = { id: string; name: string }
type UnitRef = { id: string; name: string; subUnits: { name: string; location: string }[] }

type CourseRow = {
  id: string
  title: string
  types: ("內部" | "外部")[]
  schedule: string
  status: Course["status"]
  visible: boolean
  classroom_id: string | null
  capacity: number
  enrolled: number
  ticket_types: string[]
  unit_id: string | null
  sub_unit: string | null
  location: string | null
  description: string | null
  highlights: string[]
  notes: string | null
  cover_url: string | null
  banner_url: string | null
  course_teachers?: { teacher_id: string }[]
}

function fromRow(r: CourseRow): Course {
  return {
    id: r.id, title: r.title, types: r.types, schedule: r.schedule,
    status: r.status, visible: r.visible,
    teacherIds: (r.course_teachers ?? []).map(ct => ct.teacher_id),
    classroomId: r.classroom_id, enrolled: r.enrolled, capacity: r.capacity,
    ticketTypes: r.ticket_types ?? [],
    unitId: r.unit_id, subUnit: r.sub_unit ?? "", location: r.location ?? "",
    notes: r.notes ?? "", desc: r.description ?? "", highlights: r.highlights ?? [],
    imgSquare: r.cover_url ?? "", imgLandscape: r.banner_url ?? "",
  }
}

const TIMES: string[] = (() => {
  const t: string[] = []
  for (let h = 6; h <= 22; h++) {
    t.push(`${String(h).padStart(2, "0")}:00`)
    if (h < 22) t.push(`${String(h).padStart(2, "0")}:30`)
  }
  return t
})()

function parseSchedule(s: string) {
  const weekly = s.match(/每週([日一二三四五六、]+) (\d{2}:\d{2})–(\d{2}:\d{2})/)
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

const WEEKDAYS_SHORT = ["日","一","二","三","四","五","六"]
function tpad(n: number) { return String(n).padStart(2,"0") }
function dkey(y: number, m: number, d: number) { return `${y}-${tpad(m+1)}-${tpad(d)}` }

function TeacherScheduleModal({ teacher, courses, classrooms, onClose }: {
  teacher: TeacherRef
  courses: Course[]
  classrooms: ClassroomRef[]
  onClose: () => void
}) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [sel, setSel] = useState<string | null>(null)

  const roomName = useMemo(() => Object.fromEntries(classrooms.map(c => [c.id, c.name])), [classrooms])
  const schedule = useMemo(() => mergeMonthEvents(
    courses
      .filter(c => c.teacherIds.includes(teacher.id))
      .map(c => expandScheduleToMonth(c.schedule, c.title, c.classroomId ? (roomName[c.classroomId] ?? "") : "", year, month))
  ), [courses, teacher.id, roomName, year, month])

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  function prev() { if (month === 0) { setYear(y => y-1); setMonth(11) } else setMonth(m => m-1); setSel(null) }
  function next() { if (month === 11) { setYear(y => y+1); setMonth(0)  } else setMonth(m => m+1); setSel(null) }

  const selCourses: ScheduleEvent[] = sel ? (schedule[sel] ?? []) : []

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] shrink-0">
          <div>
            <p className="text-sm font-medium">{teacher.name} 的課表</p>
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
                    <p className="text-xs text-[#999] mt-0.5">{c.time}{c.extra ? ` · ${c.extra}` : ""}</p>
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
  title: "", types: ["內部"] as ("內部" | "外部")[], teacherIds: [] as string[],
  scheduleType: "固定週期" as "固定週期" | "單堂課",
  scheduleDay: "", scheduleDate: "", scheduleStart: "10:00", scheduleEnd: "12:00",
  status: "草稿" as Course["status"],
  classroomId: "", enrolled: 0, capacity: 10, ticketTypes: [] as string[], visible: true,
  imgSquare: "", imgLandscape: "",
  unitId: "", subUnit: "", location: "", notes: "",
  desc: "", highlights: "",
}

// ── Teacher multi-select (with schedule modal) ───────

function TeacherMultiSelect({ teachers, courses, classrooms, selected, onChange }: {
  teachers: TeacherRef[]
  courses: Course[]
  classrooms: ClassroomRef[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [scheduleFor, setScheduleFor] = useState<TeacherRef | null>(null)

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  const selectedNames = teachers.filter(t => selected.includes(t.id)).map(t => t.name)

  return (
    <>
      <div className="relative">
        <button type="button" onClick={() => setOpen(v => !v)}
          className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none text-left flex items-center justify-between hover:border-black transition-colors">
          <span className={selectedNames.length === 0 ? "text-[#bbb]" : ""}>
            {selectedNames.length === 0 ? "選擇教師…" : selectedNames.join("、")}
          </span>
          <ChevronRight size={14} className={`text-[#bbb] transition-transform ${open ? "rotate-90" : ""}`} />
        </button>
        {open && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-[#f0f0f0] rounded-xl shadow-lg overflow-hidden">
            <div className="max-h-48 overflow-y-auto">
              {teachers.length === 0 && <p className="px-4 py-3 text-sm text-[#ccc]">尚無教師，請先到教師管理新增</p>}
              {teachers.map(t => (
                <div key={t.id} className="flex items-center px-4 py-2.5 hover:bg-[#f9f9f9] transition-colors">
                  <button type="button" onClick={() => toggle(t.id)} className="flex items-center gap-3 flex-1 text-left text-sm">
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected.includes(t.id) ? "bg-black border-black" : "border-[#ddd]"}`}>
                      {selected.includes(t.id) && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </span>
                    {t.name}
                  </button>
                  <button type="button"
                    onClick={e => { e.stopPropagation(); setScheduleFor(t); setOpen(false) }}
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
      {scheduleFor && <TeacherScheduleModal teacher={scheduleFor} courses={courses} classrooms={classrooms} onClose={() => setScheduleFor(null)} />}
    </>
  )
}

// ── Multi-select dropdown ────────────────────────────

function MultiSelect({ options, selected, onChange, placeholder }: {
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const filtered = options.filter(o => o.label.includes(query))
  const labelOf = Object.fromEntries(options.map(o => [o.value, o.label]))
  const selectedLabels = selected.map(v => labelOf[v]).filter(Boolean)

  function toggle(v: string) {
    onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v])
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none text-left flex items-center justify-between hover:border-black transition-colors">
        <span className={selectedLabels.length === 0 ? "text-[#bbb]" : ""}>
          {selectedLabels.length === 0 ? placeholder : selectedLabels.join("、")}
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
              <button key={o.value} type="button" onClick={() => toggle(o.value)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[#f9f9f9] transition-colors text-left">
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected.includes(o.value) ? "bg-black border-black" : "border-[#ddd]"
                  }`}>
                  {selected.includes(o.value) && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </span>
                {o.label}
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
  const supabase = useMemo(() => createClient(), [])
  const [courses, setCourses] = useState<Course[]>([])
  const [teachers, setTeachers] = useState<TeacherRef[]>([])
  const [classrooms, setClassrooms] = useState<ClassroomRef[]>([])
  const [unitOptions, setUnitOptions] = useState<UnitRef[]>([])
  const [ticketOptions, setTicketOptions] = useState<{ value: string; label: string; isSingle: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState("")
  const [drawer, setDrawer] = useState<"add" | "edit" | null>(null)
  const [editing, setEditing] = useState<Course | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [attendCourse, setAttendCourse] = useState<Course | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionIdx, setSessionIdx] = useState(0)
  const [newName, setNewName] = useState("")

  useEffect(() => {
    Promise.all([
      supabase.from("courses").select("*, course_teachers(teacher_id)").order("created_at"),
      supabase.from("teachers").select("id, name").order("created_at"),
      supabase.from("classrooms").select("id, name").order("created_at"),
      supabase.from("units").select("id, name, sub_units").order("created_at"),
      supabase.from("products").select("id, name, is_single").eq("active", true).order("sort_order"),
    ]).then(([cRes, tRes, roomRes, uRes, pRes]) => {
      if (cRes.error) console.error("載入課程失敗:", cRes.error.message)
      else setCourses((cRes.data as CourseRow[]).map(fromRow))
      setTeachers((tRes.data ?? []) as TeacherRef[])
      setClassrooms((roomRes.data ?? []) as ClassroomRef[])
      setUnitOptions(((uRes.data ?? []) as { id: string; name: string; sub_units: { name: string; location: string }[] }[])
        .map(u => ({ id: u.id, name: u.name, subUnits: Array.isArray(u.sub_units) ? u.sub_units : [] })))
      // 課程的可使用課堂券存商品 id（名稱變動不影響對應）
      setTicketOptions(((pRes.data ?? []) as { id: string; name: string; is_single: boolean }[])
        .map(p => ({ value: p.id, label: p.is_single ? `${p.name}（單堂）` : p.name, isSingle: p.is_single })))
      setLoading(false)
    })
  }, [supabase])

  const teacherName = useMemo(() => Object.fromEntries(teachers.map(t => [t.id, t.name])), [teachers])
  const roomName = useMemo(() => Object.fromEntries(classrooms.map(c => [c.id, c.name])), [classrooms])
  const unitName = useMemo(() => Object.fromEntries(unitOptions.map(u => [u.id, u.name])), [unitOptions])

  function names(c: Course) { return c.teacherIds.map(id => teacherName[id]).filter(Boolean).join("、") }
  function studioOf(c: Course) { return c.classroomId ? (roomName[c.classroomId] ?? "—") : "—" }
  function partnerOf(c: Course) { return c.unitId ? (unitName[c.unitId] ?? "—") : "—" }

  const matched = courses.filter(c =>
    !query.trim() || c.title.includes(query.trim()) || names(c).includes(query.trim())
  )
  const internal = matched.filter(c => c.types.includes("內部"))
  const external = matched.filter(c => c.types.includes("外部"))

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
      title: c.title, types: c.types, teacherIds: c.teacherIds,
      ...parsed,
      status: c.status,
      classroomId: c.classroomId ?? "", enrolled: c.enrolled ?? 0, capacity: c.capacity ?? 10, ticketTypes: c.ticketTypes ?? [], visible: c.visible,
      imgSquare: c.imgSquare ?? "", imgLandscape: c.imgLandscape ?? "",
      unitId: c.unitId ?? "", subUnit: c.subUnit ?? "", location: c.location ?? "", notes: c.notes ?? "",
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

  async function buildRow() {
    const [coverUrl, bannerUrl] = await Promise.all([
      uploadImage(supabase, form.imgSquare, "courses"),
      uploadImage(supabase, form.imgLandscape, "courses"),
    ])
    const isInternal = form.types.includes("內部")
    const isExternal = form.types.includes("外部")
    return {
      title: form.title.trim(),
      types: form.types,
      schedule: buildSchedule(form),
      status: form.status,
      visible: form.visible,
      classroom_id: isInternal && form.classroomId ? form.classroomId : null,
      enrolled: isInternal ? form.enrolled : 0,
      capacity: isInternal ? form.capacity : 0,
      ticket_types: isInternal ? form.ticketTypes : [],
      unit_id: isExternal && form.unitId ? form.unitId : null,
      sub_unit: isExternal ? (form.subUnit || null) : null,
      location: isExternal ? (form.location || null) : null,
      notes: form.notes || null,
      description: form.desc || null,
      highlights: form.highlights.split("\n").map(s => s.trim()).filter(Boolean),
      cover_url: coverUrl || null,
      banner_url: bannerUrl || null,
    }
  }

  async function syncTeachers(courseId: string, teacherIds: string[]) {
    await supabase.from("course_teachers").delete().eq("course_id", courseId)
    if (teacherIds.length > 0) {
      const { error } = await supabase.from("course_teachers")
        .insert(teacherIds.map(tid => ({ course_id: courseId, teacher_id: tid })))
      if (error) throw new Error(error.message)
    }
  }

  // 內部課程必須綁定至少一個「單堂」商品（作為直接報名的計價依據）
  function validateSingleProduct(): boolean {
    if (!form.types.includes("內部")) return true
    const hasSingle = form.ticketTypes.some(id => ticketOptions.find(o => o.value === id)?.isSingle)
    if (!hasSingle) {
      alert("內部課程的「可使用課堂券」至少要包含一個單堂型商品（供單堂直接報名計價）。\n請先到課堂券組合建立單堂商品，或在清單中勾選。")
      return false
    }
    return true
  }

  async function saveAdd() {
    if (!form.title.trim() || saving) return
    if (!validateSingleProduct()) return
    setSaving(true)
    try {
      const row = await buildRow()
      const { data, error } = await supabase.from("courses").insert(row).select().single()
      if (error) throw new Error(error.message)
      await syncTeachers((data as CourseRow).id, form.teacherIds)
      setCourses(prev => [...prev, { ...fromRow(data as CourseRow), teacherIds: form.teacherIds }])
      close()
    } catch (err) {
      alert(err instanceof Error ? err.message : "新增失敗")
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit() {
    if (!editing || saving) return
    if (!validateSingleProduct()) return
    setSaving(true)
    try {
      const row = await buildRow()
      const { error } = await supabase.from("courses").update(row).eq("id", editing.id)
      if (error) throw new Error(error.message)
      await syncTeachers(editing.id, form.teacherIds)
      setCourses(prev => prev.map(c => c.id === editing.id ? {
        ...c, title: row.title, types: row.types as Course["types"], teacherIds: form.teacherIds,
        schedule: row.schedule, status: row.status, visible: row.visible,
        classroomId: row.classroom_id, enrolled: row.enrolled, capacity: row.capacity, ticketTypes: row.ticket_types,
        unitId: row.unit_id, subUnit: row.sub_unit ?? "", location: row.location ?? "", notes: row.notes ?? "",
        desc: row.description ?? "", highlights: row.highlights,
        imgSquare: row.cover_url ?? "", imgLandscape: row.banner_url ?? "",
      } : c))
      close()
    } catch (err) {
      alert(err instanceof Error ? err.message : "儲存失敗")
    } finally {
      setSaving(false)
    }
  }

  async function deleteCourse(id: string) {
    if (!confirm("確定刪除此課程？")) return
    const { error } = await supabase.from("courses").delete().eq("id", id)
    if (error) { alert(`刪除失敗：${error.message}`); return }
    setCourses(prev => prev.filter(c => c.id !== id))
    close()
  }

  // ── 點名（course_attendance）──

  // 內部課程：名冊＝綁定該堂的券（由 roster API 合併點名紀錄）；外部課程：手動名冊
  async function loadRoster(c: Course, date: string): Promise<AttendRecord[] | null> {
    if (!c.types.includes("內部")) return null
    const res = await fetch(`/api/attendance/roster?courseId=${c.id}&date=${encodeURIComponent(date)}`)
    const d = await res.json()
    if (!res.ok) { alert(`載入名冊失敗：${d.error ?? res.status}`); return null }
    return (d.records ?? []) as AttendRecord[]
  }

  async function selectSession(c: Course, list: Session[], idx: number) {
    setSessionIdx(idx)
    const s = list[idx]
    if (!s) return
    const roster = await loadRoster(c, s.date)
    if (roster) {
      setSessions(prev => prev.map((x, i) => i === idx ? { ...x, records: roster } : x))
    }
  }

  async function openAttend(c: Course) {
    setAttendCourse(c)
    setSessionIdx(0)
    setNewName("")
    const { data, error } = await supabase
      .from("course_attendance")
      .select("id, date, records")
      .eq("course_id", c.id)
      .order("date", { ascending: false })
    if (error) { alert(`載入出席紀錄失敗：${error.message}`); return }
    const list = (data ?? []) as Session[]
    setSessions(list)
    if (list.length > 0) await selectSession(c, list, 0)
  }

  function closeAttend() { setAttendCourse(null); setSessions([]) }

  async function addSession(c: Course) {
    const today = new Date()
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    if (sessions.some(s => s.date.replace(/\//g, "-") === date)) {
      setSessionIdx(sessions.findIndex(s => s.date.replace(/\//g, "-") === date))
      return
    }
    const roster = (await loadRoster(c, date)) ?? []
    const next: Session[] = [{ id: null, date, records: roster }, ...sessions]
    setSessions(next)
    setSessionIdx(0)
  }

  // 經 API 儲存：出席自動核銷課堂券、改缺席自動退券
  async function persistRecords(session: Session, records: AttendRecord[]) {
    if (!attendCourse) return
    const res = await fetch("/api/attendance/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: attendCourse.id, date: session.date, records }),
    })
    const d = await res.json()
    if (!res.ok || !d.ok) alert(`儲存出席狀態失敗：${d.error ?? res.status}`)
  }

  function setStatus(sidx: number, key: string, status: AttendRecord["status"]) {
    setSessions(prev => {
      const next = [...prev]
      const records = next[sidx].records.map(r => (r.ticketId ?? r.name) === key ? { ...r, status } : r)
      next[sidx] = { ...next[sidx], records }
      persistRecords(next[sidx], records)
      return next
    })
  }

  function addRecord(sidx: number) {
    if (!newName.trim()) return
    setSessions(prev => {
      const next = [...prev]
      const records = [...next[sidx].records, { name: newName.trim(), status: "出席" as const }]
      next[sidx] = { ...next[sidx], records }
      persistRecords(next[sidx], records)
      return next
    })
    setNewName("")
  }

  function removeRecord(sidx: number, name: string) {
    setSessions(prev => {
      const next = [...prev]
      const records = next[sidx].records.filter(r => r.name !== name)
      next[sidx] = { ...next[sidx], records }
      persistRecords(next[sidx], records)
      return next
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
        <input placeholder="搜尋課程名稱 / 教師…" value={query} onChange={e => setQuery(e.target.value)}
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
              {loading && <p className="px-5 py-4 text-sm text-[#ccc]">載入中…</p>}
              {!loading && internal.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無內部課程</p>}
              {internal.map((c) => (
                <div key={c.id} className="grid grid-cols-[2fr_1fr_2fr_0.6fr_1.2fr_0.8fr_auto] gap-4 items-center px-5 py-4">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    {c.types.includes("外部") && <span className="text-[10px] bg-[#e8f4fd] text-[#1a6fa8] px-1.5 py-0.5 rounded-full shrink-0">外部</span>}
                    {!c.visible && <span className="text-[10px] bg-[#f5f5f5] text-[#bbb] px-1.5 py-0.5 rounded-full shrink-0">隱藏</span>}
                  </div>
                  <p className="text-sm text-[#666]">{names(c)}</p>
                  <p className="text-xs text-[#999]">{c.schedule}</p>
                  <p className="text-xs text-[#999]">{studioOf(c)}</p>
                  <EnrollBar enrolled={c.enrolled ?? 0} capacity={c.capacity ?? 0} />
                  <span className={`text-[11px] px-2.5 py-1 rounded-full w-fit ${statusStyle[c.status]}`}>{c.status}</span>
                  <button onClick={() => openEdit(c)} className="text-xs text-[#999] hover:text-black">編輯</button>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-[#f9f9f9]">
            {loading && <p className="px-5 py-4 text-sm text-[#ccc]">載入中…</p>}
            {!loading && internal.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無內部課程</p>}
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
                <p className="text-xs text-[#999]">{names(c)} · {studioOf(c)} · {c.schedule}</p>
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
              {!loading && external.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無外部課程</p>}
              {external.map((c) => (
                <div key={c.id} className="grid grid-cols-[2fr_1fr_2fr_1.5fr_1.5fr_0.8fr_auto] gap-4 items-center px-5 py-4">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    {c.types.includes("內部") && <span className="text-[10px] bg-[#f0f0f0] text-[#555] px-1.5 py-0.5 rounded-full shrink-0">內部</span>}
                    {!c.visible && <span className="text-[10px] bg-[#f5f5f5] text-[#bbb] px-1.5 py-0.5 rounded-full shrink-0">隱藏</span>}
                  </div>
                  <p className="text-sm text-[#666]">{names(c)}</p>
                  <p className="text-xs text-[#999]">{c.schedule}</p>
                  <p className="text-xs text-[#666] truncate">{partnerOf(c)}</p>
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
            {!loading && external.length === 0 && <p className="px-5 py-4 text-sm text-[#ccc]">尚無外部課程</p>}
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
                <p className="text-xs text-[#999]">{names(c)} · {c.schedule}</p>
                <div className="flex gap-4 mt-2">
                  <div>
                    <p className="text-[10px] text-[#bbb]">合作單位</p>
                    <p className="text-xs text-[#666] mt-0.5">{partnerOf(c)}</p>
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
                  teachers={teachers}
                  courses={courses}
                  classrooms={classrooms}
                  selected={form.teacherIds}
                  onChange={v => setForm(f => ({ ...f, teacherIds: v }))}
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
                              onClick={() => setForm(f => {
                                const days = f.scheduleDay ? f.scheduleDay.split("、") : []
                                const next = days.includes(d) ? days.filter(x => x !== d) : [...days, d]
                                const order = ["日", "一", "二", "三", "四", "五", "六"]
                                next.sort((a, b) => order.indexOf(a) - order.indexOf(b))
                                return { ...f, scheduleDay: next.join("、") }
                              })}
                              className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${form.scheduleDay.split("、").includes(d) ? "bg-black text-white border-black" : "bg-white text-[#555] border-[#f0f0f0] hover:border-black"
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
                <p className="text-[10px] text-[#bbb] mt-1.5">隱藏後不會出現在前台課程列表，但持有課程連結者仍可進入報名</p>
              </Field>

              {editing && (
                <Field label="課程連結">
                  <div className="flex gap-2">
                    <input readOnly value={`${typeof window !== "undefined" ? window.location.origin : ""}/m/courses/${editing.id}`}
                      onFocus={e => e.currentTarget.select()}
                      className="flex-1 px-3 py-2.5 text-xs font-mono bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none text-[#666]" />
                    <button type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/m/courses/${editing.id}`
                        navigator.clipboard.writeText(url).then(
                          () => setLinkCopied(true),
                          () => alert(url),
                        )
                        setTimeout(() => setLinkCopied(false), 1500)
                      }}
                      className="shrink-0 px-4 py-2.5 text-sm border border-[#e8e8e8] rounded-xl text-[#333] hover:border-black transition-colors whitespace-nowrap">
                      {linkCopied ? "已複製" : "複製連結"}
                    </button>
                  </div>
                </Field>
              )}

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
                    <select value={form.classroomId} onChange={e => setForm(f => ({ ...f, classroomId: e.target.value }))}
                      className={inputCls}>
                      <option value="">請選擇教室…</option>
                      {classrooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Field>

                  <Field label="可使用課堂券（可複選）">
                    <MultiSelect
                      options={ticketOptions}
                      selected={form.ticketTypes}
                      onChange={v => setForm(f => ({ ...f, ticketTypes: v }))}
                      placeholder="選擇可用券別…"
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="已報名（依付款訂單自動計算）">
                      <div className="w-full px-3 py-2.5 text-sm bg-[#f5f5f5] border border-[#f0f0f0] rounded-xl text-[#666]">
                        {form.enrolled} 人
                      </div>
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
                    <select value={form.unitId}
                      onChange={e => setForm(f => ({ ...f, unitId: e.target.value, subUnit: "", location: "" }))}
                      className={inputCls}>
                      <option value="">請選擇單位…</option>
                      {unitOptions.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </Field>

                  {form.unitId && (() => {
                    const unit = unitOptions.find(u => u.id === form.unitId)
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
              <button onClick={drawer === "add" ? saveAdd : saveEdit} disabled={saving}
                className="px-5 py-2 text-sm bg-black text-white rounded-xl hover:bg-[#222] disabled:opacity-50 transition-colors">
                {saving ? "儲存中…" : drawer === "add" ? "建立課程" : "儲存"}
              </button>
            </div>
          </div>
        </Drawer>
      )}

      {/* ── 點名 Drawer ── */}
      {attendCourse && (() => {
        const session = sessions[sessionIdx]
        const isInternalCourse = attendCourse.types.includes("內部")
        const present = session?.records.filter(r => r.status === "出席").length ?? 0
        const leave = session?.records.filter(r => r.status === "延期").length ?? 0
        const absent = session?.records.filter(r => r.status === "缺席").length ?? 0
        return (
          <Drawer title="出席紀錄" onClose={closeAttend}>
            <div className="px-6 py-5 flex flex-col gap-4">

              {/* Course info */}
              <div>
                <p className="text-base font-medium">{attendCourse.title}</p>
                <p className="text-xs text-[#999] mt-0.5">{partnerOf(attendCourse)} · {names(attendCourse)}</p>
              </div>

              {/* Session nav */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => selectSession(attendCourse, sessions, Math.min(sessionIdx + 1, sessions.length - 1))}
                    disabled={sessionIdx >= sessions.length - 1}
                    className="p-1 rounded-lg hover:bg-[#f5f5f5] disabled:opacity-30 transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <p className="text-sm font-medium w-28 text-center">{session?.date ?? "—"}</p>
                  <button onClick={() => selectSession(attendCourse, sessions, Math.max(sessionIdx - 1, 0))}
                    disabled={sessionIdx <= 0}
                    className="p-1 rounded-lg hover:bg-[#f5f5f5] disabled:opacity-30 transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </div>
                <button onClick={() => addSession(attendCourse)}
                  className="flex items-center gap-1 text-xs text-[#999] hover:text-black border border-[#f0f0f0] px-2.5 py-1.5 rounded-lg hover:border-black transition-colors">
                  <Plus size={12} />新增課堂
                </button>
              </div>

              {/* Stats */}
              {session && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "出席", value: present, color: "text-black" },
                    { label: "延期", value: leave, color: "text-[#aaa]" },
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
                    <p className="text-sm text-[#ccc]">{isInternalCourse ? "這一堂還沒有人報名" : "尚無學員，請在下方新增"}</p>
                  )}
                  {session.records.map((r) => (
                    <div key={r.ticketId ?? r.name} className="flex items-center justify-between bg-[#fafaf9] border border-[#f0f0f0] rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{r.name}</p>
                        {r.ticketNo && <p className="text-[10px] text-[#bbb] font-mono">{r.ticketNo}</p>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {(["出席", "延期", "缺席"] as const).map(s => (
                          <button key={s} onClick={() => setStatus(sessionIdx, r.ticketId ?? r.name, s)}
                            className={`text-[11px] px-2 py-1 rounded-lg transition-colors ${r.status === s
                                ? s === "出席" ? "bg-black text-white"
                                  : s === "延期" ? "bg-[#f5f5f5] text-[#555]"
                                    : "bg-red-50 text-red-400"
                                : "text-[#ccc] hover:text-[#999]"
                              }`}>
                            {s}
                          </button>
                        ))}
                        {!isInternalCourse && (
                          <button onClick={() => removeRecord(sessionIdx, r.name)}
                            className="text-[#e0e0e0] hover:text-red-400 transition-colors ml-1">
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add student inline（外部課程手動名冊） */}
                  {!isInternalCourse && (
                    <div className="flex gap-2 mt-1">
                      <input value={newName} onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addRecord(sessionIdx)}
                        placeholder="新增學員姓名…"
                        className="flex-1 px-3 py-2 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors" />
                      <button onClick={() => addRecord(sessionIdx)}
                        className="px-3 py-2 bg-black text-white text-sm rounded-xl hover:bg-[#222] transition-colors">
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                  {isInternalCourse && (
                    <p className="text-[10px] text-[#bbb]">出席／缺席會核銷課堂券；「延期」券退回學員可重新預約</p>
                  )}
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
