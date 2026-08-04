// 訊息管理（ftw.msg.templates.v2）模板的共用讀取與轉換：
// - 把訊息管理設計的 LineFlex 結構轉成真正的 LINE Flex Message JSON
// - 供工作流測試觸發等發送情境使用

/* ─── 與 sys-admin/messages 頁一致的儲存型別 ─── */

type TextSize = "sm" | "md" | "lg" | "xl"
type Align = "start" | "center" | "end"

interface TextComp      { id: string; kind: "text";      text: string; size: TextSize; bold: boolean; color: string; align: Align }
interface KVComp        { id: string; kind: "kv";        label: string; value: string; emphasis: boolean }
interface ImageComp     { id: string; kind: "image";     url: string }
interface SeparatorComp { id: string; kind: "separator" }
type BodyComp = TextComp | KVComp | ImageComp | SeparatorComp

interface FooterButton { id: string; label: string; style: "primary" | "secondary" | "link"; color: string; url: string }

export interface LineFlexDef {
  mode: "flex" | "text"
  text: string
  altText: string
  header: { enabled: boolean; text: string; bg: string; color: string }
  hero:   { enabled: boolean; url: string }
  body: BodyComp[]
  footer: FooterButton[]
}

/* Email blocks（與訊息管理頁一致） */
interface GroupItem { id: string; label: string; value: string; emphasis: boolean }
interface EHeading  { id: string; kind: "heading"; text: string; color: string; align: Align }
interface EText     { id: string; kind: "text";    text: string; color: string; align: Align }
interface EKV       { id: string; kind: "kv";      label: string; value: string; emphasis: boolean }
interface EGroup    { id: string; kind: "group";   items: GroupItem[] }
interface EImage    { id: string; kind: "image";   url: string }
interface EButton   { id: string; kind: "button";  label: string; url: string; bg: string; color: string; align: Align }
interface EDivider  { id: string; kind: "divider" }
export type EmailBlock = EHeading | EText | EKV | EGroup | EImage | EButton | EDivider

export interface MsgTemplate {
  id: string
  name: string
  emailOn: boolean
  lineOn: boolean
  email: { subject: string; mode: "blocks" | "html"; blocks: EmailBlock[]; html: string }
  line: LineFlexDef
}

export const MSG_TEMPLATE_KEY = "ftw.msg.templates.v2"

export function loadMsgTemplates(): MsgTemplate[] {
  if (typeof window === "undefined") return []
  try {
    const s = window.localStorage.getItem(MSG_TEMPLATE_KEY)
    const arr = s ? JSON.parse(s) : []
    return Array.isArray(arr) ? (arr as MsgTemplate[]) : []
  } catch {
    return []
  }
}

/* ─── 變數填充（測試用範例值） ─── */

export const SAMPLE_VARS: Record<string, string> = {
  studentName: "賴大紫",
  courseName:  "基礎水彩入門",
  courseDate:  "2025/6/28",
  courseTime:  "14:00–16:00",
  teacherName: "鄭明德老師",
  ticketCount: "4 張",
  studioName:  "忙碌不迷路藝術工作坊",
  loginUrl:    "https://findtheway.com/m",
}

export function fillVars(s: string, vars: Record<string, string> = SAMPLE_VARS): string {
  return (s ?? "").replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in vars ? vars[k] : m))
}

/* ─── Email blocks → HTML（與訊息管理頁同邏輯） ─── */

