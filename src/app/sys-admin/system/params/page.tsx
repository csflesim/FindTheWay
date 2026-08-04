'use client'

import { useRef, useState, useEffect } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"

const PARAMS_KEY = "ftw.params.v1"
const ALL_PAY_METHODS = ["銀行轉帳", "現金", "Line Pay", "信用卡"]
const DEFAULT_PAY_METHODS = ["銀行轉帳", "現金"]
const DEFAULT_FEATURES = { onlineCourse: true }

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

const LINE_LOGIN_PARAMS = [
  { key: "line_channel_id",     label: "Channel ID",     desc: "LINE Developers Console → Login Channel", secret: false },
  { key: "line_channel_secret", label: "Channel Secret", desc: "LINE Developers Console → Login Channel", secret: true  },
  { key: "line_liff_id",        label: "LIFF ID",        desc: "前台登入 / 綁定用 LIFF 應用",             secret: false },
]

const LINE_MSG_PARAMS = [
  { key: "line_msg_channel_id",     label: "Channel ID",           desc: "LINE Developers Console → Messaging API Channel", secret: false },
  { key: "line_msg_channel_secret", label: "Channel Secret",       desc: "LINE Developers Console → Messaging API Channel", secret: true  },
  { key: "line_access_token",       label: "Channel Access Token", desc: "Messaging API → 長期存取金鑰（不過期）",             secret: true  },
]

const EMAIL_PARAMS = [
  { key: "smtp_host", label: "SMTP 主機",   desc: "e.g. smtp.gmail.com",                        secret: false, placeholder: "smtp.gmail.com" },
  { key: "smtp_port", label: "連接埠",      desc: "TLS 通常 587，SSL 通常 465",                   secret: false, placeholder: "587" },
  { key: "smtp_user", label: "帳號",        desc: "SMTP 認證用帳號（通常為 Email 地址）",          secret: false, placeholder: "" },
  { key: "smtp_pass", label: "密碼",        desc: "SMTP 認證密碼或應用程式專屬密碼",               secret: true,  placeholder: "" },
  { key: "smtp_from", label: "寄件人",      desc: "顯示於收件者的寄件人名稱與地址",                secret: false, placeholder: "忙碌不迷路 <noreply@findtheway.com>" },
]

type ParamDef = { key: string; label: string; desc: string; secret: boolean; placeholder?: string }

function ParamRow({ def, refsMap }: { def: ParamDef; refsMap: React.MutableRefObject<Record<string, HTMLInputElement | null>> }) {
  const { key, label, desc, secret, placeholder } = def
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-[#aaa] mt-0.5">{desc}</p>
      </div>
      <input
        ref={el => { refsMap.current[key] = el }}
        type={secret ? "password" : "text"}
        placeholder={placeholder ?? "—"}
        className="w-52 shrink-0 text-sm text-right bg-[#f9f9f9] border border-transparent rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-black transition-colors"
      />
    </div>
  )
}

