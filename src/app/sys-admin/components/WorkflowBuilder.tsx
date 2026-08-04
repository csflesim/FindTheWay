"use client"

import React, { useRef, useState, useEffect, useCallback } from "react"
import { useToast } from "./Toast"
import { useConfirm } from "./Confirm"
import { loadStoredTemplates, DEFAULT_STORED_TEMPLATES, type StoredTemplate } from "@/lib/templateStore"
import { loadWorkflows, saveWorkflows, type SavedWorkflow } from "@/lib/workflowStore"

/* ─────────────── 型別與常數 ─────────────── */

type NodeKind = "trigger" | "email" | "line" | "notify" | "social" | "condition" | "delay"
type TriggerType = "payment" | "order" | "manual" | "schedule" | "line-bind" | "social"
type PaymentEvent = "paid" | "pending" | "failed"
type OrderEvent = "created" | "confirmed" | "cancelled" | "completed"
type SocialPlatform = "ig" | "fb" | "threads"
type Port = "out" | "true" | "false"

interface FlowNode {
  id: string; kind: NodeKind; x: number; y: number
  triggerType?: TriggerType; paymentEvent?: PaymentEvent; orderEvent?: OrderEvent
  cron?: string; socialPlatform?: SocialPlatform; socialKeyword?: string
  socialAction?: "reply" | "dm"; socialText?: string
  perUserLimit?: number; cooldownValue?: number; cooldownUnit?: "minutes" | "hours" | "days"
  template?: string; emailTemplate?: string; lineTemplate?: string
  condField?: "payStatus" | "isRead" | "amount"; condOp?: "eq" | "neq" | "gt" | "lt"
  condValue?: string
  delayMode?: "delay" | "at" | "cron"; delayValue?: number; delayUnit?: "minutes" | "hours" | "days"
  delayAt?: string; delayCron?: string
}
interface Edge { id: string; from: string; fromPort: Port; to: string }

export interface WorkflowConfig {
  variant: "general" | "social"
  storageKey: string
  title: string
  badge: string
  subtitle: string
}

const NODE_W = 210
const NODE_H = 72

const KIND_META: Record<NodeKind, { label: string; icon: string; color: string; light: string }> = {
  trigger:   { label: "觸發",      icon: "⚡", color: "#f59e0b", light: "bg-amber-50 border-amber-200"   },
  email:     { label: "寄 Email",  icon: "✉️", color: "#3b82f6", light: "bg-blue-50 border-blue-200"    },
  line:      { label: "推 LINE",   icon: "🟢", color: "#06C755", light: "bg-green-50 border-green-200"  },
  notify:    { label: "寄信+推播", icon: "📣", color: "#6366f1", light: "bg-indigo-50 border-indigo-200"},
  social:    { label: "社群發送",  icon: "💬", color: "#ec4899", light: "bg-pink-50 border-pink-200"    },
  condition: { label: "條件分支",  icon: "🔀", color: "#8b5cf6", light: "bg-violet-50 border-violet-200"},
  delay:     { label: "時間控制",  icon: "⏱️", color: "#38bdf8", light: "bg-sky-50 border-sky-200"      },
}
const TRIGGER_LABEL: Record<TriggerType, string> = {
  payment: "付款事件", order: "報名事件", social: "社群留言",
  manual: "手動測試觸發", schedule: "排程 / 定時", "line-bind": "LINE 綁定完成",
}
const SOCIAL_LABEL: Record<SocialPlatform, string> = { ig: "Instagram", fb: "Facebook", threads: "Threads" }
const PAYMENT_LABEL: Record<PaymentEvent, string> = { paid: "付款成功", pending: "待付款", failed: "付款失敗" }
const ORDER_LABEL: Record<OrderEvent, string> = { created: "報名建立", confirmed: "報名確認", cancelled: "報名取消", completed: "課程完成" }

const DEFAULT_EMAIL_TPL = DEFAULT_STORED_TEMPLATES.find(t => t.emailOn)?.name
const DEFAULT_LINE_TPL  = DEFAULT_STORED_TEMPLATES.find(t => t.lineOn)?.name

let idSeq = 0
const nid = (p: string) => `${p}_${Date.now()}_${idSeq++}`

function makeNode(kind: NodeKind, x: number, y: number): FlowNode {
  const base: FlowNode = { id: nid(kind), kind, x, y }
  if (kind === "trigger")   return { ...base, triggerType: "payment", paymentEvent: "paid", perUserLimit: 0, cooldownValue: 0, cooldownUnit: "hours" }
  if (kind === "email")     return { ...base, template: DEFAULT_EMAIL_TPL }
  if (kind === "line")      return { ...base, template: DEFAULT_LINE_TPL }
  if (kind === "notify")    return { ...base, emailTemplate: DEFAULT_EMAIL_TPL, lineTemplate: DEFAULT_LINE_TPL }
  if (kind === "social")    return { ...base, socialPlatform: "ig", socialAction: "dm", socialText: "感謝參與！{{message}}" }
  if (kind === "condition") return { ...base, condField: "payStatus", condOp: "eq", condValue: "paid" }
  if (kind === "delay")     return { ...base, delayMode: "delay", delayValue: 1, delayUnit: "hours" }
  return base
}
const socialTriggerNode = (x: number, y: number): FlowNode => ({ ...makeNode("trigger", x, y), id: nid("n"), triggerType: "social", paymentEvent: undefined, socialPlatform: "ig", socialKeyword: "#贈品" })