export function blocksToHtml(blocks: EmailBlock[]): string {
  const rows = blocks.map(b => {
    if (b.kind === "heading")
      return `<tr><td style="padding:8px 24px;font-size:20px;font-weight:bold;color:${b.color};text-align:${b.align};">${b.text}</td></tr>`
    if (b.kind === "text")
      return `<tr><td style="padding:6px 24px;font-size:14px;line-height:1.6;color:${b.color};text-align:${b.align};">${b.text}</td></tr>`
    if (b.kind === "kv")
      return `<tr><td style="padding:4px 24px;"><table role="presentation" width="100%"><tr><td style="font-size:13px;color:#888;">${b.label}</td><td style="font-size:13px;text-align:right;${b.emphasis ? "font-weight:bold;color:#111;" : "color:#555;"}">${b.value}</td></tr></table></td></tr>`
    if (b.kind === "group") {
      const inner = b.items.map((it, i) =>
        `<tr><td style="padding:8px 14px;font-size:13px;color:#888;${i < b.items.length - 1 ? "border-bottom:1px solid #eee;" : ""}">${it.label}</td><td style="padding:8px 14px;font-size:13px;text-align:right;${i < b.items.length - 1 ? "border-bottom:1px solid #eee;" : ""}${it.emphasis ? "font-weight:bold;color:#111;" : "color:#555;"}">${it.value}</td></tr>`
      ).join("")
      return `<tr><td style="padding:8px 24px;"><table role="presentation" width="100%" style="background:#f7f7fa;border-radius:6px;">${inner}</table></td></tr>`
    }
    if (b.kind === "image")
      return `<tr><td style="padding:8px 24px;"><img src="${b.url}" width="100%" style="display:block;border-radius:6px;" alt="" /></td></tr>`
    if (b.kind === "button")
      return `<tr><td style="padding:12px 24px;text-align:${b.align};"><a href="${b.url}" style="background:${b.bg};color:${b.color};text-decoration:none;padding:10px 22px;border-radius:6px;display:inline-block;font-size:14px;font-weight:bold;">${b.label}</a></td></tr>`
    return `<tr><td style="padding:8px 24px;"><div style="border-top:1px solid #eee;">&nbsp;</div></td></tr>`
  }).join("")
  return `<table role="presentation" width="100%" style="font-family:Arial,sans-serif;"><tr><td align="center" style="padding:16px 0;background:#f4f4f7;"><table role="presentation" width="480" style="background:#fff;border-radius:8px;border:1px solid #eee;">${rows}</table></td></tr></table>`
}

/** 取得模板的寄送用 HTML（blocks 模式即時轉換，避免存檔時的 html 過期） */
export function emailHtmlOf(tpl: MsgTemplate, vars: Record<string, string> = SAMPLE_VARS): string {
  const html = tpl.email.mode === "html" ? tpl.email.html : blocksToHtml(tpl.email.blocks ?? [])
  return fillVars(html, vars)
}

/* ─── LineFlex → LINE Flex Message JSON ─── */

function safeUri(url: string): string {
  return /^https?:\/\/./.test(url) ? url : "https://line.me"
}

function bodyContents(body: BodyComp[], vars: Record<string, string>): Record<string, unknown>[] {
  return body.map(c => {
    if (c.kind === "text") return {
      type: "text",
      text: fillVars(c.text, vars) || " ",
      size: c.size,
      weight: c.bold ? "bold" : "regular",
      color: c.color || "#333333",
      align: c.align,
      wrap: true,
    }
    if (c.kind === "kv") return {
      type: "box",
      layout: "horizontal",
      margin: "md",
      contents: [
        { type: "text", text: fillVars(c.label, vars) || " ", size: "sm", color: "#888888", flex: 0 },
        {
          type: "text", text: fillVars(c.value, vars) || " ", size: "sm", align: "end",
          color: c.emphasis ? "#111111" : "#555555",
          weight: c.emphasis ? "bold" : "regular",
          wrap: true,
        },
      ],
    }
    if (c.kind === "image") return { type: "image", url: safeUri(c.url), size: "full", aspectMode: "cover" }
    return { type: "separator", margin: "lg" }
  })
}

/** 把訊息管理的 LINE 設計轉成可直接推播的 message 物件（flex 或 text） */
export function buildLineMessage(
  line: LineFlexDef,
  vars: Record<string, string> = SAMPLE_VARS,
): Record<string, unknown> {
  if (line.mode === "text") {
    return { type: "text", text: fillVars(line.text, vars) }
  }

  const bubble: Record<string, unknown> = {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "16px",
      contents: bodyContents(line.body ?? [], vars),
    },
  }
  if (line.header?.enabled) {
    bubble.header = {
      type: "box",
      layout: "vertical",
      backgroundColor: line.header.bg || "#111111",
      paddingAll: "16px",
      contents: [{
        type: "text",
        text: fillVars(line.header.text, vars) || " ",
        color: line.header.color || "#ffffff",
        weight: "bold",
        size: "md",
      }],
    }
  }
  if (line.hero?.enabled && /^https:\/\/./.test(line.hero.url)) {
    bubble.hero = { type: "image", url: line.hero.url, size: "full", aspectRatio: "20:13", aspectMode: "cover" }
  }
  if ((line.footer ?? []).length > 0) {
    bubble.footer = {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: line.footer.map(b => ({
        type: "button",
        style: b.style,
        height: "sm",
        ...(b.style === "primary" ? { color: b.color || "#06C755" } : {}),
        action: { type: "uri", label: fillVars(b.label, vars) || "查看", uri: safeUri(fillVars(b.url, vars)) },
      })),
    }
  }

  return {
    type: "flex",
    altText: fillVars(line.altText, vars) || "通知",
    contents: bubble,
  }
}
