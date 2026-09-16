// 課程班表為文字格式："每週六 10:00–12:00"、"每週二、四 19:00–20:30"（固定週期，星期可複選）
// 或 "2026/06/10 14:00–15:30"（單堂課）。這裡負責把班表展開成月曆事件，供教師課表 / 教室課表使用。
// 各展開函式接受 skip（courses.skip_dates，"YYYY-MM-DD" 陣列）＝後台設定的停課日期，展開時排除。

const WEEKDAY_INDEX: Record<string, number> = {
  "日": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6,
}

export type ScheduleEvent = { title: string; time: string; extra: string }

function pad(n: number) { return String(n).padStart(2, "0") }

/** 將單一課程的班表展開到指定月份，回傳 { "YYYY-MM-DD": [event] } */
export function expandScheduleToMonth(
  schedule: string,
  title: string,
  extra: string,
  year: number,
  month0: number,
  skip: string[] = [],
): Record<string, ScheduleEvent[]> {
  const out: Record<string, ScheduleEvent[]> = {}
  const skipped = new Set(skip)

  const weekly = schedule.match(/每週([日一二三四五六、]+) (\d{2}:\d{2})–(\d{2}:\d{2})/)
  if (weekly) {
    const wds = new Set(
      weekly[1].split("、").map(c => WEEKDAY_INDEX[c]).filter(n => n !== undefined),
    )
    const time = `${weekly[2]}–${weekly[3]}`
    const daysInMonth = new Date(year, month0 + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      if (wds.has(new Date(year, month0, d).getDay())) {
        const key = `${year}-${pad(month0 + 1)}-${pad(d)}`
        if (skipped.has(key)) continue
        ;(out[key] ??= []).push({ title, time, extra })
      }
    }
    return out
  }

  const single = schedule.match(/(\d{4})\/(\d{2})\/(\d{2}) (\d{2}:\d{2})–(\d{2}:\d{2})/)
  if (single) {
    const [, y, m, d, s, e] = single
    if (parseInt(y) === year && parseInt(m) === month0 + 1) {
      out[`${y}-${m}-${d}`] = [{ title, time: `${s}–${e}`, extra }]
    }
  }
  return out
}

/** 合併多個課程的月曆事件 */
export function mergeMonthEvents(
  maps: Record<string, ScheduleEvent[]>[],
): Record<string, ScheduleEvent[]> {
  const out: Record<string, ScheduleEvent[]> = {}
  for (const m of maps) {
    for (const [k, evs] of Object.entries(m)) {
      ;(out[k] ??= []).push(...evs)
    }
  }
  return out
}

export type UpcomingSession = { date: string; time: string }  // date: "YYYY-MM-DD"

/**
 * 列出班表接下來的場次（含今天），供報名選日期用。
 * 週期課展開最近 count 堂；單堂課回傳那一天（未過期才回）。
 */
export function upcomingSessions(schedule: string, count = 8, from = new Date(), skip: string[] = []): UpcomingSession[] {
  const out: UpcomingSession[] = []
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const skipped = new Set(skip)

  const weekly = schedule.match(/每週([日一二三四五六、]+) (\d{2}:\d{2})–(\d{2}:\d{2})/)
  if (weekly) {
    const wds = new Set(
      weekly[1].split("、").map(c => WEEKDAY_INDEX[c]).filter(n => n !== undefined),
    )
    if (wds.size === 0) return out
    const time = `${weekly[2]}–${weekly[3]}`
    const d = new Date(start)
    let guard = 0
    while (out.length < count && guard < 730) {
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      if (wds.has(d.getDay()) && !skipped.has(key)) {
        out.push({ date: key, time })
      }
      d.setDate(d.getDate() + 1)
      guard++
    }
    return out
  }

  const single = schedule.match(/(\d{4})\/(\d{2})\/(\d{2}) (\d{2}:\d{2})–(\d{2}:\d{2})/)
  if (single) {
    const [, y, m, dd, s, e] = single
    const date = `${y}-${m}-${dd}`
    if (new Date(`${date}T23:59:59`) >= start) out.push({ date, time: `${s}–${e}` })
  }
  return out
}

/** 取得班表在某日期的上課開始時間（台灣時間），供取消期限計算 */
export function sessionStartAt(schedule: string, date: string): Date | null {
  const m = schedule.match(/(\d{2}:\d{2})–\d{2}:\d{2}/)
  if (!m) return null
  return new Date(`${date}T${m[1]}:00+08:00`)
}

/** 計算某課程班表在指定月份的堂數 */
export function countMonthOccurrences(schedule: string, year: number, month0: number, skip: string[] = []): number {
  const m = expandScheduleToMonth(schedule, "", "", year, month0, skip)
  return Object.values(m).reduce((n, evs) => n + evs.length, 0)
}
