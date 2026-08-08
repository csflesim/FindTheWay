// 券的歷程事件：存在 tickets.history jsonb，[{ at, event, note? }, ...]

export type TicketEvent = { at: string; event: string; note?: string }

/** 在既有歷程後附加一筆事件 */
export function withEvent(history: unknown, event: string, note?: string): TicketEvent[] {
  const list = Array.isArray(history) ? (history as TicketEvent[]) : []
  return [...list, { at: new Date().toISOString(), event, ...(note ? { note } : {}) }]
}

/** 今天的台灣日期字串 "YYYY-MM-DD"（比對 session_date / expires_at 用） */
export function twToday(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(new Date())
}

/** 券是否已過期（expires_at 為含當日有效） */
export function isExpired(expiresAt: string | null | undefined): boolean {
  return !!expiresAt && expiresAt < twToday()
}
