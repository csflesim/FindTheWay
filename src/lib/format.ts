export function formatTW(
  date: Date | string | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return "—"
  return new Date(date).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    hour12: false,
    ...opts,
  })
}

export function formatDateTW(date: Date | string | null | undefined): string {
  return formatTW(date, { year: "numeric", month: "2-digit", day: "2-digit" })
}

export function formatDateTimeTW(date: Date | string | null | undefined): string {
  return formatTW(date, {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  })
}
