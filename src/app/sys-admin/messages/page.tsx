'use client'

import React, { useState, useRef, useEffect } from "react"
import { Plus, Trash2, Send, Users, User, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { saveStoredTemplates } from "@/lib/templateStore"

/* ─── uid helper ─── */
let seq = 0
const uid = (p: string) => `${p}_${++seq}`

/* ─── Template variables ─── */
interface TemplateVar { key: string; label: string; sample: string }
const TEMPLATE_VARS: TemplateVar[] = [
  { key: "studentName", label: "學員姓名",   sample: "賴大紫" },
  { key: "courseName",  label: "課程名稱",   sample: "基礎水彩入門" },
  { key: "courseDate",  label: "上課日期",   sample: "2025/6/28" },
  { key: "courseTime",  label: "上課時間",   sample: "14:00–16:00" },
  { key: "teacherName", label: "老師姓名",   sample: "鄭明德老師" },
  { key: "ticketCount", label: "課堂券數量", sample: "4 張" },
  { key: "studioName",  label: "工作室名稱", sample: "忙碌不迷路藝術工作坊" },
  { key: "loginUrl",    label: "登入連結",   sample: "https://findtheway.com/m" },
]
const VAR_SAMPLES: Record<string, string> = Object.fromEntries(TEMPLATE_VARS.map(v => [v.key, v.sample]))
const renderVars = (s: string) => (s ?? "").replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => k in VAR_SAMPLES ? VAR_SAMPLES[k] : m)

function insertAtCursor(el: HTMLInputElement | HTMLTextAreaElement, token: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set
  const start = el.selectionStart ?? el.value.length
  const end   = el.selectionEnd   ?? el.value.length
  setter?.call(el, el.value.slice(0, start) + token + el.value.slice(end))
  el.dispatchEvent(new Event("input", { bubbles: true }))
  const pos = start + token.length
  requestAnimationFrame(() => { el.focus(); el.setSelectionRange(pos, pos) })
}

/* ─── LINE Flex types ─── */
type TextSize = "sm" | "md" | "lg" | "xl"
type Align    = "start" | "center" | "end"

interface TextComp      { id: string; kind: "text";      text: string; size: TextSize; bold: boolean; color: string; align: Align }
interface KVComp        { id: string; kind: "kv";        label: string; value: string; emphasis: boolean }
interface ImageComp     { id: string; kind: "image";     url: string }
interface SeparatorComp { id: string; kind: "separator" }
type BodyComp = TextComp | KVComp | ImageComp | SeparatorComp

interface FooterButton { id: string; label: string; style: "primary" | "secondary" | "link"; color: string; url: string }
interface LineFlex {
  mode: "flex" | "text"
  text: string
  altText: string
  header: { enabled: boolean; text: string; bg: string; color: string }
  hero:   { enabled: boolean; url: string }
  body:   BodyComp[]
  footer: FooterButton[]
}

const newText = (text = "文字內容"): TextComp => ({ id: uid("t"), kind: "text", text, size: "md", bold: false, color: "#333333", align: "start" })
const newKV   = (label = "欄位名稱", value = "內容", emphasis = false): KVComp => ({ id: uid("kv"), kind: "kv", label, value, emphasis })
const newImg  = (url = ""): ImageComp => ({ id: uid("img"), kind: "image", url })
const newSep  = (): SeparatorComp => ({ id: uid("sep"), kind: "separator" })
const newBtn  = (label = "按鈕"): FooterButton => ({ id: uid("btn"), label, style: "primary", color: "#06C755", url: "https://" })

const lineDefault = (): LineFlex => ({
  mode: "flex",
  text: "🎨 您好 {{studentName}}！\n課程「{{courseName}}」即將開始。\n上課時間：{{courseDate}} {{courseTime}}\n請提前 10 分鐘抵達，期待與您相見！",
  altText: "課程上課提醒",
  header: { enabled: true, text: "課程上課提醒", bg: "#111111", color: "#ffffff" },
  hero: { enabled: false, url: "" },
  body: [
    newKV("學員姓名", "{{studentName}}"),
    newKV("課程名稱", "{{courseName}}"),
    newKV("上課日期", "{{courseDate}}"),
    newKV("上課時間", "{{courseTime}}"),
    newSep(),
    { ...newText("如有疑問請聯繫工作室"), align: "center" as Align, color: "#888888" },
  ],
  footer: [newBtn("查看課程詳情")],
})

/* ─── Email Block types ─── */
interface GroupItem { id: string; label: string; value: string; emphasis: boolean }
interface EHeading  { id: string; kind: "heading"; text: string; color: string; align: Align }
interface EText     { id: string; kind: "text";    text: string; color: string; align: Align }
interface EKV       { id: string; kind: "kv";      label: string; value: string; emphasis: boolean }
interface EGroup    { id: string; kind: "group";   items: GroupItem[] }
interface EImage    { id: string; kind: "image";   url: string }
interface EButton   { id: string; kind: "button";  label: string; url: string; bg: string; color: string; align: Align }
interface EDivider  { id: string; kind: "divider" }
type EmailBlock = EHeading | EText | EKV | EGroup | EImage | EButton | EDivider

const gi    = (label = "欄位名稱", value = "內容", emphasis = false): GroupItem => ({ id: uid("gi"), label, value, emphasis })
const ebH   = (text = "標題", color = "#111111", align: Align = "center"): EHeading => ({ id: uid("eh"), kind: "heading", text, color, align })
const ebT   = (text = "段落", color = "#555555", align: Align = "start"): EText => ({ id: uid("et"), kind: "text", text, color, align })
const ebKV  = (label = "欄位", value = "內容", emphasis = false): EKV => ({ id: uid("ekv"), kind: "kv", label, value, emphasis })
const ebGrp = (items?: GroupItem[]): EGroup => ({ id: uid("egrp"), kind: "group", items: items ?? [gi(), gi()] })
const ebImg = (url = ""): EImage => ({ id: uid("eimg"), kind: "image", url })
const ebBut = (label = "按鈕", url = "#", bg = "#111111", color = "#ffffff", align: Align = "center"): EButton => ({ id: uid("ebtn"), kind: "button", label, url, bg, color, align })
const ebDiv = (): EDivider => ({ id: uid("ediv"), kind: "divider" })

const emailDefaultBlocks = (): EmailBlock[] => [
  ebH("🎨 課程上課提醒"),
  ebT("親愛的 {{studentName}} 您好，您的課程即將開始！", "#666666", "center"),
  ebGrp([gi("課程名稱", "{{courseName}}", true), gi("上課日期", "{{courseDate}}"), gi("上課時間", "{{courseTime}}"), gi("授課老師", "{{teacherName}}")]),
  ebDiv(),
  ebT("請提前 10 分鐘抵達，如有問題歡迎聯繫工作室。", "#999999", "center"),
  ebBut("查看課程詳情", "#", "#111111"),
]

