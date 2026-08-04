'use client'

import { useState } from "react"
import { Send, Users, User, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react"

type Target = "broadcast" | "specific"
type HistoryItem = {
  id: number
  target: string
  subject: string
  sentAt: string
  status: "success" | "failed"
}

const MOCK_HISTORY: HistoryItem[] = [
  { id: 1, target: "全體發信",               subject: "新課程上架：親子藝術探索",  sentAt: "2025-06-10 14:32", status: "success" },
  { id: 2, target: "purple@findtheway.com", subject: "訂單確認通知 #20250608",   sentAt: "2025-06-08 09:15", status: "success" },
  { id: 3, target: "全體發信",               subject: "工作室週末限定優惠",        sentAt: "2025-06-05 10:00", status: "failed"  },
]

export default function EmailMessagesPage() {
  const [target, setTarget]   = useState<Target>("broadcast")
  const [toEmail, setToEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody]       = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult]   = useState<{ ok: boolean; msg: string } | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>(MOCK_HISTORY)

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return
    if (target === "specific" && !toEmail.trim()) return
    setSending(true); setResult(null)
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: target === "broadcast" ? "all@findtheway.app" : toEmail.trim(), subject: subject.trim(), html: `<pre style="font-family:sans-serif;white-space:pre-wrap">${body}</pre>`, text: body }),
      })
      const data = await res.json()
      const ok = !!data.ok
      setResult({ ok, msg: ok ? "郵件已成功送出！" : (data.error ?? "發送失敗") })
      setHistory(prev => [{ id: Date.now(), target: target === "broadcast" ? "全體發信" : toEmail.trim(), subject: subject.trim(), sentAt: new Date().toLocaleString("zh-TW", { hour12: false }).replace(/\//g, "-"), status: ok ? "success" : "failed" }, ...prev])
      if (ok) { setSubject(""); setBody(""); setToEmail("") }
    } catch {
      setResult({ ok: false, msg: "網路錯誤，請稍後再試" })
    } finally {
      setSending(false)
    }
  }

  const disabled = sending || !subject.trim() || !body.trim() || (target === "specific" && !toEmail.trim())

  return (
    <div className="p-4 md:p-6 w-full max-w-3xl">
      <div className="mb-5">
        <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Notifications / Email</p>
        <h1 className="text-lg md:text-xl font-medium mt-0.5 flex items-center gap-2">
          <span>✉️</span>Email 訊息管理
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-[#f0f0f0] p-5 mb-5">
        <p className="text-sm font-medium mb-4">發送新郵件</p>

        <div className="mb-4">
          <label className="text-xs text-[#aaa] mb-2 block">發送對象</label>
          <div className="flex gap-2">
            <button onClick={() => setTarget("broadcast")} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${target === "broadcast" ? "bg-black text-white border-black" : "border-[#f0f0f0] text-[#555]"}`}><Users size={14} />全體發信</button>
            <button onClick={() => setTarget("specific")}  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${target === "specific"  ? "bg-black text-white border-black" : "border-[#f0f0f0] text-[#555]"}`}><User  size={14} />指定收件人</button>
          </div>
        </div>

        {target === "specific" && (
          <div className="mb-4">
            <label className="text-xs text-[#aaa] mb-1.5 block">收件人 Email</label>
            <input type="email" value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="student@example.com" className="w-full px-3 py-2.5 text-sm border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors" />
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs text-[#aaa] mb-1.5 block">主旨</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="例：課前提醒通知" className="w-full px-3 py-2.5 text-sm border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors" />
        </div>

        <div className="mb-4">
          <label className="text-xs text-[#aaa] mb-1.5 block">郵件內容</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} maxLength={5000} placeholder="輸入郵件正文…" className="w-full px-3 py-2.5 text-sm border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors resize-none" />
          <p className="text-right text-[11px] text-[#ccc] mt-1">{body.length} / 5000</p>
        </div>

        {result && (
          <div className={`mb-4 px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 ${result.ok ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
            {result.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            {result.msg}
          </div>
        )}

        <button onClick={handleSend} disabled={disabled}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm px-5 py-2.5 rounded-lg transition-colors font-medium">
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {sending ? "發送中…" : "發送郵件"}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#f5f5f5] flex items-center gap-2">
          <Clock size={14} className="text-[#aaa]" />
          <p className="text-sm font-medium">發送紀錄</p>
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {history.map(h => (
            <div key={h.id} className="px-5 py-3.5 flex items-start gap-3">
              <div className={`mt-0.5 shrink-0 ${h.status === "success" ? "text-green-500" : "text-red-400"}`}>
                {h.status === "success" ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{h.subject}</p>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[#aaa]">
                  <span>{h.target}</span><span>·</span><span>{h.sentAt}</span>
                </div>
              </div>
            </div>
          ))}
          {history.length === 0 && <div className="px-5 py-10 text-center text-sm text-[#ccc]">尚無發送紀錄</div>}
        </div>
      </div>
    </div>
  )
}