function nodeSubtitle(n: FlowNode): string {
  if (n.kind === "trigger") {
    if (n.triggerType === "payment") return `金流：${PAYMENT_LABEL[n.paymentEvent ?? "paid"]}`
    if (n.triggerType === "order")   return `報名：${ORDER_LABEL[n.orderEvent ?? "created"]}`
    if (n.triggerType === "social")  return `${SOCIAL_LABEL[n.socialPlatform ?? "ig"]}：「${n.socialKeyword || "?"}」`
    if (n.triggerType === "schedule") return `排程：${n.cron || "尚未設定"}`
    return TRIGGER_LABEL[n.triggerType ?? "manual"]
  }
  if (n.kind === "email") return n.template ?? "（未選模板）"
  if (n.kind === "line")  return n.template ?? "（未選模板）"
  if (n.kind === "notify") return "Email + LINE 雙通道"
  if (n.kind === "social") return `${SOCIAL_LABEL[n.socialPlatform ?? "ig"]}｜${n.socialAction === "reply" ? "公開回覆" : "私訊"}`
  if (n.kind === "condition") {
    const f = { payStatus: "付款狀態", isRead: "已讀", amount: "金額" }[n.condField ?? "payStatus"]
    const op = { eq: "=", neq: "≠", gt: ">", lt: "<" }[n.condOp ?? "eq"]
    return `${f} ${op} ${n.condValue || "?"}`
  }
  if (n.kind === "delay") {
    if (n.delayMode === "at")   return `指定時間：${n.delayAt || "尚未設定"}`
    if (n.delayMode === "cron") return `週期：${n.delayCron || "尚未設定"}`
    return `延遲 ${n.delayValue} ${{ minutes: "分", hours: "時", days: "天" }[n.delayUnit ?? "hours"]}`
  }
  return ""
}

function inPort(n: FlowNode)  { return { x: n.x + NODE_W / 2, y: n.y } }
function outPort(n: FlowNode, port: Port) {
  if (n.kind === "condition") {
    if (port === "true")  return { x: n.x + NODE_W * 0.28, y: n.y + NODE_H }
    if (port === "false") return { x: n.x + NODE_W * 0.72, y: n.y + NODE_H }
  }
  return { x: n.x + NODE_W / 2, y: n.y + NODE_H }
}
const bezier = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  `M ${a.x} ${a.y} C ${a.x} ${a.y + 50}, ${b.x} ${b.y - 50}, ${b.x} ${b.y}`

/* ─────────────── 預設流程 ─────────────── */

function generalDefaultFlow(): { nodes: FlowNode[]; edges: Edge[] } {
  const trigger = { ...makeNode("trigger", 80, 60),  id: "n_trigger" }
  const email   = { ...makeNode("email",   80, 230),  id: "n_email"   }
  const line    = { ...makeNode("line",    340, 230), id: "n_line"    }
  return { nodes: [trigger, email, line], edges: [{ id: "e1", from: "n_trigger", fromPort: "out", to: "n_email" }, { id: "e2", from: "n_trigger", fromPort: "out", to: "n_line" }] }
}
function socialDefaultFlow(): { nodes: FlowNode[]; edges: Edge[] } {
  const t = socialTriggerNode(100, 60)
  const s = { ...makeNode("social", 100, 240), id: nid("n"), socialPlatform: "ig" as SocialPlatform, socialAction: "dm" as const }
  return { nodes: [t, s], edges: [{ id: nid("e"), from: t.id, fromPort: "out", to: s.id }] }
}

interface FlowTemplate {
  id: string; name: string; icon: string; desc: string; category: string
  badges: { trigger?: string; timing?: string; action?: string }
  build: () => { nodes: FlowNode[]; edges: Edge[] }
}

const GENERAL_TEMPLATES: FlowTemplate[] = [
  { id: "blank", name: "空白流程", icon: "➕", desc: "只有一個手動觸發節點，從零開始編排。", category: "基礎", badges: { trigger: "手動" }, build: () => ({ nodes: [{ ...makeNode("trigger", 100, 80), id: nid("n"), triggerType: "manual" }], edges: [] }) },
  { id: "pay-notify", name: "付款雙通道通知", icon: "💳", desc: "付款成功 → 同時寄 Email 與推 LINE。", category: "通知", badges: { trigger: "付款事件", timing: "立即", action: "寄信+推播" }, build: () => { const t = { ...makeNode("trigger", 100, 60), id: nid("n"), triggerType: "payment" as TriggerType, paymentEvent: "paid" as PaymentEvent }; const nn = { ...makeNode("notify", 100, 240), id: nid("n") }; return { nodes: [t, nn], edges: [{ id: nid("e"), from: t.id, fromPort: "out", to: nn.id }] } } },
  { id: "enroll-remind", name: "報名成功通知", icon: "📋", desc: "報名確認 → 立即寄 Email 與推 LINE。", category: "通知", badges: { trigger: "報名事件", timing: "立即", action: "寄信+推播" }, build: () => { const t = { ...makeNode("trigger", 100, 60), id: nid("n"), triggerType: "order" as TriggerType, orderEvent: "confirmed" as OrderEvent }; const nn = { ...makeNode("notify", 100, 240), id: nid("n") }; return { nodes: [t, nn], edges: [{ id: nid("e"), from: t.id, fromPort: "out", to: nn.id }] } } },
  { id: "course-reminder", name: "課前 24 小時提醒", icon: "⏰", desc: "報名確認 → 延遲至課前 24 小時 → 推 LINE。", category: "通知", badges: { trigger: "報名事件", timing: "延遲", action: "推 LINE" }, build: () => { const t = { ...makeNode("trigger", 100, 60), id: nid("n"), triggerType: "order" as TriggerType, orderEvent: "confirmed" as OrderEvent }; const d = { ...makeNode("delay", 100, 230), id: nid("n"), delayValue: 24, delayUnit: "hours" as const }; const l = { ...makeNode("line", 100, 400), id: nid("n") }; return { nodes: [t, d, l], edges: [{ id: nid("e"), from: t.id, fromPort: "out", to: d.id }, { id: nid("e"), from: d.id, fromPort: "out", to: l.id }] } } },
]
const SOCIAL_TEMPLATES: FlowTemplate[] = [
  { id: "blank-social", name: "空白流程", icon: "➕", desc: "只有一個社群留言觸發，從零開始編排。", category: "基礎", badges: { trigger: "社群留言" }, build: () => ({ nodes: [socialTriggerNode(100, 80)], edges: [] }) },
  { id: "social-gift", name: "留言關鍵字發贈品", icon: "🎁", desc: "IG 留言含關鍵字 → 私訊發送贈品序號。", category: "行銷", badges: { trigger: "社群留言", timing: "立即", action: "私訊" }, build: socialDefaultFlow },
]