function blocksToHtml(blocks: EmailBlock[]): string {
  const rows = blocks.map(b => {
    if (b.kind === "heading")
      return `<tr><td style="padding:8px 24px;font-size:20px;font-weight:bold;color:${b.color};text-align:${b.align};">${b.text}</td></tr>`
    if (b.kind === "text")
      return `<tr><td style="padding:6px 24px;font-size:14px;line-height:1.6;color:${b.color};text-align:${b.align};">${b.text}</td></tr>`
    if (b.kind === "kv")
      return `<tr><td style="padding:4px 24px;"><table role="presentation" width="100%"><tr><td style="font-size:13px;color:#888;">${b.label}</td><td style="font-size:13px;text-align:right;${b.emphasis ? "font-weight:bold;color:#111;" : "color:#555;"}">${b.value}</td></tr></table></td></tr>`
    if (b.kind === "group") {
      const inner = b.items.map((it, i) =>
        `<tr><td style="padding:8px 14px;font-size:13px;color:#888;${i < b.items.length-1 ? "border-bottom:1px solid #eee;" : ""}">${it.label}</td><td style="padding:8px 14px;font-size:13px;text-align:right;${i < b.items.length-1 ? "border-bottom:1px solid #eee;" : ""}${it.emphasis ? "font-weight:bold;color:#111;" : "color:#555;"}">${it.value}</td></tr>`
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

/* ─── Template ─── */
interface Template {
  id: string; name: string; emailOn: boolean; lineOn: boolean
  email: { subject: string; mode: "blocks" | "html"; blocks: EmailBlock[]; html: string }
  line: LineFlex
}

function newTemplate(name: string): Template {
  const blocks = emailDefaultBlocks()
  return {
    id: `tpl_${uid("x")}`,
    name, emailOn: true, lineOn: true,
    email: { subject: "【忙碌不迷路】課程上課提醒", mode: "blocks", blocks, html: blocksToHtml(blocks) },
    line: lineDefault(),
  }
}
const clone = (t: Template): Template => JSON.parse(JSON.stringify(t))

const STORAGE_KEY = "ftw.msg.templates.v2"
const loadTpls = (): Template[] => { try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : [] } catch { return [] } }
const saveTpls = (l: Template[]) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(l)) } catch {} }

const sizeClass: Record<TextSize, string> = { sm: "text-[9px]", md: "text-[11px]", lg: "text-[13px]", xl: "text-[15px]" }
const alignClass: Record<Align, string>   = { start: "text-left", center: "text-center", end: "text-right" }

/* ─── Send history ─── */
type SendEntry = { id: number; ch: "LINE" | "Email"; target: string; content: string; sentAt: string; ok: boolean }
const MOCK_HIST: SendEntry[] = [
  { id: 1, ch: "LINE",  target: "全體推播",                 content: "課程提醒：水彩入門，明天 14:00",    sentAt: "2025-06-10 14:32", ok: true  },
  { id: 2, ch: "Email", target: "purple@findtheway.com",   content: "課前提醒：親子藝術探索",            sentAt: "2025-06-08 09:15", ok: true  },
  { id: 3, ch: "LINE",  target: "全體推播",                 content: "新課程上架通知",                    sentAt: "2025-06-05 10:00", ok: false },
]

/* ══════════════════════════════════════════════════════ */
export default function MessagesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [activeId,  setActiveId]  = useState("")
  const [draft,     setDraft]     = useState<Template | null>(null)
  const [ready,     setReady]     = useState(false)

  useEffect(() => {
    const stored = loadTpls()
    const list = stored.length ? stored : (() => { const t = newTemplate("課程提醒"); t.id = "tpl_default"; return [t] })()
    setTemplates(list); setActiveId(list[0].id); setDraft(clone(list[0])); setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    saveTpls(templates)
    saveStoredTemplates(templates.map(t => ({ id: t.id, name: t.name, emailOn: t.emailOn, lineOn: t.lineOn })))
  }, [templates, ready])

  const committed = templates.find(t => t.id === activeId)
  const dirty = ready && draft && committed ? JSON.stringify(draft) !== JSON.stringify(committed) : false

  const [tab, setTab] = useState<"line" | "email" | "send">("line")

  const lastField = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const trackFocus = (e: React.FocusEvent) => {
    const t = e.target as HTMLElement
    if (t instanceof HTMLTextAreaElement || (t instanceof HTMLInputElement && ["text","email","url"].includes(t.type)))
      lastField.current = t
  }
  const insertVar = (key: string) => { if (lastField.current) insertAtCursor(lastField.current, `{{${key}}}`) }

  /* template ops */
  const select = (id: string) => { const t = templates.find(x => x.id === id); if (t) { setActiveId(id); setDraft(clone(t)) } }
  const save   = () => { if (!draft) return; setTemplates(prev => prev.map(t => t.id === activeId ? clone(draft) : t)) }
  const addTpl = () => { const t = newTemplate(`新模板 ${templates.length + 1}`); setTemplates(p => [...p, t]); setActiveId(t.id); setDraft(clone(t)) }
  const delTpl = (id: string) => {
    if (templates.length <= 1) return
    const rest = templates.filter(t => t.id !== id)
    setTemplates(rest)
    if (activeId === id) { setActiveId(rest[0].id); setDraft(clone(rest[0])) }
  }

  /* patch helpers */
  const pd  = (p: Partial<Template>)          => setDraft(d => d ? { ...d, ...p } : d)
  const pe  = (p: Partial<Template["email"]>) => setDraft(d => d ? { ...d, email: { ...d.email, ...p } } : d)
  const pl  = (p: Partial<LineFlex>)          => setDraft(d => d ? { ...d, line: { ...d.line, ...p } } : d)

  const body   = draft?.line.body   ?? []
  const footer = draft?.line.footer ?? []
  const ebs    = draft?.email.blocks ?? []

  const setBody   = (b: BodyComp[]) => pl({ body: b })
  const setFooter = (f: FooterButton[]) => pl({ footer: f })
  const setEB     = (b: EmailBlock[]) => pe({ blocks: b })

  const addBody = (c: BodyComp) => setBody([...body, c])
  const updBody = (id: string, p: Partial<BodyComp>) => setBody(body.map(c => c.id === id ? { ...c, ...p } as BodyComp : c))
  const delBody = (id: string) => setBody(body.filter(c => c.id !== id))
  const movBody = (id: string, d: -1|1) => { const i = body.findIndex(c => c.id === id), j = i+d; if (i<0||j<0||j>=body.length) return; const n=[...body]; [n[i],n[j]]=[n[j],n[i]]; setBody(n) }

  const updBtn = (id: string, p: Partial<FooterButton>) => setFooter(footer.map(b => b.id === id ? { ...b, ...p } : b))
  const delBtn = (id: string) => setFooter(footer.filter(b => b.id !== id))

  const addEB = (b: EmailBlock) => setEB([...ebs, b])
  const updEB = (id: string, p: Partial<EmailBlock>) => setEB(ebs.map(b => b.id === id ? { ...b, ...p } as EmailBlock : b))
  const delEB = (id: string) => setEB(ebs.filter(b => b.id !== id))
  const movEB = (id: string, d: -1|1) => { const i=ebs.findIndex(b=>b.id===id), j=i+d; if(i<0||j<0||j>=ebs.length) return; const n=[...ebs]; [n[i],n[j]]=[n[j],n[i]]; setEB(n) }

  /* send state */
  const [sendCh,     setSendCh]     = useState<"line"|"email">("line")
  const [lTarget,    setLTarget]    = useState<"broadcast"|"specific">("broadcast")
  const [lUserId,    setLUserId]    = useState("")
  const [lMsgType,   setLMsgType]   = useState<"text"|"image">("text")
  const [lText,      setLText]      = useState("")
  const [lImgUrl,    setLImgUrl]    = useState("")
  const [lSending,   setLSending]   = useState(false)
  const [eTarget,    setETarget]    = useState<"broadcast"|"specific">("broadcast")
  const [eTo,        setETo]        = useState("")
  const [eSubject,   setESubject]   = useState("")
  const [eBody,      setEBody]      = useState("")
  const [eSending,   setESending]   = useState(false)
  const [sendResult, setSendResult] = useState<{ok:boolean;msg:string}|null>(null)
  const [history,    setHistory]    = useState<SendEntry[]>(MOCK_HIST)

  const addHistory = (e: Omit<SendEntry,"id">) => setHistory(p => [{ id: Date.now(), ...e }, ...p])

  async function handleLineSend() {
    if (lTarget === "specific" && !lUserId.trim()) return
    if (lMsgType === "text" && !lText.trim()) return
    if (lMsgType === "image" && !lImgUrl.trim()) return
    setLSending(true); setSendResult(null)
    const messages = lMsgType === "text" ? [{ type: "text", text: lText }] : [{ type: "image", originalContentUrl: lImgUrl, previewImageUrl: lImgUrl }]
    try {
      const res = await fetch("/api/line/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ broadcast: lTarget === "broadcast", to: lTarget === "specific" ? lUserId.trim() : undefined, messages }) })
      const data = await res.json()
      const ok = !!data.ok
      setSendResult({ ok, msg: ok ? "LINE 訊息已送出！" : (data.error ?? "發送失敗") })
      addHistory({ ch: "LINE", target: lTarget === "broadcast" ? "全體推播" : lUserId.trim(), content: lMsgType === "text" ? lText : `[圖片] ${lImgUrl}`, sentAt: new Date().toLocaleString("zh-TW", { hour12: false }), ok })
      if (ok) { setLText(""); setLImgUrl(""); setLUserId("") }
    } catch { setSendResult({ ok: false, msg: "網路錯誤，請稍後再試" }) }
    finally { setLSending(false) }
  }

  async function handleEmailSend() {
    if (!eSubject.trim() || !eBody.trim()) return
    if (eTarget === "specific" && !eTo.trim()) return
    setESending(true); setSendResult(null)
    try {
      const res = await fetch("/api/email/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: eTarget === "broadcast" ? "all@findtheway.app" : eTo.trim(), subject: eSubject.trim(), html: `<pre style="font-family:sans-serif;white-space:pre-wrap">${eBody}</pre>`, text: eBody }) })
      const data = await res.json()
      const ok = !!data.ok
      setSendResult({ ok, msg: ok ? "郵件已成功送出！" : (data.error ?? "發送失敗") })
      addHistory({ ch: "Email", target: eTarget === "broadcast" ? "全體發信" : eTo.trim(), content: eSubject.trim(), sentAt: new Date().toLocaleString("zh-TW", { hour12: false }), ok })
      if (ok) { setESubject(""); setEBody(""); setETo("") }
    } catch { setSendResult({ ok: false, msg: "網路錯誤，請稍後再試" }) }
    finally { setESending(false) }
  }

  const inp  = "w-full px-3 py-2.5 text-sm border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors"
  const tinp = inp + " resize-none"

  if (!ready || !draft) return (
    <div className="p-6 text-[#aaa] text-sm">載入中…</div>
  )

  return (
    <div className="p-4 md:p-6 w-full" onFocusCapture={trackFocus}>
      <div className="mb-5">
        <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Notifications</p>
        <h1 className="text-lg md:text-xl font-medium mt-0.5">訊息管理</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        {/* ── 左側：模板列表 ── */}
        <aside className="lg:self-start lg:sticky lg:top-6">
          <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#f5f5f5] flex items-center justify-between">
              <p className="text-sm font-medium">模板列表（{templates.length}）</p>
              <button onClick={addTpl} className="flex items-center gap-1 text-xs text-[#aaa] hover:text-black transition-colors">
                <Plus size={13} />新增
              </button>
            </div>
            <div className="p-2">
              {templates.map(t => (
                <button key={t.id} onClick={() => select(t.id)}
                  className={`group w-full flex items-start gap-2 px-3 py-2.5 rounded-lg text-left transition-colors mb-0.5 last:mb-0 ${t.id === activeId ? "bg-black text-white" : "hover:bg-[#fafafa] text-[#222]"}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{t.name}</p>
                    <div className="flex gap-1 mt-0.5">
                      {t.lineOn  && <span className={`text-[9px] px-1.5 py-0.5 rounded ${t.id === activeId ? "bg-white/20 text-white" : "bg-green-50 text-green-600"}`}>LINE</span>}
                      {t.emailOn && <span className={`text-[9px] px-1.5 py-0.5 rounded ${t.id === activeId ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"}`}>Email</span>}
                    </div>
                  </div>
                  {templates.length > 1 && (
                    <span onClick={e => { e.stopPropagation(); delTpl(t.id) }}
                      className={`text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5 ${t.id === activeId ? "text-white/60 hover:text-white" : "text-[#ccc] hover:text-red-500"}`}>
                      ✕
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── 右側：編輯區 ── */}
        <div className="min-w-0">
          {/* 模板設定 */}
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-5 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1">
                <label className="text-xs text-[#aaa] mb-1.5 block">模板名稱</label>
                <input type="text" value={draft.name} onChange={e => pd({ name: e.target.value })} className={inp} />
              </div>
              <div>
                <p className="text-xs text-[#aaa] mb-1.5">啟用通道</p>
                <div className="flex gap-3">
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${draft.lineOn ? "bg-green-50 border-green-200 text-green-700" : "border-[#f0f0f0] text-[#aaa]"}`}>
                    <input type="checkbox" checked={draft.lineOn} onChange={e => pd({ lineOn: e.target.checked })} className="accent-green-500" />
                    LINE
                  </label>
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${draft.emailOn ? "bg-blue-50 border-blue-200 text-blue-700" : "border-[#f0f0f0] text-[#aaa]"}`}>
                    <input type="checkbox" checked={draft.emailOn} onChange={e => pd({ emailOn: e.target.checked })} className="accent-blue-500" />
                    Email
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {dirty && <span className="text-[11px] text-amber-500 whitespace-nowrap">● 未儲存</span>}
                <button onClick={save} disabled={!dirty}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-black hover:bg-[#222] disabled:opacity-30 disabled:pointer-events-none transition-colors">
                  儲存
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#f0f0f0] mb-5">
            {([["line","LINE 模板"],["email","Email 模板"],["send","直接發送"]] as const).map(([k,l]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${tab === k ? "border-black text-black font-medium" : "border-transparent text-[#aaa] hover:text-black"}`}>
                {l}
              </button>
            ))}
          </div>

          {/* ══ LINE 模板 ══ */}
          {tab === "line" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <div className="bg-white rounded-xl border border-[#f0f0f0] p-5 flex flex-col gap-4">
                <VariableBar onInsert={insertVar} />

                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#aaa]">訊息型別</span>
                  <div className="flex rounded-lg border border-[#f0f0f0] overflow-hidden text-xs">
                    {(["flex","text"] as const).map(m => (
                      <button key={m} onClick={() => pl({ mode: m })}
                        className={`px-3 py-1.5 transition-colors ${draft.line.mode === m ? "bg-black text-white" : "text-[#555] hover:bg-[#fafafa]"}`}>
                        {m === "flex" ? "Flex Bubble" : "純文字"}
                      </button>
                    ))}
                  </div>
                </div>

                {draft.line.mode === "text" ? (
                  <div>
                    <label className="text-xs text-[#aaa] mb-1.5 block">純文字訊息</label>
                    <textarea value={draft.line.text} onChange={e => pl({ text: e.target.value })} rows={6} placeholder="輸入推播文字，可用 {{studentName}} 等變數" className={tinp} />
                  </div>
                ) : (<>
                  <div>
                    <label className="text-xs text-[#aaa] mb-1.5 block">Alt Text（通知列顯示）</label>
                    <input type="text" value={draft.line.altText} onChange={e => pl({ altText: e.target.value })} className={inp} />
                  </div>

                  <BlockBox title="Header" desc="標題列" enabled={draft.line.header.enabled} onToggle={v => pl({ header: { ...draft.line.header, enabled: v } })}>
                    <div className="flex flex-col gap-2">
                      <input type="text" value={draft.line.header.text} onChange={e => pl({ header: { ...draft.line.header, text: e.target.value } })} placeholder="標題文字" className={`${inp} !py-1.5 text-xs`} />
                      <div className="flex items-center gap-4 text-xs text-[#aaa]">
                        <label className="flex items-center gap-2">背景色 <CI value={draft.line.header.bg}    onChange={v => pl({ header: { ...draft.line.header, bg: v } })} /></label>
                        <label className="flex items-center gap-2">文字色 <CI value={draft.line.header.color} onChange={v => pl({ header: { ...draft.line.header, color: v } })} /></label>
                      </div>
                    </div>
                  </BlockBox>

                  <BlockBox title="Hero" desc="主視覺圖片" enabled={draft.line.hero.enabled} onToggle={v => pl({ hero: { ...draft.line.hero, enabled: v } })}>
                    <input type="text" value={draft.line.hero.url} onChange={e => pl({ hero: { ...draft.line.hero, url: e.target.value } })} placeholder="圖片網址 https://..." className={`${inp} !py-1.5 text-xs`} />
                  </BlockBox>

                  <BlockBox title="Body" desc="主內容" enabled>
                    <div className="flex flex-col gap-2">
                      {body.length === 0 && <p className="text-[11px] text-[#ccc] italic text-center py-2">尚無元件</p>}
                      {body.map((c, i) => (
                        <div key={c.id} className="p-2.5 rounded-lg bg-[#fafafa] border border-[#f0f0f0] flex flex-col gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 flex-shrink-0">
                              {c.kind === "text" ? "Text" : c.kind === "kv" ? "KV" : c.kind === "image" ? "Img" : "—"}
                            </span>
                            <span className="flex-1" />
                            <button onClick={() => movBody(c.id,-1)} disabled={i===0} className="text-[#ccc] hover:text-[#222] disabled:opacity-30 text-xs px-1">↑</button>
                            <button onClick={() => movBody(c.id, 1)} disabled={i===body.length-1} className="text-[#ccc] hover:text-[#222] disabled:opacity-30 text-xs px-1">↓</button>
                            <button onClick={() => delBody(c.id)} className="text-[#ccc] hover:text-red-500 text-sm px-1">✕</button>
                          </div>
                          {c.kind === "text" && (
                            <div className="flex flex-col gap-2">
                              <input type="text" value={c.text} onChange={e => updBody(c.id, { text: e.target.value })} className={`${inp} !py-1.5 text-xs`} />
                              <div className="flex items-center gap-2 flex-wrap text-[10px]">
                                <select value={c.size}  onChange={e => updBody(c.id, { size: e.target.value as TextSize })} className="border border-[#f0f0f0] rounded px-2 py-1 text-[10px] outline-none">
                                  <option value="sm">小</option><option value="md">中</option><option value="lg">大</option><option value="xl">特大</option>
                                </select>
                                <select value={c.align} onChange={e => updBody(c.id, { align: e.target.value as Align })} className="border border-[#f0f0f0] rounded px-2 py-1 text-[10px] outline-none">
                                  <option value="start">靠左</option><option value="center">置中</option><option value="end">靠右</option>
                                </select>
                                <button onClick={() => updBody(c.id, { bold: !c.bold })} className={`px-2 py-1 rounded border text-[10px] ${c.bold ? "bg-black text-white border-black" : "border-[#f0f0f0]"}`}>B</button>
                                <CI value={c.color} onChange={v => updBody(c.id, { color: v })} />
                              </div>
                            </div>
                          )}
                          {c.kind === "kv" && (
                            <div className="flex items-center gap-2">
                              <input type="text" value={c.label} onChange={e => updBody(c.id, { label: e.target.value })} placeholder="欄位名稱" className={`${inp} !py-1.5 text-xs flex-1 min-w-0`} />
                              <input type="text" value={c.value} onChange={e => updBody(c.id, { value: e.target.value })} placeholder="內容"     className={`${inp} !py-1.5 text-xs flex-1 min-w-0`} />
                              <button onClick={() => updBody(c.id, { emphasis: !c.emphasis })} className={`text-[10px] px-1.5 py-1 rounded border flex-shrink-0 ${c.emphasis ? "bg-black text-white border-black" : "border-[#f0f0f0]"}`}>B</button>
                            </div>
                          )}
                          {c.kind === "image" && <input type="text" value={c.url} onChange={e => updBody(c.id, { url: e.target.value })} placeholder="圖片網址" className={`${inp} !py-1.5 text-xs`} />}
                          {c.kind === "separator" && <p className="text-[11px] text-[#ccc]">— 分隔線 —</p>}
                        </div>
                      ))}
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <AB onClick={() => addBody(newText())}>＋ 文字</AB>
                        <AB onClick={() => addBody(newKV())}>＋ 欄位</AB>
                        <AB onClick={() => addBody(newImg())}>＋ 圖片</AB>
                        <AB onClick={() => addBody(newSep())}>＋ 分隔線</AB>
                      </div>
                    </div>
                  </BlockBox>

                  <BlockBox title="Footer" desc="按鈕" enabled>
                    <div className="flex flex-col gap-2">
                      {footer.length === 0 && <p className="text-[11px] text-[#ccc] italic text-center py-1">尚無按鈕</p>}
                      {footer.map(b => (
                        <div key={b.id} className="flex flex-col gap-2 p-2.5 rounded-lg bg-[#fafafa] border border-[#f0f0f0]">
                          <div className="flex items-center gap-2">
                            <input type="text" value={b.label} onChange={e => updBtn(b.id, { label: e.target.value })} placeholder="按鈕文字" className={`${inp} !py-1.5 text-xs flex-1 min-w-0`} />
                            <select value={b.style} onChange={e => updBtn(b.id, { style: e.target.value as FooterButton["style"] })} className="border border-[#f0f0f0] rounded px-2 py-1 text-[10px] outline-none flex-shrink-0">
                              <option value="primary">主要</option><option value="secondary">次要</option><option value="link">連結</option>
                            </select>
                            <CI value={b.color} onChange={v => updBtn(b.id, { color: v })} />
                            <button onClick={() => delBtn(b.id)} className="text-[#ccc] hover:text-red-500 text-sm flex-shrink-0">✕</button>
                          </div>
                          <input type="text" value={b.url} onChange={e => updBtn(b.id, { url: e.target.value })} placeholder="連結 URL" className={`${inp} !py-1.5 text-xs`} />
                        </div>
                      ))}
                      <AB onClick={() => setFooter([...footer, newBtn()])}>＋ 新增按鈕</AB>
                    </div>
                  </BlockBox>

                  <button onClick={() => pl(lineDefault())} className="w-full py-2 rounded-lg text-xs text-[#aaa] border border-[#f0f0f0] hover:bg-[#fafafa] transition-colors">
                    ↺ 還原預設值
                  </button>
                </>)}
              </div>

              {/* 即時預覽 */}
              <div className="xl:sticky xl:top-6">
                <p className="text-xs font-medium text-[#555] mb-2">即時預覽</p>
                <div className="bg-[#85929E] rounded-xl p-4 flex items-start justify-center min-h-[400px]">
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-black flex-shrink-0 flex items-center justify-center font-bold text-white text-[8px] mt-4">FW</div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-white/90">忙碌不迷路</span>
                      {draft.line.mode === "text" ? (
                        <div className="bg-white rounded-xl rounded-tl-none shadow p-3 w-[248px] text-[12px] leading-relaxed text-[#222] whitespace-pre-wrap break-words">
                          {renderVars(draft.line.text) || "（訊息內容）"}
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl shadow overflow-hidden w-[248px]">
                          {draft.line.header.enabled && (
                            <div className="px-3 py-2.5 text-[13px] font-bold" style={{ background: draft.line.header.bg, color: draft.line.header.color }}>
                              {renderVars(draft.line.header.text) || "（標題）"}
                            </div>
                          )}
                          {draft.line.hero.enabled && (draft.line.hero.url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={draft.line.hero.url} alt="hero" className="w-full h-[130px] object-cover" />
                            : <div className="w-full h-[130px] bg-zinc-200 flex items-center justify-center text-zinc-400 text-[11px]">Image</div>
                          )}
                          <div className="p-3 flex flex-col gap-2">
                            {body.map(c => {
                              if (c.kind === "text") return <p key={c.id} className={`${sizeClass[c.size]} ${alignClass[c.align]} ${c.bold?"font-bold":""} break-words`} style={{ color: c.color }}>{renderVars(c.text)||"—"}</p>
                              if (c.kind === "kv")   return <div key={c.id} className="flex justify-between gap-2 text-[10px]"><span className="text-[#aaa] flex-shrink-0">{renderVars(c.label)||"—"}</span><span className={`text-right break-all ${c.emphasis?"font-bold text-[#111]":"text-[#555]"}`}>{renderVars(c.value)||"—"}</span></div>
                              if (c.kind === "image") return c.url
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img key={c.id} src={c.url} alt="" className="w-full rounded object-cover" />
                                : <div key={c.id} className="w-full h-16 bg-zinc-100 rounded flex items-center justify-center text-zinc-400 text-[10px]">Image</div>
                              return <div key={c.id} className="border-t border-zinc-100 my-0.5" />
                            })}
                          </div>
                          {footer.length > 0 && (
                            <div className="px-3 pb-3 pt-1 flex flex-col gap-2">
                              {footer.map(b => (
                                <a key={b.id} href={renderVars(b.url)||"#"} target="_blank" rel="noreferrer" className="block text-center text-[11px] font-semibold py-2 rounded no-underline"
                                  style={b.style==="primary"?{background:b.color,color:"#fff"}:b.style==="secondary"?{background:"#f0f0f0",color:b.color}:{color:b.color}}>
                                  {renderVars(b.label)||"按鈕"}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <span className="text-[8px] text-white/70 mt-0.5">已讀 14:32</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ Email 模板 ══ */}
          {tab === "email" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <div className="bg-white rounded-xl border border-[#f0f0f0] p-5 flex flex-col gap-4">
                <VariableBar onInsert={insertVar} />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#aaa]">編輯模式</span>
                  <div className="flex rounded-lg border border-[#f0f0f0] overflow-hidden text-xs">
                    <button onClick={() => pe({ mode: "blocks" })}
                      className={`px-3 py-1.5 transition-colors ${draft.email.mode === "blocks" ? "bg-black text-white" : "text-[#555] hover:bg-[#fafafa]"}`}>區塊編輯</button>
                    <button onClick={() => pe({ mode: "html", html: blocksToHtml(ebs) })}
                      className={`px-3 py-1.5 transition-colors ${draft.email.mode === "html" ? "bg-black text-white" : "text-[#555] hover:bg-[#fafafa]"}`}>HTML</button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#aaa] mb-1.5 block">信件主旨</label>
                  <input type="text" value={draft.email.subject} onChange={e => pe({ subject: e.target.value })} className={inp} />
                </div>

                {draft.email.mode === "blocks" ? (
                  <div className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-3">
                    <p className="text-xs font-medium text-[#555] mb-2">信件內容區塊</p>
                    <div className="flex flex-col gap-2">
                      {ebs.length === 0 && <p className="text-[11px] text-[#ccc] italic text-center py-2">尚無區塊</p>}
                      {ebs.map((b, i) => (
                        <div key={b.id} className="p-2.5 rounded-lg bg-white border border-[#f0f0f0] flex flex-col gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 flex-shrink-0">
                              {b.kind === "heading" ? "標題" : b.kind === "text" ? "段落" : b.kind === "kv" ? "欄位" : b.kind === "group" ? "資訊卡" : b.kind === "image" ? "圖片" : b.kind === "button" ? "按鈕" : "分隔"}
                            </span>
                            <span className="flex-1" />
                            <button onClick={() => movEB(b.id,-1)} disabled={i===0} className="text-[#ccc] hover:text-[#222] disabled:opacity-30 text-xs px-1">↑</button>
                            <button onClick={() => movEB(b.id, 1)} disabled={i===ebs.length-1} className="text-[#ccc] hover:text-[#222] disabled:opacity-30 text-xs px-1">↓</button>
                            <button onClick={() => delEB(b.id)} className="text-[#ccc] hover:text-red-500 text-sm px-1">✕</button>
                          </div>
                          {(b.kind === "heading" || b.kind === "text") && (
                            <div className="flex flex-col gap-2">
                              <textarea value={b.text} onChange={e => updEB(b.id, { text: e.target.value })} rows={b.kind==="text"?2:1} className={`${inp} !py-1.5 text-xs resize-y`} />
                              <div className="flex items-center gap-2 text-[10px]">
                                <select value={b.align} onChange={e => updEB(b.id, { align: e.target.value as Align })} className="border border-[#f0f0f0] rounded px-2 py-1 text-[10px] outline-none">
                                  <option value="start">靠左</option><option value="center">置中</option><option value="end">靠右</option>
                                </select>
                                <label className="flex items-center gap-1.5 text-[#aaa]">色 <CI value={b.color} onChange={v => updEB(b.id, { color: v })} /></label>
                              </div>
                            </div>
                          )}
                          {b.kind === "kv" && (
                            <div className="flex items-center gap-2">
                              <input type="text" value={b.label} onChange={e => updEB(b.id, { label: e.target.value })} placeholder="欄位名稱" className={`${inp} !py-1.5 text-xs flex-1 min-w-0`} />
                              <input type="text" value={b.value} onChange={e => updEB(b.id, { value: e.target.value })} placeholder="內容"     className={`${inp} !py-1.5 text-xs flex-1 min-w-0`} />
                              <button onClick={() => updEB(b.id, { emphasis: !b.emphasis })} className={`text-[10px] px-1.5 py-1 rounded border flex-shrink-0 ${b.emphasis?"bg-black text-white border-black":"border-[#f0f0f0]"}`}>B</button>
                            </div>
                          )}
                          {b.kind === "group" && (
                            <div className="flex flex-col gap-1.5">
                              {b.items.map(it => (
                                <div key={it.id} className="flex items-center gap-2">
                                  <input type="text" value={it.label} onChange={e => updEB(b.id, { items: b.items.map(x => x.id===it.id?{...x,label:e.target.value}:x) })} placeholder="欄位名稱" className={`${inp} !py-1.5 text-xs flex-1 min-w-0`} />
                                  <input type="text" value={it.value} onChange={e => updEB(b.id, { items: b.items.map(x => x.id===it.id?{...x,value:e.target.value}:x) })} placeholder="內容"     className={`${inp} !py-1.5 text-xs flex-1 min-w-0`} />
                                  <button onClick={() => updEB(b.id, { items: b.items.map(x => x.id===it.id?{...x,emphasis:!x.emphasis}:x) })} className={`text-[10px] px-1.5 py-1 rounded border flex-shrink-0 ${it.emphasis?"bg-black text-white border-black":"border-[#f0f0f0]"}`}>B</button>
                                  <button onClick={() => updEB(b.id, { items: b.items.filter(x => x.id!==it.id) })} disabled={b.items.length<=1} className="text-[#ccc] hover:text-red-500 disabled:opacity-30 text-sm flex-shrink-0">✕</button>
                                </div>
                              ))}
                              <button onClick={() => updEB(b.id, { items: [...b.items, gi()] })} className="self-start px-2.5 py-1.5 rounded-lg border border-dashed border-[#e0e0e0] text-[10px] text-[#aaa] hover:border-black hover:text-black transition-colors">
                                ＋ 卡片內欄位
                              </button>
                            </div>
                          )}
                          {b.kind === "image" && <input type="text" value={b.url} onChange={e => updEB(b.id, { url: e.target.value })} placeholder="圖片網址 https://..." className={`${inp} !py-1.5 text-xs`} />}
                          {b.kind === "button" && (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <input type="text" value={b.label} onChange={e => updEB(b.id, { label: e.target.value })} placeholder="按鈕文字" className={`${inp} !py-1.5 text-xs flex-1 min-w-0`} />
                                <select value={b.align} onChange={e => updEB(b.id, { align: e.target.value as Align })} className="border border-[#f0f0f0] rounded px-2 py-1 text-[10px] outline-none flex-shrink-0">
                                  <option value="start">靠左</option><option value="center">置中</option><option value="end">靠右</option>
                                </select>
                                <label className="flex items-center gap-1.5 text-[10px] text-[#aaa] flex-shrink-0">底 <CI value={b.bg}    onChange={v => updEB(b.id, { bg: v })} /></label>
                                <label className="flex items-center gap-1.5 text-[10px] text-[#aaa] flex-shrink-0">字 <CI value={b.color} onChange={v => updEB(b.id, { color: v })} /></label>
                              </div>
                              <input type="text" value={b.url} onChange={e => updEB(b.id, { url: e.target.value })} placeholder="連結 URL" className={`${inp} !py-1.5 text-xs`} />
                            </div>
                          )}
                          {b.kind === "divider" && <p className="text-[11px] text-[#ccc]">— 分隔線 —</p>}
                        </div>
                      ))}
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <EAB onClick={() => addEB(ebH())}>＋ 標題</EAB>
                        <EAB onClick={() => addEB(ebT())}>＋ 段落</EAB>
                        <EAB onClick={() => addEB(ebKV())}>＋ 欄位</EAB>
                        <EAB onClick={() => addEB(ebGrp())}>＋ 資訊卡</EAB>
                        <EAB onClick={() => addEB(ebImg())}>＋ 圖片</EAB>
                        <EAB onClick={() => addEB(ebBut())}>＋ 按鈕</EAB>
                        <EAB onClick={() => addEB(ebDiv())}>＋ 分隔線</EAB>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-[#aaa] mb-1.5 block">HTML 內容</label>
                    <textarea value={draft.email.html} onChange={e => pe({ html: e.target.value })} rows={16} spellCheck={false} className={`${inp} resize-y font-mono text-[11px] leading-relaxed`} />
                  </div>
                )}

                <button onClick={() => { const blocks=emailDefaultBlocks(); pe({ blocks, html: blocksToHtml(blocks), subject: "【忙碌不迷路】課程上課提醒" }) }}
                  className="w-full py-2 rounded-lg text-xs text-[#aaa] border border-[#f0f0f0] hover:bg-[#fafafa] transition-colors">
                  ↺ 還原預設值
                </button>
              </div>

              {/* Email 即時預覽 */}
              <div className="xl:sticky xl:top-6">
                <p className="text-xs font-medium text-[#555] mb-2">即時預覽</p>
                <div className="bg-[#f0f0f4] rounded-xl p-4">
                  <div className="bg-white text-[#222] rounded-lg w-full shadow-sm overflow-hidden">
                    <div className="p-4 pb-3">
                      <p className="text-[9px] text-[#aaa] mb-2 border-b border-[#f5f5f5] pb-2 truncate">主旨：{draft.email.subject}</p>
                      <div className="flex items-center gap-2 border-b border-[#f5f5f5] pb-3">
                        <div className="w-7 h-7 rounded-full bg-black text-white font-bold flex items-center justify-center text-[10px]">FW</div>
                        <div>
                          <h5 className="font-bold text-[#111] text-xs">忙碌不迷路藝術工作坊</h5>
                          <p className="text-[8px] text-[#aaa]">service@findtheway.com</p>
                        </div>
                      </div>
                    </div>
                    {draft.email.mode === "html" ? (
                      <div className="px-1 pb-2" dangerouslySetInnerHTML={{ __html: renderVars(draft.email.html) }} />
                    ) : (
                      <div className="px-4 pb-4 flex flex-col gap-2.5">
                        {ebs.map(b => {
                          if (b.kind === "heading") return <h3 key={b.id} className={`text-sm font-extrabold break-words ${alignClass[b.align]}`} style={{ color: b.color }}>{renderVars(b.text)||"—"}</h3>
                          if (b.kind === "text")    return <p  key={b.id} className={`text-[10px] leading-relaxed break-words ${alignClass[b.align]}`} style={{ color: b.color }}>{renderVars(b.text)||"—"}</p>
                          if (b.kind === "kv") return (
                            <div key={b.id} className="flex justify-between gap-2 text-[10px] bg-[#f7f7fa] rounded px-2.5 py-1.5">
                              <span className="text-[#aaa] flex-shrink-0">{renderVars(b.label)||"—"}</span>
                              <span className={`text-right break-all ${b.emphasis?"font-bold text-[#111]":"text-[#555]"}`}>{renderVars(b.value)||"—"}</span>
                            </div>
                          )
                          if (b.kind === "group") return (
                            <div key={b.id} className="bg-[#f7f7fa] rounded overflow-hidden">
                              {b.items.map((it, idx) => (
                                <div key={it.id} className={`flex justify-between gap-2 text-[10px] px-2.5 py-1.5 ${idx<b.items.length-1?"border-b border-[#eee]":""}`}>
                                  <span className="text-[#aaa] flex-shrink-0">{renderVars(it.label)||"—"}</span>
                                  <span className={`text-right break-all ${it.emphasis?"font-bold text-[#111]":"text-[#555]"}`}>{renderVars(it.value)||"—"}</span>
                                </div>
                              ))}
                            </div>
                          )
                          if (b.kind === "image") return b.url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img key={b.id} src={b.url} alt="" className="w-full rounded object-cover" />
                            : <div key={b.id} className="w-full h-20 bg-[#f5f5f5] rounded flex items-center justify-center text-[#ccc] text-[10px]">Image</div>
                          if (b.kind === "button") return (
                            <div key={b.id} className={alignClass[b.align]}>
                              <a href={renderVars(b.url)||"#"} target="_blank" rel="noreferrer" className="inline-block text-[11px] font-bold px-4 py-2 rounded no-underline" style={{ background: b.bg, color: b.color }}>{renderVars(b.label)||"按鈕"}</a>
                            </div>
                          )
                          return <div key={b.id} className="border-t border-[#eee] my-0.5" />
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ 直接發送 ══ */}
          {tab === "send" && (
            <div className="flex flex-col gap-4 max-w-2xl">
              <div className="flex gap-2">
                {([["line","LINE 推播"] as const, ["email","Email 發信"] as const]).map(([k,l]) => (
                  <button key={k} onClick={() => { setSendCh(k); setSendResult(null) }}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${sendCh===k?"bg-black text-white border-black":"border-[#f0f0f0] text-[#555] hover:bg-[#fafafa]"}`}>
                    {l}
                  </button>
                ))}
              </div>

              {sendCh === "line" && (
                <div className="bg-white rounded-xl border border-[#f0f0f0] p-5 flex flex-col gap-4">
                  <p className="text-sm font-medium">發送 LINE 訊息</p>

                  <div>
                    <label className="text-xs text-[#aaa] mb-2 block">發送對象</label>
                    <div className="flex gap-2">
                      <button onClick={() => setLTarget("broadcast")} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${lTarget==="broadcast"?"bg-black text-white border-black":"border-[#f0f0f0] text-[#555]"}`}><Users size={14} />全體推播</button>
                      <button onClick={() => setLTarget("specific")}  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${lTarget==="specific" ?"bg-black text-white border-black":"border-[#f0f0f0] text-[#555]"}`}><User  size={14} />指定用戶</button>
                    </div>
                  </div>
                  {lTarget === "specific" && (
                    <div>
                      <label className="text-xs text-[#aaa] mb-1.5 block">LINE User ID</label>
                      <input value={lUserId} onChange={e => setLUserId(e.target.value)} placeholder="U1a2b3c4d5e6..." className={inp} />
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-[#aaa] mb-2 block">訊息類型</label>
                    <div className="flex gap-2">
                      {(["text","image"] as const).map(t => (
                        <button key={t} onClick={() => setLMsgType(t)} className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${lMsgType===t?"bg-black text-white border-black":"border-[#f0f0f0] text-[#555]"}`}>
                          {t==="text"?"文字":"圖片"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {lMsgType === "text" ? (
                    <div>
                      <label className="text-xs text-[#aaa] mb-1.5 block">訊息內容</label>
                      <textarea value={lText} onChange={e => setLText(e.target.value)} rows={4} maxLength={2000} placeholder="輸入文字訊息…" className={tinp} />
                      <p className="text-right text-[11px] text-[#ccc] mt-1">{lText.length} / 2000</p>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-[#aaa] mb-1.5 block">圖片網址（公開 HTTPS URL）</label>
                      <input value={lImgUrl} onChange={e => setLImgUrl(e.target.value)} placeholder="https://example.com/image.jpg" className={inp} />
                    </div>
                  )}

                  {sendResult && (
                    <div className={`px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 ${sendResult.ok?"bg-green-50 text-green-700 border border-green-100":"bg-red-50 text-red-600 border border-red-100"}`}>
                      {sendResult.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}{sendResult.msg}
                    </div>
                  )}
                  <button onClick={handleLineSend}
                    disabled={lSending||(lMsgType==="text"&&!lText.trim())||(lMsgType==="image"&&!lImgUrl.trim())||(lTarget==="specific"&&!lUserId.trim())}
                    className="flex items-center gap-2 bg-[#06C755] hover:bg-[#05b34d] disabled:opacity-40 text-white text-sm px-5 py-2.5 rounded-lg transition-colors font-medium">
                    {lSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    {lSending ? "發送中…" : "發送訊息"}
                  </button>
                </div>
              )}

              {sendCh === "email" && (
                <div className="bg-white rounded-xl border border-[#f0f0f0] p-5 flex flex-col gap-4">
                  <p className="text-sm font-medium">發送 Email</p>

                  <div>
                    <label className="text-xs text-[#aaa] mb-2 block">發送對象</label>
                    <div className="flex gap-2">
                      <button onClick={() => setETarget("broadcast")} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${eTarget==="broadcast"?"bg-black text-white border-black":"border-[#f0f0f0] text-[#555]"}`}><Users size={14} />全體發信</button>
                      <button onClick={() => setETarget("specific")}  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${eTarget==="specific" ?"bg-black text-white border-black":"border-[#f0f0f0] text-[#555]"}`}><User  size={14} />指定收件人</button>
                    </div>
                  </div>
                  {eTarget === "specific" && (
                    <div>
                      <label className="text-xs text-[#aaa] mb-1.5 block">收件人 Email</label>
                      <input type="email" value={eTo} onChange={e => setETo(e.target.value)} placeholder="student@example.com" className={inp} />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-[#aaa] mb-1.5 block">主旨</label>
                    <input value={eSubject} onChange={e => setESubject(e.target.value)} placeholder="例：課前提醒通知" className={inp} />
                  </div>
                  <div>
                    <label className="text-xs text-[#aaa] mb-1.5 block">郵件內容</label>
                    <textarea value={eBody} onChange={e => setEBody(e.target.value)} rows={5} maxLength={5000} placeholder="輸入郵件正文…" className={tinp} />
                    <p className="text-right text-[11px] text-[#ccc] mt-1">{eBody.length} / 5000</p>
                  </div>

                  {sendResult && (
                    <div className={`px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 ${sendResult.ok?"bg-green-50 text-green-700 border border-green-100":"bg-red-50 text-red-600 border border-red-100"}`}>
                      {sendResult.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}{sendResult.msg}
                    </div>
                  )}
                  <button onClick={handleEmailSend}
                    disabled={eSending||!eSubject.trim()||!eBody.trim()||(eTarget==="specific"&&!eTo.trim())}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm px-5 py-2.5 rounded-lg transition-colors font-medium">
                    {eSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    {eSending ? "發送中…" : "發送郵件"}
                  </button>
                </div>
              )}

              {/* 發送紀錄 */}
              <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#f5f5f5] flex items-center gap-2">
                  <Clock size={14} className="text-[#aaa]" />
                  <p className="text-sm font-medium">發送紀錄</p>
                </div>
                <div className="divide-y divide-[#f5f5f5]">
                  {history.filter(h => h.ch === (sendCh === "line" ? "LINE" : "Email")).map(h => (
                    <div key={h.id} className="px-5 py-3.5 flex items-start gap-3">
                      <div className={`mt-0.5 shrink-0 ${h.ok?"text-green-500":"text-red-400"}`}>
                        {h.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-1">{h.content}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[#aaa]">
                          <span>{h.target}</span><span>·</span><span>{h.sentAt}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {history.filter(h => h.ch === (sendCh === "line" ? "LINE" : "Email")).length === 0 && (
                    <div className="px-5 py-10 text-center text-sm text-[#ccc]">尚無發送紀錄</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Sub-components ─── */
function BlockBox({ title, desc, enabled, onToggle, children }: { title: string; desc: string; enabled: boolean; onToggle?: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs font-medium text-[#333]">{title}</p>
          <p className="text-[10px] text-[#aaa]">{desc}</p>
        </div>
        {onToggle && (
          <button onClick={() => onToggle(!enabled)} className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${enabled?"bg-black":"bg-[#e0e0e0]"}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${enabled?"left-4":"left-0.5"}`} />
          </button>
        )}
      </div>
      {enabled && children}
    </div>
  )
}

function CI({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border border-[#f0f0f0] p-0" />
}

function AB({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="px-2.5 py-1.5 rounded-lg border border-dashed border-green-200 text-green-600 hover:bg-green-50 text-[11px] transition-colors">{children}</button>
}

function EAB({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="px-2.5 py-1.5 rounded-lg border border-dashed border-blue-200 text-blue-600 hover:bg-blue-50 text-[11px] transition-colors">{children}</button>
}

function VariableBar({ onInsert }: { onInsert: (key: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-3">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between text-xs font-medium text-[#333]">
        <span>🔖 可調用變數（點欄位後再點此插入）</span>
        <span className="text-[#aaa]">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {TEMPLATE_VARS.map(v => (
            <button key={v.key} onClick={() => onInsert(v.key)} title={`{{${v.key}}}｜範例：${v.sample}`}
              className="px-2 py-1 rounded-md border border-[#f0f0f0] text-[11px] text-[#555] hover:border-black hover:text-black transition-colors">
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
