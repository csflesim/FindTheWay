'use client'

import { useState } from "react"
import { Send, Users, User, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react"

type MsgType = "text" | "image"
type Target  = "broadcast" | "specific"
type HistoryItem = {
  id: number
  target: string
  content: string
  sentAt: string
  status: "success" | "failed"
}

const MOCK_HISTORY: HistoryItem[] = [
  { id: 1, target: "全體推播",      content: "新課程上架通知：親子藝術探索，立即報名！", sentAt: "2025-06-10 14:32", status: "success" },
  { id: 2, target: "U1a2b3c4d5e6", content: "您好，您的訂單已確認，感謝報名！",           sentAt: "2025-06-08 09:15", status: "success" },
  { id: 3, target: "全體推播",      content: "工作室週末限定優惠，詳見公告。",             sentAt: "2025-06-05 10:00", status: "failed"  },
]

const LINE_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
  </svg>
)

export default function LineMessagesPage() {
  const [target, setTarget]     = useState<Target>("broadcast")
  const [userId, setUserId]     = useState("")
  const [msgType, setMsgType]   = useState<MsgType>("text")
  const [text, setText]         = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [sending, setSending]   = useState(false)
  const [result, setResult]     = useState<{ ok: boolean; msg: string } | null>(null)
  const [history, setHistory]   = useState<HistoryItem[]>(MOCK_HISTORY)

  async function handleSend() {
    if (!text && msgType === "text") return
    if (!imageUrl && msgType === "image") return
    if (target === "specific" && !userId.trim()) return
    setSending(true); setResult(null)
    const messages = msgType === "text"
      ? [{ type: "text", text }]
      : [{ type: "image", originalContentUrl: imageUrl, previewImageUrl: imageUrl }]
    try {
      const res = await fetch("/api/line/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broadcast: target === "broadcast", to: target === "specific" ? userId.trim() : undefined, messages }),
      })
      const data = await res.json()
      const ok = !!data.ok
      setResult({ ok, msg: ok ? "訊息已成功送出！" : (data.error ?? "發送失敗") })
      setHistory(prev => [{ id: Date.now(), target: target === "broadcast" ? "全體推播" : userId.trim(), content: msgType === "text" ? text : `[圖片] ${imageUrl}`, sentAt: new Date().toLocaleString("zh-TW", { hour12: false }).replace(/\//g, "-"), status: ok ? "success" : "failed" }, ...prev])
      if (ok) { setText(""); setImageUrl(""); setUserId("") }
    } catch {
      setResult({ ok: false, msg: "網路錯誤，請稍後再試" })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-4 md:p-6 w-full max-w-3xl">
      <div className="mb-5">
        <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Notifications / LINE</p>
        <h1 className="text-lg md:text-xl font-medium mt-0.5 flex items-center gap-2">
          <span className="text-[#06C755]">{LINE_ICON}</span>LINE 訊息管理
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-[#f0f0f0] p-5 mb-5">
        <p className="text-sm font-medium mb-4">發送新訊息</p>

        <div className="mb-4">
          <label className="text-xs text-[#aaa] mb-2 block">發送對象</label>
          <div className="flex gap-2">
            <button onClick={() => setTarget("broadcast")} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${target === "broadcast" ? "bg-black text-white border-black" : "border-[#f0f0f0] text-[#555]"}`}><Users size={14} />全體推播</button>
            <button onClick={() => setTarget("specific")}  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${target === "specific"  ? "bg-black text-white border-black" : "border-[#f0f0f0] text-[#555]"}`}><User  size={14} />指定用戶</button>
          </div>
        </div>

        {target === "specific" && (
          <div className="mb-4">
            <label className="text-xs text-[#aaa] mb-1.5 block">LINE User ID</label>
            <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="U1a2b3c4d5e6f7g8h9..." className="w-full px-3 py-2.5 text-sm border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors" />
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs text-[#aaa] mb-2 block">訊息類型</label>
          <div className="flex gap-2">
            {(["text", "image"] as const).map(t => (
              <button key={t} onClick={() => setMsgType(t)} className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${msgType === t ? "bg-black text-white border-black" : "border-[#f0f0f0] text-[#555]"}`}>
                {t === "text" ? "文字" : "圖片"}
              </button>
            ))}
          </div>
        </div>

        {msgType === "text" ? (
          <div className="mb-4">
            <label className="text-xs text-[#aaa] mb-1.5 block">訊息內容</label>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={4} maxLength={2000} placeholder="輸入要傳送的文字訊息…" className="w-full px-3 py-2.5 text-sm border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors resize-none" />
            <p className="text-right text-[11px] text-[#ccc] mt-1">{text.length} / 2000</p>
          </div>
        ) : (
          <div className="mb-4">
            <label className="text-xs text-[#aaa] mb-1.5 block">圖片網址（公開 HTTPS URL）</label>
            <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" className="w-full px-3 py-2.5 text-sm border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors" />
          </div>
        )}

        {result && (
          <div className={`mb-4 px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 ${result.ok ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
            {result.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            {result.msg}
          </div>
        )}

        <button onClick={handleSend}
          disabled={sending || (!text && msgType === "text") || (!imageUrl && msgType === "image") || (target === "specific" && !userId.trim())}
          className="flex items-center gap-2 bg-[#06C755] hover:bg-[#05b34d] disabled:opacity-40 text-white text-sm px-5 py-2.5 rounded-lg transition-colors font-medium">
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {sending ? "發送中…" : "發送訊息"}
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
                <p className="text-sm line-clamp-2">{h.content}</p>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-[#aaa]">
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