/* ─────────────── 主元件 ─────────────── */

export default function WorkflowBuilder({ config }: { config: WorkflowConfig }) {
  const showToast = useToast()
  const confirm   = useConfirm()
  const isSocial  = config.variant === "social"
  const paletteKinds: NodeKind[]       = isSocial ? ["trigger", "social", "condition", "delay"] : ["trigger", "email", "line", "notify", "condition", "delay"]
  const allowedTriggers: TriggerType[] = isSocial ? ["social", "manual"] : ["payment", "order", "manual", "schedule", "line-bind"]
  const templates    = isSocial ? SOCIAL_TEMPLATES : GENERAL_TEMPLATES
  const buildDefault = isSocial ? socialDefaultFlow : generalDefaultFlow

  const init = buildDefault()
  const [nodes, setNodes] = useState<FlowNode[]>(init.nodes)
  const [edges, setEdges] = useState<Edge[]>(init.edges)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pending, setPending] = useState<{ from: string; port: Port } | null>(null)
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)
  const [runCount, setRunCount] = useState(0)
  const [log, setLog] = useState<{ id: string; text: string; tone: "info" | "ok" | "branch" | "err" }[]>([])

  // 測試觸發收件目標（有填才會真的發送，否則純模擬）
  const [testEmail, setTestEmail] = useState("")
  const [testLineId, setTestLineId] = useState("")
  useEffect(() => {
    try {
      const s = localStorage.getItem("ftw.workflow-test.v1")
      if (s) {
        const p = JSON.parse(s)
        if (typeof p.email === "string") setTestEmail(p.email)
        if (typeof p.lineId === "string") setTestLineId(p.lineId)
      }
    } catch {}
    // LINE whoami 授權回來：自動填入取得的 User ID
    try {
      const q = new URLSearchParams(window.location.search)
      const uid = q.get("lineUserId")
      if (uid) {
        setTestLineId(uid)
        const name = q.get("lineName")
        showToast(`已取得 ${name ? `${name} 的 ` : ""}LINE User ID`, "success")
        window.history.replaceState({}, "", window.location.pathname)
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    try { localStorage.setItem("ftw.workflow-test.v1", JSON.stringify({ email: testEmail, lineId: testLineId })) } catch {}
  }, [testEmail, testLineId])

  const wrapRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: string; offX: number; offY: number } | null>(null)

  const [storedTpls, setStoredTpls] = useState<StoredTemplate[]>(DEFAULT_STORED_TEMPLATES)
  useEffect(() => { const l = loadStoredTemplates(); if (l.length) setStoredTpls(l) }, [])
  const emailTplNames = storedTpls.filter(t => t.emailOn).map(t => t.name)
  const lineTplNames  = storedTpls.filter(t => t.lineOn).map(t => t.name)

  const [flows, setFlows]               = useState<SavedWorkflow[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [tplCategory, setTplCategory]   = useState("全部")
  const [tplSearch, setTplSearch]       = useState("")
  const [activeFlowId, setActiveFlowId] = useState<string>("")
  const initedRef = useRef(false)

  useEffect(() => {
    const loaded = loadWorkflows(config.storageKey)
    if (loaded.length) {
      setFlows(loaded); setActiveFlowId(loaded[0].id)
      setNodes(loaded[0].nodes as FlowNode[]); setEdges(loaded[0].edges as Edge[])
    } else {
      const d = buildDefault()
      const first: SavedWorkflow = { id: nid("wf"), name: "預設流程", nodes: d.nodes, edges: d.edges }
      setFlows([first]); setActiveFlowId(first.id); setNodes(d.nodes); setEdges(d.edges)
      saveWorkflows([first], config.storageKey)
    }
    initedRef.current = true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!initedRef.current || !activeFlowId) return
    setFlows(prev => { const next = prev.map(f => f.id === activeFlowId ? { ...f, nodes, edges } : f); saveWorkflows(next, config.storageKey); return next })
  }, [nodes, edges, activeFlowId, config.storageKey])

  const clearSelection = () => { setSelectedId(null); setNodeDraft(null) }
  const switchFlow = (id: string) => { const f = flows.find(w => w.id === id); if (!f) return; setActiveFlowId(id); setNodes(f.nodes as FlowNode[]); setEdges(f.edges as Edge[]); clearSelection() }
  const addFlowFrom = (tpl: FlowTemplate) => {
    const d = tpl.build()
    const f: SavedWorkflow = { id: nid("wf"), name: `${tpl.id.startsWith("blank") ? "新流程" : tpl.name} ${flows.length + 1}`, nodes: d.nodes, edges: d.edges }
    setFlows(prev => { const next = [...prev, f]; saveWorkflows(next, config.storageKey); return next })
    setActiveFlowId(f.id); setNodes(d.nodes); setEdges(d.edges); clearSelection()
    setShowTemplates(false); showToast(`已從「${tpl.name}」建立工作流`, "success")
  }
  const removeFlow = async (id: string) => {
    if (flows.length <= 1) return showToast("至少需保留一份工作流", "error")
    const f = flows.find(w => w.id === id)
    const ok = await confirm({ title: "刪除工作流", message: `確定要刪除工作流「${f?.name ?? ""}」？此動作無法復原。`, confirmText: "刪除", danger: true })
    if (!ok) return
    const next = flows.filter(f => f.id !== id); setFlows(next); saveWorkflows(next, config.storageKey)
    if (activeFlowId === id) { setActiveFlowId(next[0].id); setNodes(next[0].nodes as FlowNode[]); setEdges(next[0].edges as Edge[]) }
    showToast("已刪除工作流", "info")
  }
  const patchFlow = (patch: Partial<SavedWorkflow>) =>
    setFlows(prev => { const next = prev.map(f => f.id === activeFlowId ? { ...f, ...patch } : f); saveWorkflows(next, config.storageKey); return next })
  const renameFlow = (name: string) => patchFlow({ name })
  const activeFlow = flows.find(f => f.id === activeFlowId)

  const selected = nodes.find(n => n.id === selectedId) ?? null
  const [nodeDraft, setNodeDraft] = useState<FlowNode | null>(null)
  const cloneNode = (n: FlowNode): FlowNode => ({ ...n })
  const pickNode = (n: FlowNode) => { if (selectedId === n.id) return; setSelectedId(n.id); setNodeDraft(cloneNode(n)) }
  const nodeDirty = !!nodeDraft && !!selected && JSON.stringify({ ...nodeDraft, x: 0, y: 0 }) !== JSON.stringify({ ...selected, x: 0, y: 0 })
  const saveNode  = () => { if (!nodeDraft) return; setNodes(prev => prev.map(n => n.id === nodeDraft.id ? { ...nodeDraft, x: n.x, y: n.y } : n)); showToast("節點已儲存", "success") }

  const toContent = useCallback((clientX: number, clientY: number) => {
    const el = wrapRef.current; if (!el) return { x: clientX, y: clientY }
    const r = el.getBoundingClientRect()
    return { x: clientX - r.left + el.scrollLeft, y: clientY - r.top + el.scrollTop }
  }, [])

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (dragRef.current) {
        const p = toContent(e.clientX, e.clientY)
        const { id, offX, offY } = dragRef.current
        setNodes(prev => prev.map(n => n.id === id ? { ...n, x: Math.max(0, p.x - offX), y: Math.max(0, p.y - offY) } : n))
      }
      if (pending) setMouse(toContent(e.clientX, e.clientY))
    }
    const up = () => { dragRef.current = null }
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up)
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up) }
  }, [pending, toContent])

  const startDrag = (e: React.PointerEvent, n: FlowNode) => {
    e.stopPropagation(); if (pending) return
    const p = toContent(e.clientX, e.clientY)
    dragRef.current = { id: n.id, offX: p.x - n.x, offY: p.y - n.y }; pickNode(n)
  }
  const startConnect   = (e: React.PointerEvent, from: string, port: Port) => { e.stopPropagation(); setPending({ from, port }); setMouse(toContent(e.clientX, e.clientY)) }
  const completeConnect = (e: React.SyntheticEvent, to: string) => {
    e.stopPropagation(); if (!pending) return
    if (pending.from === to) { setPending(null); return }
    const target = nodes.find(n => n.id === to)
    if (target?.kind === "trigger") { showToast("觸發節點不能作為目標", "error"); setPending(null); return }
    const dup = edges.some(ed => ed.from === pending.from && ed.fromPort === pending.port && ed.to === to)
    if (!dup) setEdges(prev => [...prev, { id: nid("e"), from: pending.from, fromPort: pending.port, to }])
    setPending(null)
  }

  const addNode = (kind: NodeKind) => {
    let n = makeNode(kind, 120 + (nodes.length % 4) * 40, 120 + (nodes.length % 5) * 40)
    if (kind === "trigger" && isSocial) n = { ...n, triggerType: "social", paymentEvent: undefined, socialPlatform: "ig", socialKeyword: "#贈品" }
    setNodes(prev => [...prev, n]); setSelectedId(n.id); setNodeDraft(cloneNode(n))
  }
  const deleteNode = async (id: string) => {
    const n = nodes.find(x => x.id === id)
    const ok = await confirm({ title: "刪除節點", message: `確定要刪除「${n ? KIND_META[n.kind].label : "此"}」節點？相關連線也會一併移除。`, confirmText: "刪除", danger: true })
    if (!ok) return
    setNodes(prev => prev.filter(n => n.id !== id)); setEdges(prev => prev.filter(e => e.from !== id && e.to !== id))
    if (selectedId === id) clearSelection()
  }
  const deleteEdge = (id: string) => setEdges(prev => prev.filter(e => e.id !== id))

  // 真實寄送：套用模板內容打 /api/email/send、/api/line/send
  const findTpl = (name?: string) => storedTpls.find(t => t.name === name)

  const sendRealEmail = async (tplName?: string): Promise<{ ok: boolean; error?: string }> => {
    const tpl = findTpl(tplName)
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmail.trim(),
          subject: tpl?.emailSubject || `【工作流測試】${tplName ?? "通知"}`,
          html: tpl?.emailHtml || undefined,
          text: tpl?.emailHtml ? undefined : `這是工作流「${tplName ?? "通知"}」的測試信。`,
        }),
      })
      const d = await res.json()
      return d.ok ? { ok: true } : { ok: false, error: d.error }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  }

  const sendRealLine = async (tplName?: string): Promise<{ ok: boolean; error?: string }> => {
    const tpl = findTpl(tplName)
    try {
      const res = await fetch("/api/line/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testLineId.trim(),
          messages: [{ type: "text", text: tpl?.lineText || `這是工作流「${tplName ?? "通知"}」的測試訊息。` }],
        }),
      })
      const d = await res.json()
      return d.ok ? { ok: true } : { ok: false, error: d.error ?? JSON.stringify(d) }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  }

  const runFlow = async () => {
    if (running) return
    const trigger = nodes.find(n => n.kind === "trigger")
    if (!trigger) return showToast("流程缺少觸發節點", "error")
    const realEmail = !!testEmail.trim()
    const realLine  = !!testLineId.trim()
    setRunning(true); setLog([])
    const pushLog = (text: string, tone: "info" | "ok" | "branch" | "err" = "info") => setLog(prev => [...prev, { id: nid("l"), text, tone }])
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

    const doEmail = async (tplName?: string) => {
      if (!realEmail) { pushLog(`✉️ 寄送 Email（套用「${tplName}」）→ 模擬呼叫`, "ok"); return }
      pushLog(`✉️ 寄送 Email（「${tplName}」）→ ${testEmail.trim()}…`, "info")
      const r = await sendRealEmail(tplName)
      pushLog(r.ok ? `✉️ Email 已寄出 ✓` : `✉️ Email 失敗：${r.error}`, r.ok ? "ok" : "err")
    }
    const doLine = async (tplName?: string) => {
      if (!realLine) { pushLog(`🟢 推播 LINE（「${tplName}」）→ 模擬呼叫`, "ok"); return }
      pushLog(`🟢 推播 LINE（「${tplName}」）→ ${testLineId.trim().slice(0, 8)}…`, "info")
      const r = await sendRealLine(tplName)
      pushLog(r.ok ? `🟢 LINE 已送出 ✓` : `🟢 LINE 失敗：${r.error}`, r.ok ? "ok" : "err")
    }

    let current: FlowNode | undefined = trigger; let steps = 0
    while (current && steps < 50) {
      steps++; setActiveId(current.id)
      if (current.kind === "trigger")    pushLog(`⚡ 觸發：${nodeSubtitle(current)}`, "info")
      else if (current.kind === "email")  await doEmail(current.template)
      else if (current.kind === "line")   await doLine(current.template)
      else if (current.kind === "notify") { pushLog(`📣 雙通道通知`, "info"); await doEmail(current.emailTemplate); await doLine(current.lineTemplate) }
      else if (current.kind === "social") pushLog(`💬 ${SOCIAL_LABEL[current.socialPlatform ?? "ig"]} ${current.socialAction === "reply" ? "公開回覆" : "私訊"} → 模擬發送`, "ok")
      else if (current.kind === "delay")  pushLog(`⏱️ 等待 ${nodeSubtitle(current)} 後繼續…（測試模式跳過等待）`, "info")
      else if (current.kind === "condition") pushLog(`🔀 判斷 ${nodeSubtitle(current)} → 成立，走「是」分支`, "branch")
      await sleep(650)
      const here: FlowNode = current
      const port: Port = here.kind === "condition" ? "true" : "out"
      const nextEdge = edges.find(e => e.from === here.id && e.fromPort === port)
      current = nextEdge ? nodes.find(n => n.id === nextEdge.to) : undefined
    }
    setActiveId(null); pushLog("✅ 流程執行結束", "ok")
    setRunning(false); setLastRun(new Date().toTimeString().slice(0, 8)); setRunCount(c => c + 1)
    showToast(realEmail || realLine ? "測試觸發完成（含真實發送）" : "流程模擬執行完成", "success")
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors"

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <header className="flex items-center justify-between mb-5 pb-4 border-b border-[#f0f0f0]">
        <div>
          <h1 className="text-xl font-medium flex items-center gap-2">
            {config.title}
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#f5f5f5] text-[#777] border border-[#eee] font-normal">{config.badge}</span>
          </h1>
          <p className="text-xs text-[#aaa] mt-1">{config.subtitle}</p>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5 min-h-0">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-8">
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
            <p className="text-xs text-[#aaa] mb-3">工作流列表（{flows.length}）</p>
            <button onClick={() => setShowTemplates(true)} className="w-full mb-3 px-2.5 py-2 rounded-lg border border-dashed border-[#ddd] text-[#666] hover:bg-[#fafafa] text-xs transition">
              ＋ 新增流程（從模板）
            </button>
            <div className="flex flex-col gap-1">
              {flows.map(f => (
                <button key={f.id} onClick={() => switchFlow(f.id)} className={`group flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition text-sm ${f.id === activeFlowId ? "bg-black text-white border-black" : "border-[#f0f0f0] text-[#333] hover:bg-[#fafafa]"}`}>
                  <span className="truncate flex-1">{f.name}</span>
                  {f.enabled === false && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#f0f0f0] text-[#999] flex-shrink-0">停用</span>}
                  {flows.length > 1 && <span onClick={e => { e.stopPropagation(); removeFlow(f.id) }} className={`text-xs opacity-0 group-hover:opacity-100 transition flex-shrink-0 ${f.id === activeFlowId ? "text-white/60 hover:text-white" : "text-[#ccc] hover:text-red-500"}`}>✕</span>}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex flex-col min-h-0">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "總工作流",   value: String(flows.length),          sub: `${flows.filter(f => f.enabled !== false).length} 個啟用中` },
              { label: "啟用中",     value: String(flows.filter(f => f.enabled !== false).length), sub: "可被觸發" },
              { label: "本流程節點", value: String(nodes.length),          sub: `${edges.length} 條連線` },
              { label: "最近測試",   value: lastRun ?? "—",                sub: lastRun ? `共 ${runCount} 次` : "從未執行" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-[#f0f0f0] px-4 py-3">
                <p className="text-[10px] text-[#aaa]">{s.label}</p>
                <p className="text-xl font-medium mt-0.5">{s.value}</p>
                <p className="text-[10px] text-[#ccc]">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* 基礎設定 */}
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-4 mb-4">
            <p className="text-xs text-[#aaa] mb-3">基礎設定</p>
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex flex-col gap-1 shrink-0">
                <label className="text-xs text-[#aaa]">流程名稱</label>
                <input type="text" value={activeFlow?.name ?? ""} onChange={e => renameFlow(e.target.value)} className={`${inputCls} md:w-52`} />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-[#aaa]">流程描述（選填）</label>
                <input type="text" value={activeFlow?.description ?? ""} onChange={e => patchFlow({ description: e.target.value })} placeholder="這個流程的用途說明" className={inputCls} />
              </div>
              <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition shrink-0 ${activeFlow?.enabled !== false ? "bg-[#f0fdf4] border-green-200 text-green-700" : "border-[#f0f0f0] text-[#aaa] hover:bg-[#fafafa]"}`}>
                <input type="checkbox" checked={activeFlow?.enabled !== false} onChange={e => patchFlow({ enabled: e.target.checked })} className="accent-green-600" />啟用流程
              </label>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs text-[#aaa] mr-1">新增節點：</span>
            {paletteKinds.map(k => (
              <button key={k} onClick={() => addNode(k)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#f0f0f0] text-xs text-[#555] hover:bg-[#fafafa] transition bg-white">
                <span>{KIND_META[k].icon}</span>{KIND_META[k].label}
              </button>
            ))}
            <span className="flex-1" />
            <input
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="測試 Email（選填）"
              className="w-44 px-2.5 py-1.5 rounded-lg border border-[#f0f0f0] text-xs outline-none focus:border-black transition bg-white"
            />
            <div className="relative">
              <input
                value={testLineId}
                onChange={e => setTestLineId(e.target.value)}
                placeholder="測試 LINE User ID（選填）"
                className="w-56 pl-2.5 pr-20 py-1.5 rounded-lg border border-[#f0f0f0] text-xs outline-none focus:border-black transition bg-white"
              />
              <a
                href={`/api/auth/line?mode=whoami&next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/sys-admin/line-workflows")}`}
                title="以 LINE 授權自動取得你的 User ID（不影響後台登入）"
                className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md text-[10px] font-medium text-white bg-[#06C755] hover:bg-[#05b34d] transition"
              >
                LINE 取得
              </a>
            </div>
            <button onClick={runFlow} disabled={running} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-black hover:bg-[#222] disabled:opacity-50 transition"
              title={testEmail.trim() || testLineId.trim() ? "會真實發送到填入的目標" : "未填目標，僅模擬執行"}>
              {running ? "執行中…" : "▶ 測試觸發"}
            </button>
          </div>

          {/* Canvas + panel */}
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 min-h-0">
            <div ref={wrapRef} onClick={() => { clearSelection(); setPending(null) }}
              className="relative overflow-auto rounded-xl border border-[#f0f0f0] bg-white min-h-[420px]"
              style={{ backgroundImage: "radial-gradient(#e5e5e5 1px, transparent 1px)", backgroundSize: "22px 22px" }}>
              <div className="relative" style={{ width: 1600, height: 1000 }}>
                <svg className="absolute inset-0 pointer-events-none" width={1600} height={1000}>
                  {edges.map(e => {
                    const from = nodes.find(n => n.id === e.from); const to = nodes.find(n => n.id === e.to)
                    if (!from || !to) return null
                    const a = outPort(from, e.fromPort); const b = inPort(to)
                    const color = e.fromPort === "true" ? "#16a34a" : e.fromPort === "false" ? "#dc2626" : "#6366f1"
                    return (
                      <g key={e.id} className="pointer-events-auto cursor-pointer" onClick={ev => { ev.stopPropagation(); deleteEdge(e.id) }}>
                        <path d={bezier(a, b)} stroke="transparent" strokeWidth={14} fill="none" />
                        <path d={bezier(a, b)} stroke={color} strokeWidth={1.5} fill="none" markerEnd="url(#arrow-l)" />
                      </g>
                    )
                  })}
                  {pending && mouse && (() => { const from = nodes.find(n => n.id === pending.from); if (!from) return null; const a = outPort(from, pending.port); return <path d={bezier(a, mouse)} stroke="#6366f1" strokeWidth={1.5} strokeDasharray="5 4" fill="none" /> })()}
                  <defs><marker id="arrow-l" markerWidth={9} markerHeight={9} refX={7} refY={3} orient="auto" markerUnits="strokeWidth"><path d="M0,0 L7,3 L0,6 Z" fill="#6366f1" /></marker></defs>
                </svg>

                {nodes.map(n => {
                  const meta = KIND_META[n.kind]; const isActive = activeId === n.id; const isSel = selectedId === n.id
                  return (
                    <div key={n.id} onPointerDown={e => startDrag(e, n)} onClick={e => { e.stopPropagation(); pickNode(n) }}
                      className={`absolute rounded-xl border bg-white shadow-sm select-none cursor-grab active:cursor-grabbing group transition-shadow ${isActive ? "ring-2 ring-indigo-400 border-indigo-200 shadow-md" : isSel ? "ring-2 ring-black/20 border-[#ddd] shadow-md" : "border-[#e5e5e5] hover:shadow-md hover:border-[#ddd]"}`}
                      style={{ left: n.x, top: n.y, width: NODE_W, height: NODE_H }}>
                      {n.kind !== "trigger" && (
                        <span onPointerDown={e => { if (pending) completeConnect(e, n.id) }} onClick={e => { if (pending) completeConnect(e, n.id) }}
                          className={`absolute left-1/2 -translate-x-1/2 -top-2 w-3 h-3 rounded-full border-2 border-white shadow-sm ${pending ? "bg-indigo-500 scale-125" : "bg-[#ccc]"} transition`} />
                      )}
                      <div className="flex items-center gap-2 px-3 h-full">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 border ${meta.light}`}>{meta.icon}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-[#111]">{meta.label}</p>
                          <p className="text-[10px] text-[#888] truncate">{nodeSubtitle(n)}</p>
                        </div>
                        <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); deleteNode(n.id) }} className="opacity-0 group-hover:opacity-100 text-[#ccc] hover:text-red-500 text-xs transition">✕</button>
                      </div>
                      {n.kind === "condition" ? (
                        <>
                          <PortDot label="是" color="#16a34a" style={{ left: "28%" }} onDown={e => startConnect(e, n.id, "true")} />
                          <PortDot label="否" color="#dc2626" style={{ left: "72%" }} onDown={e => startConnect(e, n.id, "false")} />
                        </>
                      ) : (
                        <PortDot color="#6366f1" style={{ left: "50%" }} onDown={e => startConnect(e, n.id, "out")} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right panel */}
            <div className="flex flex-col gap-3 min-h-0">
              <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-[#aaa]">節點設定</p>
                  {nodeDraft && (
                    <div className="flex items-center gap-2">
                      {nodeDirty && <span className="text-[10px] text-orange-500">● 未儲存</span>}
                      <button onClick={saveNode} disabled={!nodeDirty} className="px-3 py-1 rounded-lg text-[11px] font-medium text-white bg-black hover:bg-[#222] disabled:opacity-40 disabled:pointer-events-none transition">儲存</button>
                    </div>
                  )}
                </div>
                {nodeDraft ? (
                  <NodeConfig node={nodeDraft} emailTemplates={emailTplNames} lineTemplates={lineTplNames} allowedTriggers={allowedTriggers}
                    onChange={p => setNodeDraft(d => d ? { ...d, ...p } : d)} onDelete={() => deleteNode(nodeDraft.id)} />
                ) : (
                  <p className="text-[11px] text-[#bbb] italic leading-relaxed">點選畫布節點以編輯；拖曳節點可移動；點節點底部圓點再點另一節點頂部圓點即可連線。</p>
                )}
              </div>
              <div className="bg-white rounded-xl border border-[#f0f0f0] p-4 flex-1 min-h-0 flex flex-col">
                <p className="text-xs text-[#aaa] mb-3 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${running ? "bg-green-500 animate-pulse" : "bg-[#ddd]"}`} />
                  執行日誌{testEmail.trim() || testLineId.trim() ? "（真實發送）" : "（模擬）"}
                </p>
                <div className="flex-1 overflow-y-auto bg-[#fafafa] rounded-lg p-3 text-[11px] font-mono leading-relaxed border border-[#f0f0f0]">
                  {log.length === 0 ? <span className="text-[#ccc] italic">點「測試觸發」執行流程；在上方填入測試 Email / LINE User ID 可真實發送。</span> : (
                    <div className="flex flex-col gap-1.5">
                      {log.map(l => <div key={l.id} className={l.tone === "ok" ? "text-green-600" : l.tone === "err" ? "text-red-500" : l.tone === "branch" ? "text-indigo-500" : "text-[#555]"}>{l.text}</div>)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Template modal */}
      {showTemplates && (() => {
        const categories = ["全部", ...Array.from(new Set(templates.map(t => t.category)))]
        const filtered = templates.filter(t => (tplCategory === "全部" || t.category === tplCategory) && (tplSearch === "" || (t.name + t.desc).toLowerCase().includes(tplSearch.toLowerCase())))
        return (
          <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4" onClick={() => setShowTemplates(false)}>
            <div className="w-full max-w-2xl rounded-2xl border border-[#f0f0f0] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-3 border-b border-[#f0f0f0] flex items-center justify-between">
                <h3 className="text-sm font-medium">工作流模板庫</h3>
                <button onClick={() => setShowTemplates(false)} className="text-[#aaa] hover:text-black">✕</button>
              </div>
              <div className="px-4 pt-3 flex flex-col gap-2">
                <input value={tplSearch} onChange={e => setTplSearch(e.target.value)} placeholder="搜尋模板…" className={inputCls} />
                <div className="flex gap-1.5 flex-wrap">
                  {categories.map(c => (
                    <button key={c} onClick={() => setTplCategory(c)} className={`px-2.5 py-1 rounded-full text-[11px] border transition ${tplCategory === c ? "bg-black text-white border-black" : "border-[#f0f0f0] text-[#555] hover:bg-[#fafafa]"}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto">
                {filtered.length === 0 && <p className="col-span-2 text-center text-xs text-[#ccc] py-6 italic">找不到符合的模板</p>}
                {filtered.map(tpl => (
                  <button key={tpl.id} onClick={() => addFlowFrom(tpl)} className="text-left p-3 rounded-xl border border-[#f0f0f0] hover:border-[#ddd] hover:bg-[#fafafa] transition flex flex-col gap-2">
                    <p className="text-sm font-medium flex items-center gap-1.5"><span>{tpl.icon}</span>{tpl.name}</p>
                    <p className="text-[11px] text-[#888] leading-relaxed flex-1">{tpl.desc}</p>
                    <div className="flex flex-wrap gap-1">
                      {tpl.badges.trigger && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100">🏷 {tpl.badges.trigger}</span>}
                      {tpl.badges.timing  && <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 border border-sky-100">⏱ {tpl.badges.timing}</span>}
                      {tpl.badges.action  && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 border border-green-100">⚡ {tpl.badges.action}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function PortDot({ color, style, label, onDown }: { color: string; style: React.CSSProperties; label?: string; onDown: (e: React.PointerEvent) => void }) {
  return (
    <span className="absolute -bottom-2 -translate-x-1/2 flex flex-col items-center" style={style}>
      <span onPointerDown={onDown} onClick={e => e.stopPropagation()} title={label ? `輸出：${label}` : "輸出"}
        className="w-3 h-3 rounded-full border-2 border-white cursor-crosshair hover:scale-125 transition shadow-sm" style={{ background: color }} />
      {label && <span className="text-[8px] mt-0.5 font-medium" style={{ color }}>{label}</span>}
    </span>
  )
}

function NodeConfig({ node, emailTemplates, lineTemplates, allowedTriggers, onChange, onDelete }: {
  node: FlowNode; emailTemplates: string[]; lineTemplates: string[]
  allowedTriggers: TriggerType[]; onChange: (p: Partial<FlowNode>) => void; onDelete: () => void
}) {
  const meta = KIND_META[node.kind]
  const inp = "w-full px-2.5 py-1.5 text-xs border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors bg-white"
  const tplSelect = (value: string | undefined, list: string[], onPick: (v: string) => void) => {
    const options = value && !list.includes(value) ? [value, ...list] : list
    return (
      <select value={value ?? ""} onChange={e => onPick(e.target.value)} className={inp}>
        {options.length === 0 && <option value="">（模板頁尚無可用模板）</option>}
        {value === undefined && options.length > 0 && <option value="">（選擇模板）</option>}
        {options.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 border ${meta.light}`}>{meta.icon}</div>
        <span className="text-xs font-medium text-[#333]">{meta.label}</span>
      </div>

      {node.kind === "trigger" && (
        <>
          <Lbl text="觸發來源"><select value={node.triggerType} onChange={e => onChange({ triggerType: e.target.value as TriggerType })} className={inp}>{allowedTriggers.map(t => <option key={t} value={t}>{TRIGGER_LABEL[t]}</option>)}</select></Lbl>
          {node.triggerType === "payment" && <Lbl text="金流事件"><select value={node.paymentEvent} onChange={e => onChange({ paymentEvent: e.target.value as PaymentEvent })} className={inp}><option value="paid">付款成功</option><option value="pending">待付款</option><option value="failed">付款失敗</option></select></Lbl>}
          {node.triggerType === "order"   && <Lbl text="報名事件"><select value={node.orderEvent}   onChange={e => onChange({ orderEvent: e.target.value as OrderEvent })} className={inp}><option value="created">報名建立</option><option value="confirmed">報名確認</option><option value="cancelled">報名取消</option><option value="completed">課程完成</option></select></Lbl>}
          {node.triggerType === "schedule" && <Lbl text="Cron 排程"><input type="text" value={node.cron ?? ""} onChange={e => onChange({ cron: e.target.value })} placeholder="0 9 * * *" className={inp} /></Lbl>}
          {node.triggerType === "social" && (
            <>
              <Lbl text="平台"><select value={node.socialPlatform} onChange={e => onChange({ socialPlatform: e.target.value as SocialPlatform })} className={inp}><option value="ig">Instagram</option><option value="fb">Facebook</option><option value="threads">Threads</option></select></Lbl>
              <Lbl text="留言關鍵字"><input type="text" value={node.socialKeyword ?? ""} onChange={e => onChange({ socialKeyword: e.target.value })} placeholder="#贈品" className={inp} /></Lbl>
            </>
          )}
          <div className="pt-2 border-t border-[#f5f5f5]">
            <p className="text-[10px] text-[#aaa] mb-1.5">觸發限制（防重複執行）</p>
            <div className="grid grid-cols-3 gap-1.5">
              <Lbl text="每人上限"><input type="number" min={0} value={node.perUserLimit ?? 0} onChange={e => onChange({ perUserLimit: Math.max(0, Number(e.target.value)) })} className={inp} /></Lbl>
              <Lbl text="冷卻"><input type="number" min={0} value={node.cooldownValue ?? 0} onChange={e => onChange({ cooldownValue: Math.max(0, Number(e.target.value)) })} className={inp} /></Lbl>
              <Lbl text="單位"><select value={node.cooldownUnit ?? "hours"} onChange={e => onChange({ cooldownUnit: e.target.value as FlowNode["cooldownUnit"] })} className={inp}><option value="minutes">分</option><option value="hours">時</option><option value="days">天</option></select></Lbl>
            </div>
          </div>
        </>
      )}
      {node.kind === "social" && (
        <>
          <Lbl text="平台"><select value={node.socialPlatform} onChange={e => onChange({ socialPlatform: e.target.value as SocialPlatform })} className={inp}><option value="ig">Instagram</option><option value="fb">Facebook</option><option value="threads">Threads</option></select></Lbl>
          <Lbl text="動作"><select value={node.socialAction} onChange={e => onChange({ socialAction: e.target.value as "reply" | "dm" })} className={inp}><option value="dm">私訊</option><option value="reply">公開回覆</option></select></Lbl>
          <Lbl text="訊息內容"><textarea value={node.socialText ?? ""} onChange={e => onChange({ socialText: e.target.value })} rows={2} className={`${inp} resize-y`} /></Lbl>
        </>
      )}
      {node.kind === "email"  && <Lbl text="Email 模板">{tplSelect(node.template, emailTemplates, v => onChange({ template: v }))}</Lbl>}
      {node.kind === "line"   && <Lbl text="LINE 模板">{tplSelect(node.template, lineTemplates, v => onChange({ template: v }))}</Lbl>}
      {node.kind === "notify" && (
        <>
          <p className="text-[10px] text-indigo-500">此節點同時寄 Email 並推播 LINE。</p>
          <Lbl text="Email 模板">{tplSelect(node.emailTemplate, emailTemplates, v => onChange({ emailTemplate: v }))}</Lbl>
          <Lbl text="LINE 模板">{tplSelect(node.lineTemplate, lineTemplates, v => onChange({ lineTemplate: v }))}</Lbl>
        </>
      )}
      {node.kind === "condition" && (
        <>
          <Lbl text="判斷欄位"><select value={node.condField} onChange={e => onChange({ condField: e.target.value as FlowNode["condField"] })} className={inp}><option value="payStatus">付款狀態</option><option value="isRead">LINE 已讀</option><option value="amount">交易金額</option></select></Lbl>
          <div className="grid grid-cols-2 gap-1.5">
            <Lbl text="運算"><select value={node.condOp} onChange={e => onChange({ condOp: e.target.value as FlowNode["condOp"] })} className={inp}><option value="eq">=</option><option value="neq">≠</option><option value="gt">&gt;</option><option value="lt">&lt;</option></select></Lbl>
            <Lbl text="值"><input type="text" value={node.condValue ?? ""} onChange={e => onChange({ condValue: e.target.value })} className={inp} /></Lbl>
          </div>
        </>
      )}
      {node.kind === "delay" && (
        <>
          <Lbl text="時間模式"><select value={node.delayMode ?? "delay"} onChange={e => onChange({ delayMode: e.target.value as FlowNode["delayMode"] })} className={inp}><option value="delay">延遲執行（相對時間）</option><option value="at">指定時間（絕對時間）</option><option value="cron">週期執行（Cron）</option></select></Lbl>
          {(node.delayMode ?? "delay") === "delay" && <div className="grid grid-cols-2 gap-1.5"><Lbl text="數量"><input type="number" min={1} value={node.delayValue ?? 1} onChange={e => onChange({ delayValue: Math.max(1, Number(e.target.value)) })} className={inp} /></Lbl><Lbl text="單位"><select value={node.delayUnit ?? "hours"} onChange={e => onChange({ delayUnit: e.target.value as FlowNode["delayUnit"] })} className={inp}><option value="minutes">分鐘</option><option value="hours">小時</option><option value="days">天</option></select></Lbl></div>}
          {node.delayMode === "at"   && <Lbl text="指定時間"><input type="datetime-local" value={node.delayAt ?? ""} onChange={e => onChange({ delayAt: e.target.value })} className={inp} /></Lbl>}
          {node.delayMode === "cron" && <Lbl text="Cron 週期"><input type="text" value={node.delayCron ?? ""} onChange={e => onChange({ delayCron: e.target.value })} placeholder="0 9 * * *" className={inp} /></Lbl>}
        </>
      )}
      <button onClick={onDelete} className="mt-1 w-full py-1.5 rounded-lg text-xs text-red-500 border border-red-100 bg-red-50 hover:bg-red-100 transition">刪除此節點</button>
    </div>
  )
}

function Lbl({ text, children }: { text: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1"><span className="text-[10px] text-[#aaa]">{text}</span>{children}</label>
}
