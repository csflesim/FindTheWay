export const TEMPLATE_STORE_KEY = "ftw.templates.v1"

export interface StoredTemplate {
  id: string
  name: string
  emailOn: boolean
  lineOn: boolean
  emailSubject?: string
  emailHtml?: string
  lineText?: string
}

export const DEFAULT_STORED_TEMPLATES: StoredTemplate[] = [
  { id: "tpl_enroll",    name: "報名成功通知",     emailOn: true,  lineOn: true  },
  { id: "tpl_reminder",  name: "課前 24 小時提醒", emailOn: false, lineOn: true  },
  { id: "tpl_ticket",    name: "課堂券即將到期",   emailOn: true,  lineOn: true  },
  { id: "tpl_order",     name: "訂單付款確認",     emailOn: true,  lineOn: true  },
]

export function loadStoredTemplates(): StoredTemplate[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? (arr as StoredTemplate[]) : []
  } catch {
    return []
  }
}

export function saveStoredTemplates(list: StoredTemplate[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(TEMPLATE_STORE_KEY, JSON.stringify(list))
  } catch {
    /* 無痕模式下忽略 */
  }
}
