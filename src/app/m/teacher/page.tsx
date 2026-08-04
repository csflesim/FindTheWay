'use client'

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Bell, X, AlertCircle, Info, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAvailability, type Block } from "./context/AvailabilityProvider"
import { useTeacher } from "./_lib/useTeacher"
import { fetchTeacherCourses, occurrencesInRange, todayStr, attDate, type Occurrence } from "./_lib/teacherData"

type ViewMode = 'list' | 'day' | 'week' | 'month'

const DAYS_SHORT = ["日", "一", "二", "三", "四", "五", "六"]
// 可排課時段：由後台「參數管理 → 上課時間」設定，載入時覆寫
let START_HOUR = 9
let END_HOUR = 22
const HOUR_H = 52
const TODAY = todayStr()

// 模組層資料：TeacherCoursesPage 載入後填入，父層 re-render 讓各檢視元件讀到新值
let allCourses: Occurrence[] = []

// ── Notice bar ────────────────────────────────────────────────
type NoticeLevel = "urgent" | "reminder" | "info"
type Notice = { id: number; level: NoticeLevel; text: string; href?: string }

let NOTICES: Notice[] = []

const NOTICE_STYLE: Record<NoticeLevel, { bg: string; icon: React.ElementType; iconColor: string }> = {
  urgent:   { bg: "bg-red-50 border-red-100",    icon: AlertCircle, iconColor: "text-red-500"    },
  reminder: { bg: "bg-amber-50 border-amber-100", icon: Clock,       iconColor: "text-amber-500"  },
  info:     { bg: "bg-blue-50 border-blue-100",   icon: Info,        iconColor: "text-blue-500"   },
}

