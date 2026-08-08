// 課程班表為文字格式："每週六 10:00–12:00"、"每週二、四 19:00–20:30"（固定週期，星期可複選）
// 或 "2026/06/10 14:00–15:30"（單堂課）。這裡負責把班表展開成月曆事件，供教師課表 / 教室課表使用。

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
): Record<string, ScheduleEvent[]> {
  const out: Record<string, ScheduleEvent[]> = {}

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

/** 計算某課程班表在指定月份的堂數 */
export function countMonthOccurrences(schedule: string, year: number, month0: number): number {
  const m = expandScheduleToMonth(schedule, "", "", year, month0)
  return Object.values(m).reduce((n, evs) => n + evs.length, 0)
}
