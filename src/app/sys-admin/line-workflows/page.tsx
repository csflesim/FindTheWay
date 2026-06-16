'use client'

import { useState } from "react"
import { Plus, X, Zap, Clock, MessageSquare, ToggleLeft, ToggleRight, ChevronRight, Pencil, Trash2 } from "lucide-react"

type Trigger =
  | "course_enrolled"
  | "order_paid"
  | "course_reminder"
  | "ticket_expiring"
  | "member_inactive"

type DelayUnit = "minutes" | "hours" | "days"

type Workflow = {
  id: number
  name: string
  trigger: Trigger
  delayValue: number
  delayUnit: DelayUnit
  message: string
  enabled: boolean
}

const TRIGGER_LABEL: Record<Trigger, string> = {
  course_enrolled:  "課程報名成功",
  order_paid:       "訂單付款完成",
  course_reminder:  "課前提醒",
  ticket_expiring:  "課堂券即將到期",
  member_inactive:  "會員長期未登入",
}

const TRIGGER_OPTIONS: Trigger[] = [
  "course_enrolled",
  "order_paid",
  "course_reminder",
  "ticket_expiring",
  "member_inactive",
]

const DELAY_UNIT_LABEL: Record<DelayUnit, string> = {
  minutes: "分鐘後",
  hours:   "小時後",
  days:    "天後",
}

const MOCK: Workflow[] = [
  {
    id: 1,
    name: "報名成功通知",
    trigger: "course_enrolled",
    delayValue: 0, delayUnit: "minutes",
    message: "感謝您報名「{{課程名稱}}」！上課時間：{{上課日期}}，地點：{{教室}}。如有問題歡迎隨時聯絡我們。",
    enabled: true,
  },
  {
    id: 2,
    name: "課前 24 小時提醒",
    trigger: "course_reminder",
    delayValue: 24, delayUnit: "hours",
    message: "提醒您，明天有課喔！「{{課程名稱}}」將於 {{上課時間}} 在 {{教室}} 開課，請準時出席。",
    enabled: true,
  },
  {
    id: 3,
    name: "課堂券快到期提醒",
    trigger: "ticket_expiring",
    delayValue: 3, delayUnit: "days",
    message: "您的課堂券還剩 {{剩餘張數}} 張，將於 {{到期日}} 到期，請記得盡早使用！",
    enabled: false,
  },
]

const EMPTY: Omit<Workflow, "id"> = {
  name: "", trigger: "course_enrolled",
  delayValue: 0, delayUnit: "minutes",
  message: "", enabled: true,
}

