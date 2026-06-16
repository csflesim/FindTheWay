'use client'

import { useRef, useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"

const STATIC_GROUPS = [
  {
    group: "上課時間",
    params: [
      { key: "open_hour",    label: "開放時間（起）",   value: "09:00", desc: "工作室每日最早開課時間" },
      { key: "close_hour",   label: "開放時間（迄）",   value: "22:00", desc: "工作室每日最晚下課時間" },
      { key: "slot_minutes", label: "時段間隔（分鐘）", value: "60",    desc: "行事曆格線單位"         },
    ],
  },
  {
    group: "通知設定",
    params: [
      { key: "remind_hours", label: "上課提醒（小時前）", value: "24",                   desc: "自動推播上課通知的提前時間" },
      { key: "notify_email", label: "系統通知 Email",     value: "admin@findtheway.com", desc: "收款、退款等事件通知"       },
    ],
  },
]

const LINE_PARAMS = [
  { key: "line_channel_id",     label: "Channel ID",           desc: "LINE Developers Console → Login Channel",   secret: false },
  { key: "line_channel_secret", label: "Channel Secret",       desc: "LINE Developers Console → Login Channel",   secret: true  },
  { key: "line_access_token",   label: "Channel Access Token", desc: "Messaging API → 長期存取金鑰",               secret: true  },
  { key: "line_liff_id",        label: "LIFF ID",              desc: "前台登入 / 綁定用 LIFF 應用",               secret: false },
]

export default function ParamsPage() {
  const lineRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const body: Record<string, string> = {}
    for (const p of LINE_PARAMS) {
      body[p.key] = lineRefs.current[p.key]?.value ?? ""
    }
    try {
      await fetch("/api/admin/params", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">System / Params</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">參數管理</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-black text-white text-sm px-4 py-2 rounded-lg hover:bg-[#222] disabled:opacity-50 transition-colors">
          {saving
            ? <><Loader2 size={14} className="animate-spin" />儲存中…</>
            : saved
            ? <><CheckCircle2 size={14} className="text-green-400" />已儲存</>
            : "儲存變更"
          }
        </button>
      </div>

      <div className="flex flex-col gap-5">
        {/* Static groups (上課時間 / 通知設定) */}
        {STATIC_GROUPS.map(({ group, params }) => (
          <div key={group} className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#f5f5f5]">
              <p className="text-xs font-medium text-[#555]">{group}</p>
            </div>
            <div className="divide-y divide-[#f5f5f5]">
              {params.map(({ key, label, value, desc }) => (
                <div key={key} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-[#aaa] mt-0.5">{desc}</p>
                  </div>
                  <input
                    defaultValue={value}
                    className="w-48 shrink-0 text-sm text-right bg-[#f9f9f9] border border-transparent rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-black transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* LINE 設定 — values saved to data/line-config.json via API */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#f5f5f5] flex items-center justify-between">
            <p className="text-xs font-medium text-[#555]">LINE 設定</p>
            <span className="text-[10px] text-[#06C755] bg-[#e8faf0] px-2 py-0.5 rounded-full">儲存後即時生效</span>
          </div>
          <div className="divide-y divide-[#f5f5f5]">
            {LINE_PARAMS.map(({ key, label, desc, secret }) => (
              <div key={key} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-[#aaa] mt-0.5">{desc}</p>
                </div>
                <input
                  ref={el => { lineRefs.current[key] = el }}
                  type={secret ? "password" : "text"}
                  placeholder="—"
                  className="w-48 shrink-0 text-sm text-right bg-[#f9f9f9] border border-transparent rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-black transition-colors"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
