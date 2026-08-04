'use client'

import { useState } from "react"
import { X, Plus } from "lucide-react"
import { useAvailability, type Block } from "../context/AvailabilityProvider"

const HOURS = Array.from({ length: 14 }, (_, i) => {
  const h = i + 9
  return `${String(h).padStart(2, "0")}:00`
})

export default function AvailabilityPage() {
  const { blocks, addBlock, removeBlock } = useAvailability()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    dateStr: "",
    startTime: "09:00",
    endTime: "12:00",
    reason: "",
  })

  const sorted = [...blocks].sort((a, b) => a.dateStr.localeCompare(b.dateStr))

  function submit() {
    if (!form.dateStr || !form.startTime || !form.endTime) return
    addBlock(form)
    setForm({ dateStr: "", startTime: "09:00", endTime: "12:00", reason: "" })
    setShowForm(false)
  }

  function remove(id: string) {
    removeBlock(id)
  }

  const DAYS = ["日", "一", "二", "三", "四", "五", "六"]
  function dayLabel(ds: string) {
    const [y, m, d] = ds.split("-").map(Number)
    const dow = new Date(y, m - 1, d).getDay()
    return `${ds.slice(5).replace("-", "/")} 週${DAYS[dow]}`
  }

  function isAllDay(b: Block) {
    return b.startTime === "09:00" && b.endTime === "22:00"
  }

  return (
    <div>
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-[#ebebeb] px-5 py-4 z-10">
        <p className="text-[10px] text-[#aaa] tracking-widest uppercase">Teacher</p>
        <h1 className="text-sm font-medium">請假 / 不可出席時段</h1>
      </header>

      {/* Info banner */}
      <div className="mx-4 mt-4 bg-[#f5f5f5] rounded-xl px-4 py-3">
        <p className="text-xs text-[#666] leading-relaxed">
          設定後管理員可見。已排課的課程不受影響，請另行聯繫管理員處理。
        </p>
      </div>

      {/* Blocks list */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-[#aaa] uppercase tracking-widest">已設定的不可出席時段</p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-[11px] bg-black text-white px-3 py-1.5 rounded-full"
          >
            <Plus size={12} />
            新增
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className="text-sm text-[#999] text-center py-8">尚未設定任何不可出席時段</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((block) => (
              <div key={block.id} className="bg-white rounded-xl px-4 py-3.5 border border-[#f0f0f0] flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{dayLabel(block.dateStr)}</p>
                  <p className="text-xs text-[#999] mt-0.5">
                    {isAllDay(block) ? "全天" : `${block.startTime} – ${block.endTime}`}
                    {block.reason ? ` · ${block.reason}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => remove(block.id)}
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-[#f5f5f5]"
                >
                  <X size={14} className="text-[#999]" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative w-full bg-white rounded-t-2xl px-5 py-6 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-medium">新增不可出席時段</h2>
              <button onClick={() => setShowForm(false)}>
                <X size={18} className="text-[#999]" />
              </button>
            </div>

            {/* Date */}
            <div className="mb-4">
              <label className="text-[10px] text-[#aaa] uppercase tracking-widest block mb-1.5">日期</label>
              <input
                type="date"
                value={form.dateStr}
                onChange={(e) => setForm({ ...form, dateStr: e.target.value })}
                className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black"
              />
            </div>

            {/* Time range */}
            <div className="mb-4">
              <label className="text-[10px] text-[#aaa] uppercase tracking-widest block mb-1.5">時間段</label>
              <div className="flex gap-2 items-center">
                <select
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="flex-1 border border-[#e5e5e5] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black"
                >
                  {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="text-[#aaa] text-sm">至</span>
                <select
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="flex-1 border border-[#e5e5e5] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black"
                >
                  {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <button
                onClick={() => setForm({ ...form, startTime: "09:00", endTime: "22:00" })}
                className={`mt-2 text-[11px] px-3 py-1 rounded-full border transition-colors ${
                  isAllDay(form as Block)
                    ? "bg-black text-white border-black"
                    : "border-[#ddd] text-[#666]"
                }`}
              >
                全天
              </button>
            </div>

            {/* Reason */}
            <div className="mb-5">
              <label className="text-[10px] text-[#aaa] uppercase tracking-widest block mb-1.5">原因（選填）</label>
              <input
                type="text"
                placeholder="例：出差、家庭事務…"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black"
              />
            </div>

            <button
              onClick={submit}
              disabled={!form.dateStr}
              className="w-full py-3.5 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-30"
            >
              確認新增
            </button>
          </div>
        </div>
      )}

      <div className="h-6" />
    </div>
  )
}