function TriggerBadge({ trigger }: { trigger: Trigger }) {
  const colors: Record<Trigger, string> = {
    course_enrolled: "bg-blue-50 text-blue-600",
    order_paid:      "bg-green-50 text-green-600",
    course_reminder: "bg-orange-50 text-orange-600",
    ticket_expiring: "bg-yellow-50 text-yellow-700",
    member_inactive: "bg-purple-50 text-purple-600",
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[trigger]}`}>
      {TRIGGER_LABEL[trigger]}
    </span>
  )
}

export default function LineWorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>(MOCK)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Workflow | null>(null)
  const [form, setForm] = useState<Omit<Workflow, "id">>(EMPTY)

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setDrawerOpen(true)
  }

  function openEdit(w: Workflow) {
    setEditing(w)
    setForm({ name: w.name, trigger: w.trigger, delayValue: w.delayValue, delayUnit: w.delayUnit, message: w.message, enabled: w.enabled })
    setDrawerOpen(true)
  }

  function save() {
    if (!form.name.trim() || !form.message.trim()) return
    if (editing) {
      setWorkflows(ws => ws.map(w => w.id === editing.id ? { ...w, ...form } : w))
    } else {
      setWorkflows(ws => [...ws, { id: Date.now(), ...form }])
    }
    setDrawerOpen(false)
  }

  function remove(id: number) {
    setWorkflows(ws => ws.filter(w => w.id !== id))
  }

  function toggle(id: number) {
    setWorkflows(ws => ws.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w))
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Notifications / Workflows</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5 flex items-center gap-2">
            <Zap size={18} className="text-yellow-500" />
            訊息工作流
          </h1>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-1.5 bg-black text-white text-sm px-4 py-2 rounded-lg hover:bg-[#222] transition-colors">
          <Plus size={14} />新增工作流
        </button>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {workflows.map(w => (
          <div key={w.id} className={`bg-white rounded-xl border transition-colors ${w.enabled ? "border-[#f0f0f0]" : "border-[#f5f5f5] opacity-60"}`}>
            <div className="px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <p className="text-sm font-medium">{w.name}</p>
                    <TriggerBadge trigger={w.trigger} />
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#aaa] mb-2">
                    <Zap size={10} />
                    <span>{TRIGGER_LABEL[w.trigger]}</span>
                    {w.delayValue > 0 && (
                      <>
                        <ChevronRight size={10} />
                        <Clock size={10} />
                        <span>{w.delayValue} {DELAY_UNIT_LABEL[w.delayUnit]}</span>
                      </>
                    )}
                    <ChevronRight size={10} />
                    <MessageSquare size={10} />
                    <span>發送 LINE 訊息</span>
                  </div>

                  <p className="text-xs text-[#777] line-clamp-2 leading-relaxed">{w.message}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggle(w.id)} className="text-[#aaa] hover:text-black transition-colors">
                    {w.enabled
                      ? <ToggleRight size={22} className="text-[#06C755]" />
                      : <ToggleLeft size={22} />
                    }
                  </button>
                  <button onClick={() => openEdit(w)} className="text-[#aaa] hover:text-black transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => remove(w.id)} className="text-[#aaa] hover:text-red-500 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {workflows.length === 0 && (
          <div className="text-center py-16 text-sm text-[#ccc]">尚無工作流，點上方「新增」開始建立</div>
        )}
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] sticky top-0 bg-white z-10">
              <h2 className="text-sm font-medium">{editing ? "編輯工作流" : "新增工作流"}</h2>
              <button onClick={() => setDrawerOpen(false)} className="text-[#aaa] hover:text-black">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 px-5 py-5 flex flex-col gap-5">
              {/* Name */}
              <div>
                <label className="text-xs text-[#aaa] mb-1.5 block">工作流名稱</label>
                <input value={form.name} onChange={e => set("name", e.target.value)}
                  placeholder="例：報名成功通知"
                  className="w-full px-3 py-2.5 text-sm border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors" />
              </div>

              {/* Trigger */}
              <div>
                <label className="text-xs text-[#aaa] mb-1.5 block">觸發事件</label>
                <select value={form.trigger} onChange={e => set("trigger", e.target.value as Trigger)}
                  className="w-full px-3 py-2.5 text-sm border border-[#f0f0f0] rounded-lg outline-none focus:border-black bg-white transition-colors">
                  {TRIGGER_OPTIONS.map(t => (
                    <option key={t} value={t}>{TRIGGER_LABEL[t]}</option>
                  ))}
                </select>
              </div>

              {/* Delay */}
              <div>
                <label className="text-xs text-[#aaa] mb-1.5 block">延遲發送</label>
                <div className="flex gap-2">
                  <input
                    type="number" min={0} value={form.delayValue}
                    onChange={e => set("delayValue", Number(e.target.value))}
                    className="w-24 px-3 py-2.5 text-sm border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors"
                  />
                  <select value={form.delayUnit} onChange={e => set("delayUnit", e.target.value as DelayUnit)}
                    className="flex-1 px-3 py-2.5 text-sm border border-[#f0f0f0] rounded-lg outline-none focus:border-black bg-white transition-colors">
                    <option value="minutes">分鐘後</option>
                    <option value="hours">小時後</option>
                    <option value="days">天後</option>
                  </select>
                </div>
                {form.delayValue === 0 && (
                  <p className="text-[11px] text-[#aaa] mt-1">設為 0 = 觸發後立即發送</p>
                )}
              </div>

              {/* Message */}
              <div>
                <label className="text-xs text-[#aaa] mb-1.5 block">訊息內容</label>
                <textarea value={form.message} onChange={e => set("message", e.target.value)}
                  rows={6} maxLength={2000}
                  placeholder="輸入訊息內容…"
                  className="w-full px-3 py-2.5 text-sm border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors resize-none"
                />
                <p className="text-[11px] text-[#aaa] mt-1">
                  可使用變數：<code className="bg-[#f5f5f5] px-1 rounded">{"{{課程名稱}}"}</code>、<code className="bg-[#f5f5f5] px-1 rounded">{"{{上課日期}}"}</code>、<code className="bg-[#f5f5f5] px-1 rounded">{"{{教室}}"}</code> 等
                </p>
              </div>

              {/* Enabled */}
              <div className="flex items-center justify-between py-2 border-t border-[#f5f5f5]">
                <span className="text-sm">啟用工作流</span>
                <button onClick={() => set("enabled", !form.enabled)}>
                  {form.enabled
                    ? <ToggleRight size={26} className="text-[#06C755]" />
                    : <ToggleLeft  size={26} className="text-[#ccc]" />
                  }
                </button>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[#f0f0f0] sticky bottom-0 bg-white flex gap-2">
              <button onClick={() => setDrawerOpen(false)}
                className="flex-1 border border-[#f0f0f0] text-sm py-2.5 rounded-lg hover:bg-[#fafaf9] transition-colors">
                取消
              </button>
              <button onClick={save}
                disabled={!form.name.trim() || !form.message.trim()}
                className="flex-1 bg-black text-white text-sm py-2.5 rounded-lg hover:bg-[#222] disabled:opacity-40 transition-colors">
                {editing ? "儲存變更" : "新增"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