export default function ParamsPage() {
  const allRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [enabledPay, setEnabledPay] = useState<string[]>(DEFAULT_PAY_METHODS)
  const [features, setFeatures]     = useState(DEFAULT_FEATURES)
  const [testing, setTesting]       = useState<"email" | "line" | null>(null)

  useEffect(() => {
    try {
      const s = localStorage.getItem(PARAMS_KEY)
      if (s) {
        const p = JSON.parse(s)
        if (Array.isArray(p.payMethods)) setEnabledPay(p.payMethods)
        if (typeof p.features === "object" && p.features !== null) {
          setFeatures(f => ({ ...f, ...p.features }))
        }
      }
    } catch {}

    // 載入已儲存的 LINE / SMTP 設定，填回欄位
    fetch("/api/admin/params")
      .then(r => (r.ok ? r.json() : null))
      .then(cfg => {
        if (!cfg) return
        for (const [k, v] of Object.entries(cfg)) {
          const el = allRefs.current[k]
          if (el && typeof v === "string" && !el.value) el.value = v
        }
      })
      .catch(() => {})
  }, [])

  function saveLocal(payMethods: string[], feats: typeof DEFAULT_FEATURES) {
    try { localStorage.setItem(PARAMS_KEY, JSON.stringify({ payMethods, features: feats })) } catch {}
  }

  function togglePayMethod(m: string) {
    setEnabledPay(prev => {
      const next = prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
      saveLocal(next, features)
      return next
    })
  }

  function toggleFeature(key: keyof typeof DEFAULT_FEATURES) {
    setFeatures(prev => {
      const next = { ...prev, [key]: !prev[key] }
      saveLocal(enabledPay, next)
      return next
    })
  }

  async function testEmail() {
    const to = window.prompt("寄送測試信到哪個 Email？", "yande3949@gmail.com")
    if (!to) return
    setTesting("email")
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject: "測試信 — 忙碌不迷路藝術工作坊",
          text: "Email 設定成功！這是一封系統測試信。",
        }),
      })
      const d = await res.json()
      alert(d.ok ? `測試信已寄出（${d.provider}），請到收件匣確認。` : `寄送失敗：${d.error}`)
    } catch (e) {
      alert(`寄送失敗：${String(e)}`)
    } finally {
      setTesting(null)
    }
  }

  async function testLine() {
    const to = window.prompt(
      "輸入要接收測試訊息的 LINE User ID（U 開頭 33 碼）。\n用 LINE 登入過本站的帳號，其 User ID 會存在會員資料中。"
    )
    if (!to) return
    setTesting("line")
    try {
      const res = await fetch("/api/line/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          messages: [{ type: "text", text: "LINE 訊息設定成功！這是一則系統測試訊息。" }],
        }),
      })
      const d = await res.json()
      alert(d.ok ? "測試訊息已送出，請確認 LINE 收到。" : `發送失敗：${d.error ?? JSON.stringify(d)}`)
    } catch (e) {
      alert(`發送失敗：${String(e)}`)
    } finally {
      setTesting(null)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const allKeys = [...LINE_LOGIN_PARAMS, ...LINE_MSG_PARAMS, ...EMAIL_PARAMS]
    const body: Record<string, string> = {}
    for (const p of allKeys) {
      body[p.key] = allRefs.current[p.key]?.value ?? ""
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
                    className="w-52 shrink-0 text-sm text-right bg-[#f9f9f9] border border-transparent rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-black transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* 付款設定 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#f5f5f5] flex items-center justify-between">
            <p className="text-xs font-medium text-[#555]">付款設定</p>
            <span className="text-[10px] text-[#aaa]">即時生效</span>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs text-[#aaa] mb-3">前台報名時顯示的付款方式（至少保留一項）</p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PAY_METHODS.map(m => {
                const on = enabledPay.includes(m)
                const isLast = on && enabledPay.length === 1
                return (
                  <button
                    key={m}
                    onClick={() => !isLast && togglePayMethod(m)}
                    title={isLast ? "至少保留一項付款方式" : undefined}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                      on
                        ? "border-black bg-black/5 text-black"
                        : "border-[#f0f0f0] text-[#aaa]"
                    } ${isLast ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-[#ccc]"}`}
                  >
                    <span className="text-sm">{m}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      on ? "bg-black border-black" : "border-[#ddd]"
                    }`}>
                      {on && <CheckCircle2 size={10} className="text-white" strokeWidth={3} />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* 功能開關 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#f5f5f5] flex items-center justify-between">
            <p className="text-xs font-medium text-[#555]">功能開關</p>
            <span className="text-[10px] text-[#aaa]">即時生效</span>
          </div>
          <div className="divide-y divide-[#f5f5f5]">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">線上課程</p>
                <p className="text-xs text-[#aaa] mt-0.5">關閉後前台底部導覽列隱藏「線上課」入口</p>
              </div>
              <div className="w-52 shrink-0 flex justify-end items-center gap-2">
                <span className={`text-xs ${features.onlineCourse ? "text-black font-medium" : "text-[#bbb]"}`}>
                  {features.onlineCourse ? "開啟" : "關閉"}
                </span>
                <button
                  role="switch"
                  aria-checked={features.onlineCourse}
                  onClick={() => toggleFeature("onlineCourse")}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
                    features.onlineCourse ? "bg-black" : "bg-[#ddd]"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                    features.onlineCourse ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* LINE 登入設定 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#f5f5f5] flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#555]">LINE 登入設定</p>
              <p className="text-[11px] text-[#aaa] mt-0.5">LINE Login Channel · LIFF</p>
            </div>
            <span className="text-[10px] text-[#06C755] bg-[#e8faf0] px-2 py-0.5 rounded-full">儲存後生效</span>
          </div>
          <div className="divide-y divide-[#f5f5f5]">
            {LINE_LOGIN_PARAMS.map(p => (
              <ParamRow key={p.key} def={p} refsMap={allRefs} />
            ))}
          </div>
        </div>

        {/* LINE 訊息設定 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#f5f5f5] flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#555]">LINE 訊息設定</p>
              <p className="text-[11px] text-[#aaa] mt-0.5">Messaging API Channel · 推播通知</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={testLine}
                disabled={testing !== null}
                className="text-[11px] px-2.5 py-1 rounded-full border border-[#e0e0e0] text-[#666] hover:border-black hover:text-black disabled:opacity-50 transition-colors"
              >
                {testing === "line" ? "發送中…" : "發送測試訊息"}
              </button>
              <span className="text-[10px] text-[#06C755] bg-[#e8faf0] px-2 py-0.5 rounded-full">儲存後生效</span>
            </div>
          </div>
          <div className="divide-y divide-[#f5f5f5]">
            {LINE_MSG_PARAMS.map(p => (
              <ParamRow key={p.key} def={p} refsMap={allRefs} />
            ))}
          </div>
        </div>

        {/* Email 設定（SMTP） */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#f5f5f5] flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#555]">Email 設定</p>
              <p className="text-[11px] text-[#aaa] mt-0.5">SMTP · 系統發信</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={testEmail}
                disabled={testing !== null}
                className="text-[11px] px-2.5 py-1 rounded-full border border-[#e0e0e0] text-[#666] hover:border-black hover:text-black disabled:opacity-50 transition-colors"
              >
                {testing === "email" ? "寄送中…" : "寄送測試信"}
              </button>
              <span className="text-[10px] text-[#06C755] bg-[#e8faf0] px-2 py-0.5 rounded-full">儲存後生效</span>
            </div>
          </div>
          <div className="divide-y divide-[#f5f5f5]">
            {EMAIL_PARAMS.map(p => (
              <ParamRow key={p.key} def={p} refsMap={allRefs} />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