function NoticeBar() {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())
  const visible = NOTICES.filter(n => !dismissed.has(n.id))

  if (visible.length === 0) return null

  return (
    <div className="px-3 pt-2 pb-1 flex flex-col gap-1.5">
      {visible.map(n => {
        const { bg, icon: Icon, iconColor } = NOTICE_STYLE[n.level]
        return (
          <div key={n.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${bg}`}>
            <Icon size={13} className={`${iconColor} shrink-0`} />
            {n.href ? (
              <Link href={n.href} className="flex-1 leading-snug hover:underline underline-offset-2 line-clamp-1">
                {n.text}
              </Link>
            ) : (
              <span className="flex-1 leading-snug line-clamp-1">{n.text}</span>
            )}
            <button
              onClick={() => setDismissed(prev => new Set([...prev, n.id]))}
              className="shrink-0 text-[#bbb] hover:text-[#777] transition-colors -mr-0.5"
            >
              <X size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── date helpers ──────────────────────────────────────────────
function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}
function addDays(ds: string, n: number) {
  const [y, m, d] = ds.split("-").map(Number)
  const dt = new Date(y, m - 1, d + n)
  return toDateStr(dt.getFullYear(), dt.getMonth(), dt.getDate())
}
function getWeekStart(ds: string) {
  const [y, m, d] = ds.split("-").map(Number)
  const dow = new Date(y, m - 1, d).getDay()
  return addDays(ds, -dow)
}
function getDay(ds: string) {
  const [y, m, d] = ds.split("-").map(Number)
  return new Date(y, m - 1, d).getDay()
}
function toMins(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m }
function parseTime(t: string) {
  const [s, e] = t.split("–")
  return { s: toMins(s), e: toMins(e) }
}
function buildMonthGrid(y: number, m: number) {
  const firstDow = new Date(y, m, 1).getDay()
  const days = new Date(y, m + 1, 0).getDate()
  const cells: (string | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= days; d++) cells.push(toDateStr(y, m, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}
function monthLabel(y: number, m: number) { return `${y} 年 ${m + 1} 月` }
function weekLabel(ws: string) {
  const we = addDays(ws, 6)
  return `${ws.slice(5).replace("-", "/")} – ${we.slice(5).replace("-", "/")}`
}

// ── time grid shared ──────────────────────────────────────────
function TimeRows() {
  return (
    <>
      {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
        <div key={i} className="absolute w-full border-t border-[#f0f0f0]"
          style={{ top: i * HOUR_H }} />
      ))}
    </>
  )
}
function TimeLabels() {
  return (
    <div className="w-10 shrink-0 relative" style={{ height: (END_HOUR - START_HOUR) * HOUR_H }}>
      {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
        <span key={i} className="absolute text-[9px] text-[#bbb] leading-none -translate-y-1.5 right-1"
          style={{ top: i * HOUR_H }}>
          {String(START_HOUR + i).padStart(2, "0")}:00
        </span>
      ))}
    </div>
  )
}

// ── Day view ──────────────────────────────────────────────────
function DayView({ dateStr, blocks, onNavigate }: { dateStr: string; blocks: Block[]; onNavigate: (ds: string) => void }) {
  const studios = ["Studio A", "Studio B", "Studio C"]
  const isPast = dateStr <= TODAY
  const dayCourses = allCourses.filter((c) => c.dateStr === dateStr)
  const dayBlocks = blocks.filter((b) => b.dateStr === dateStr)
  const totalH = (END_HOUR - START_HOUR) * HOUR_H

  return (
    <div className="px-3 mt-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <button onClick={() => onNavigate(addDays(dateStr, -1))} className="p-1">
          <ChevronLeft size={16} className="text-[#999]" />
        </button>
        <span className="text-xs font-medium">
          {dateStr.slice(5).replace("-", "/")} 週{DAYS_SHORT[getDay(dateStr)]}
          {dateStr === TODAY && <span className="ml-1 text-[10px] text-white bg-black px-1.5 py-0.5 rounded-full">今天</span>}
        </span>
        <button onClick={() => onNavigate(addDays(dateStr, 1))} className="p-1">
          <ChevronRight size={16} className="text-[#999]" />
        </button>
      </div>

      {/* Column headers */}
      <div className="flex mb-1">
        <div className="w-10 shrink-0" />
        {studios.map((s) => (
          <div key={s} className="flex-1 text-center text-[10px] text-[#999] pb-1 border-b border-[#f0f0f0]">
            {s}
          </div>
        ))}
      </div>

      <div className="flex" style={{ height: totalH }}>
        <TimeLabels />
        {studios.map((studio) => {
          const col = dayCourses.filter((c) => `Studio ${c.studio}` === studio)
          return (
            <div key={studio} className="flex-1 relative border-l border-[#f5f5f5]" style={{ height: totalH }}>
              <TimeRows />
              {/* Unavailability overlays */}
              {dayBlocks.map((b) => {
                const s = toMins(b.startTime), e = toMins(b.endTime)
                const top = (s / 60 - START_HOUR) * HOUR_H
                const height = ((e - s) / 60) * HOUR_H
                return (
                  <div key={b.id} className="absolute inset-x-0 pointer-events-none"
                    style={{ top, height, background: "repeating-linear-gradient(45deg,#f0f0f0 0px,#f0f0f0 4px,transparent 4px,transparent 10px)", opacity: 0.9 }} />
                )
              })}
              {col.map((c) => {
                const { s, e } = parseTime(c.time)
                const top = (s / 60 - START_HOUR) * HOUR_H
                const height = ((e - s) / 60) * HOUR_H
                return (
                  <Link key={c.id} href={`/m/teacher/attendance?id=${c.id}`}
                    className="absolute inset-x-0.5 rounded-lg bg-black flex flex-col justify-center px-1.5"
                    style={{ top: top + 1, height: height - 2 }}>
                    <p className="text-[9px] text-white font-medium leading-tight line-clamp-2">{c.title}</p>
                    <p className="text-[8px] text-white/50 mt-0.5">{c.enrolled}/{c.capacity}</p>
                    {isPast && <span className="text-[8px] text-white/60 mt-0.5">點名 ›</span>}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Week view ─────────────────────────────────────────────────
function WeekView({ weekStart, blocks, onNavigate, onDayClick }: {
  weekStart: string
  blocks: Block[]
  onNavigate: (ws: string) => void
  onDayClick: (ds: string) => void
}) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const totalH = (END_HOUR - START_HOUR) * HOUR_H

  return (
    <div className="px-3 mt-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <button onClick={() => onNavigate(addDays(weekStart, -7))} className="p-1">
          <ChevronLeft size={16} className="text-[#999]" />
        </button>
        <span className="text-xs font-medium">{weekLabel(weekStart)}</span>
        <button onClick={() => onNavigate(addDays(weekStart, 7))} className="p-1">
          <ChevronRight size={16} className="text-[#999]" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 380 }}>
          {/* Day headers */}
          <div className="flex">
            <div className="w-10 shrink-0" />
            {weekDays.map((ds) => {
              const isToday = ds === TODAY
              const dayNum = Number(ds.slice(8))
              return (
                <button key={ds} onClick={() => onDayClick(ds)}
                  className="flex-1 flex flex-col items-center pb-1 border-b border-[#f0f0f0]">
                  <span className="text-[9px] text-[#aaa]">{DAYS_SHORT[getDay(ds)]}</span>
                  <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? "bg-black text-white" : "text-[#333]"
                  }`}>{dayNum}</span>
                </button>
              )
            })}
          </div>

          {/* Grid */}
          <div className="flex" style={{ height: totalH }}>
            <TimeLabels />
            {weekDays.map((ds) => {
              const dayCourses = allCourses.filter((c) => c.dateStr === ds)
              const dayBlocks = blocks.filter((b) => b.dateStr === ds)
              return (
                <div key={ds} className="flex-1 relative border-l border-[#f5f5f5]" style={{ height: totalH }}>
                  <TimeRows />
                  {dayBlocks.map((b) => {
                    const s = toMins(b.startTime), e = toMins(b.endTime)
                    const top = (s / 60 - START_HOUR) * HOUR_H
                    const height = ((e - s) / 60) * HOUR_H
                    return (
                      <div key={b.id} className="absolute inset-x-0 pointer-events-none"
                        style={{ top, height, background: "repeating-linear-gradient(45deg,#e8e8e8 0px,#e8e8e8 4px,transparent 4px,transparent 10px)", opacity: 0.9 }} />
                    )
                  })}
                  {dayCourses.map((c) => {
                    const { s, e } = parseTime(c.time)
                    const top = (s / 60 - START_HOUR) * HOUR_H
                    const height = ((e - s) / 60) * HOUR_H
                    return (
                      <Link key={c.id} href={`/m/teacher/attendance?id=${c.id}`}
                        className="absolute inset-x-0.5 rounded bg-black flex flex-col justify-center px-1"
                        style={{ top: top + 1, height: height - 2 }}>
                        <p className="text-[8px] text-white leading-tight line-clamp-3">{c.title}</p>
                      </Link>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Month view ────────────────────────────────────────────────
function MonthView({ year, month, blocks, onNavigate, onDayClick, selectedDate }: {
  year: number; month: number
  blocks: Block[]
  onNavigate: (y: number, m: number) => void
  onDayClick: (ds: string) => void
  selectedDate?: string | null
}) {
  const grid = buildMonthGrid(year, month)
  const courseDates: Record<string, typeof allCourses> = {}
  allCourses.forEach((c) => {
    if (!courseDates[c.dateStr]) courseDates[c.dateStr] = []
    courseDates[c.dateStr].push(c)
  })
  const blockDates: Record<string, Block[]> = {}
  blocks.forEach((b) => {
    if (!blockDates[b.dateStr]) blockDates[b.dateStr] = []
    blockDates[b.dateStr].push(b)
  })

  const prevMonth = month === 0 ? [year - 1, 11] : [year, month - 1]
  const nextMonth = month === 11 ? [year + 1, 0] : [year, month + 1]

  return (
    <div className="px-3 mt-3">
      <div className="flex items-center justify-between mb-3 px-1">
        <button onClick={() => onNavigate(prevMonth[0], prevMonth[1])} className="p-1">
          <ChevronLeft size={16} className="text-[#999]" />
        </button>
        <span className="text-xs font-medium">{monthLabel(year, month)}</span>
        <button onClick={() => onNavigate(nextMonth[0], nextMonth[1])} className="p-1">
          <ChevronRight size={16} className="text-[#999]" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-[9px] text-[#aaa] pb-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-t border-l border-[#f0f0f0]">
        {grid.map((ds, i) => {
          if (!ds) return <div key={i} className="border-r border-b border-[#f0f0f0] min-h-[60px]" />
          const isToday = ds === TODAY
          const dayCourses = courseDates[ds] || []
          const dayBlocks  = blockDates[ds]  || []
          const day = Number(ds.slice(8))
          const totalChips = dayCourses.length + dayBlocks.length
          const shownCourses = dayCourses.slice(0, 2)
          const shownBlocks  = dayBlocks.slice(0, Math.max(0, 2 - shownCourses.length))
          const overflow = totalChips - shownCourses.length - shownBlocks.length
          return (
            <button key={i} onClick={() => onDayClick(ds)}
              className="border-r border-b border-[#f0f0f0] min-h-[60px] p-1 text-left align-top">
              <span className={`text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full mb-0.5 ${
                isToday ? "bg-black text-white" :
                ds === selectedDate ? "ring-1 ring-black text-black" :
                "text-[#333]"
              }`}>{day}</span>
              {shownCourses.map((c) => (
                <div key={c.id} className="text-[8px] bg-black text-white rounded px-1 py-0.5 mb-0.5 truncate leading-tight">
                  {c.title}
                </div>
              ))}
              {shownBlocks.map((b) => (
                <div key={b.id} className="text-[8px] bg-[#e0e0e0] text-[#666] rounded px-1 py-0.5 mb-0.5 truncate leading-tight">
                  {b.reason || "請假"}
                </div>
              ))}
              {overflow > 0 && (
                <div className="text-[8px] text-[#999]">+{overflow}</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Month day detail ──────────────────────────────────────────
function MonthDayDetail({ dateStr, blocks }: { dateStr: string; blocks: Block[] }) {
  const dayCourses = allCourses.filter(c => c.dateStr === dateStr)
  const dayBlocks  = blocks.filter(b => b.dateStr === dateStr)
  const isPast = dateStr <= TODAY

  return (
    <div className="mx-3 mt-1 pb-4">
      <div className="flex items-center gap-2 px-1 mb-2">
        <p className="text-xs font-medium text-[#555]">
          {dateStr.slice(5).replace("-", "/")} 週{DAYS_SHORT[getDay(dateStr)]}
        </p>
        {dateStr === TODAY && (
          <span className="text-[10px] text-white bg-black px-1.5 py-0.5 rounded-full">今天</span>
        )}
      </div>

      {dayCourses.length === 0 && dayBlocks.length === 0 && (
        <p className="text-sm text-[#ccc] text-center py-6">無課程安排</p>
      )}

      <div className="flex flex-col gap-2">
        {dayCourses.map(c => (
          <div key={c.id} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] text-[#aaa]">Studio {c.studio}</p>
                <h3 className="text-sm font-medium mt-0.5">{c.title}</h3>
              </div>
              <span className="text-xs text-[#999] shrink-0">{c.time}</span>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-1 h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
                  <div className="h-full bg-black rounded-full" style={{ width: `${Math.round(c.enrolled / c.capacity * 100)}%` }} />
                </div>
                <span className="text-[10px] text-[#999] shrink-0">{c.enrolled}/{c.capacity} 人</span>
              </div>
              {isPast && (
                <Link href={`/m/teacher/attendance?id=${c.id}`}
                  className="ml-3 text-[11px] bg-black text-white px-3 py-1 rounded-full shrink-0">
                  點名
                </Link>
              )}
            </div>
          </div>
        ))}
        {dayBlocks.map(b => (
          <div key={b.id} className="bg-[#f9f9f9] rounded-xl p-4 border border-[#f0f0f0]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#666]">{b.reason || "請假"}</p>
              <span className="text-xs text-[#aaa]">{b.startTime}–{b.endTime}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── List view ─────────────────────────────────────────────────
function ListView() {
  const sorted = [...allCourses].sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.time.localeCompare(b.time))
  return (
    <div className="px-4 mt-4 flex flex-col gap-3">
      {sorted.map((c) => {
        const isPast = c.dateStr <= TODAY
        const { s, e } = parseTime(c.time)
        const fillRate = Math.round((c.enrolled / c.capacity) * 100)
        return (
          <div key={c.id} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] text-[#aaa]">
                  {c.dateStr.slice(5).replace("-", "/")} 週{DAYS_SHORT[getDay(c.dateStr)]} · Studio {c.studio}
                </p>
                <h3 className="text-sm font-medium mt-0.5">{c.title}</h3>
              </div>
              <span className="text-xs text-[#999] shrink-0">{c.time}</span>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-1 h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
                  <div className="h-full bg-black rounded-full" style={{ width: `${fillRate}%` }} />
                </div>
                <span className="text-[10px] text-[#999] shrink-0">{c.enrolled}/{c.capacity} 人</span>
              </div>
              {isPast && (
                <Link href={`/m/teacher/attendance?id=${c.id}`}
                  className="ml-3 text-[11px] bg-black text-white px-3 py-1 rounded-full shrink-0">
                  點名
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function TeacherCoursesPage() {
  const supabase = useMemo(() => createClient(), [])
  const { teacher, loading: teacherLoading } = useTeacher()
  const { blocks } = useAvailability()
  const [dataReady, setDataReady] = useState(false)
  const [view, setView] = useState<ViewMode>("month")
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [monthSelectedDate, setMonthSelectedDate] = useState<string | null>(TODAY)
  const [weekStart, setWeekStart] = useState(getWeekStart(TODAY))
  const now = new Date()
  const [monthNav, setMonthNav] = useState({ year: now.getFullYear(), month: now.getMonth() })

  useEffect(() => {
    if (!teacher) return
    ;(async () => {
      // 可排課時段設定
      try {
        const p = await fetch("/api/public-params").then(r => r.json())
        const open = parseInt(p?.businessHours?.open ?? "9")
        const close = parseInt(p?.businessHours?.close ?? "22")
        if (!isNaN(open)) START_HOUR = open
        if (!isNaN(close) && close > open) END_HOUR = close
      } catch {}

      const courses = await fetchTeacherCourses(supabase, teacher.id)
      const start = new Date(); start.setDate(start.getDate() - 60)
      const end = new Date(); end.setDate(end.getDate() + 90)
      allCourses = occurrencesInRange(courses, start, end)

      // 通知：今天尚未點名的場次（緊急）、明天的場次（提醒）
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`
      const todayOccs = allCourses.filter(o => o.dateStr === TODAY)
      const { data: todayAtt } = await supabase
        .from("course_attendance")
        .select("course_id")
        .eq("date", attDate(TODAY))
      const attended = new Set((todayAtt ?? []).map(a => a.course_id))
      const notices: Notice[] = []
      let nid = 1
      for (const o of todayOccs.filter(o => !attended.has(o.courseId))) {
        notices.push({ id: nid++, level: "urgent", text: `今天 ${o.time.split("–")[0]} ${o.title} 尚未點名`, href: "/m/teacher/attendance" })
      }
      for (const o of allCourses.filter(o => o.dateStr === tomorrowStr)) {
        notices.push({ id: nid++, level: "reminder", text: `明天 ${o.time.split("–")[0]} ${o.title}${o.studio ? `（${o.studio}）` : ""}` })
      }
      NOTICES = notices
      setDataReady(true)
    })()
  }, [teacher, supabase])

  const views: { key: ViewMode; label: string }[] = [
    { key: "list", label: "清單" },
    { key: "day",  label: "日"   },
    { key: "week", label: "週"   },
    { key: "month", label: "月"  },
  ]

  function handleDayClick(ds: string) {
    setSelectedDate(ds)
    setView("day")
  }

  function handleMonthDayClick(ds: string) {
    setMonthSelectedDate(prev => prev === ds ? null : ds)
  }

  const unread = NOTICES.length

  if (teacherLoading || (teacher && !dataReady)) {
    return <div className="min-h-screen flex items-center justify-center text-[#ccc] text-sm">載入中…</div>
  }
  if (!teacher) return null

  return (
    <div>
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-[#ebebeb] px-5 py-3 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <p className="text-[10px] text-[#aaa] tracking-widest uppercase">Teacher</p>
              <h1 className="text-sm font-medium leading-tight">我的課程</h1>
            </div>
            {unread > 0 && (
              <span className="flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full leading-none">
                {unread}
              </span>
            )}
          </div>
          {/* View switcher */}
          <div className="flex bg-[#f2f2f2] rounded-lg p-0.5 gap-0.5">
            {views.map(({ key, label }) => (
              <button key={key} onClick={() => setView(key)}
                className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                  view === key ? "bg-white text-black font-medium shadow-sm" : "text-[#999]"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <NoticeBar />

      {view === "list"  && <ListView />}
      {view === "day"   && <DayView dateStr={selectedDate} blocks={blocks} onNavigate={setSelectedDate} />}
      {view === "week"  && (
        <WeekView weekStart={weekStart} blocks={blocks} onNavigate={setWeekStart} onDayClick={handleDayClick} />
      )}
      {view === "month" && (
        <>
          <MonthView
            year={monthNav.year} month={monthNav.month}
            blocks={blocks}
            onNavigate={(y, m) => setMonthNav({ year: y, month: m })}
            onDayClick={handleMonthDayClick}
            selectedDate={monthSelectedDate}
          />
          {monthSelectedDate && (
            <MonthDayDetail dateStr={monthSelectedDate} blocks={blocks} />
          )}
        </>
      )}

      <div className="h-6" />
    </div>
  )
}
