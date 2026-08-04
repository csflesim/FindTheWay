'use client'

import { useState, useRef, useEffect, useMemo } from "react"
import { TrendingUp, TrendingDown, HelpCircle, Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Order, OrderRow, ORDER_SELECT, orderFromRow, OrderDetail } from "../_lib/orders"

type TxType = "收入" | "退款"
type TxStatus = "已入帳" | "待確認" | "已退款"
type Transaction = { key: string; orderId: string | null; orderNo: string; date: string; type: TxType; item: string; student: string; amount: number; status: TxStatus }

const EMPTY_TX = {
  date: "", type: "收入" as TxType, item: "", student: "", amount: 0, status: "已入帳" as TxStatus,
}

const statusStyle: Record<string, string> = {
  "已入帳": "bg-black text-white",
  "待確認": "bg-[#fff3cd] text-[#856404]",
  "已退款": "bg-[#f5f5f5] text-[#999]",
}

function pad(n: number) { return String(n).padStart(2, "0") }

function firstOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
}
function endOfMonth(): string {
  const d = new Date()
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(last)}`
}

function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
        className="text-[#ccc] hover:text-[#999] transition-colors"
      >
        <HelpCircle size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-5 z-20 w-56 bg-[#1a1a1a] text-white text-[11px] leading-relaxed rounded-xl px-3 py-2.5 shadow-xl">
          {text}
          <div className="absolute -top-1.5 right-1 w-3 h-3 bg-[#1a1a1a] rotate-45 rounded-sm" />
        </div>
      )}
    </div>
  )
}

export default function FinancePage() {
  const supabase = useMemo(() => createClient(), [])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(firstOfMonth())
  const [to,   setTo]   = useState(endOfMonth())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [manualTx, setManualTx] = useState<Transaction[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_TX)

  useEffect(() => {
    supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("載入訂單失敗:", error.message)
        else setOrders((data as unknown as OrderRow[]).map(orderFromRow))
        setLoading(false)
      })
  }, [supabase])

  // 區間內訂單
  const inRange = useMemo(() => {
    const fromTs = new Date(from + "T00:00:00").getTime()
    const toTs   = new Date(to + "T23:59:59").getTime()
    return orders.filter(o => {
      const t = new Date(o.createdAt).getTime()
      return t >= fromTs && t <= toTs
    })
  }, [orders, from, to])

  // 由訂單推導交易明細
  const transactions = useMemo<Transaction[]>(() => {
    const list: Transaction[] = []
    for (const o of inRange) {
      if (o.payStatus === "已付款" || o.payStatus === "已售後") {
        list.push({ key: `${o.id}-in`, orderId: o.id, orderNo: o.orderNo, date: o.date, type: "收入", item: o.item, student: o.student, amount: o.amount, status: "已入帳" })
      }
      if (o.payStatus === "待確認") {
        list.push({ key: `${o.id}-pending`, orderId: o.id, orderNo: o.orderNo, date: o.date, type: "收入", item: o.item, student: o.student, amount: o.amount, status: "待確認" })
      }
      if (o.payStatus === "已售後" && o.afterSales) {
        list.push({ key: `${o.id}-refund`, orderId: o.id, orderNo: o.orderNo, date: o.afterSales.processedAt?.split(" ")[0] ?? o.date, type: "退款", item: o.item, student: o.student, amount: -o.afterSales.refundAmount, status: "已退款" })
      }
    }
    return [...manualTx, ...list]
  }, [inRange, manualTx])

  // 統計
  const stats = useMemo(() => {
    const income  = transactions.filter(t => t.type === "收入" && t.status === "已入帳").reduce((s, t) => s + t.amount, 0)
    const refund  = transactions.filter(t => t.type === "退款").reduce((s, t) => s + Math.abs(t.amount), 0)
    const pending = transactions.filter(t => t.status === "待確認").reduce((s, t) => s + t.amount, 0)
    const pendingCount = transactions.filter(t => t.status === "待確認").length

    // 課堂券結算：訂單金額均攤到每張券
    let settled = 0, unusedBalance = 0
    for (const o of inRange) {
      if (o.payStatus !== "已付款" && o.payStatus !== "已售後") continue
      if (o.tickets.length === 0) { settled += o.amount; continue }  // 單堂直購視為即時結算
      const per = o.amount / o.qty
      settled       += o.tickets.filter(t => t.status === "已使用").length * per
      unusedBalance += o.tickets.filter(t => t.status === "未使用").length * per
    }

    return [
      { label: "收入",   value: `NT$${income.toLocaleString()}`,  sub: `${transactions.filter(t => t.type === "收入" && t.status === "已入帳").length} 筆已入帳`, up: true,  tip: "該區間所收的現金收入" },
      { label: "退款",   value: `NT$${refund.toLocaleString()}`,  sub: `${transactions.filter(t => t.type === "退款").length} 筆退款`, up: true, tip: "該區間所退款支出" },
      { label: "淨收入", value: `NT$${(income - refund).toLocaleString()}`, sub: "收入 − 退款", up: true, tip: "該區間的淨收入為該區間的：收入 － 退款" },
      { label: "待收款", value: `NT$${pending.toLocaleString()}`, sub: `${pendingCount} 筆待確認`, up: false, tip: "訂單已產生，尚未收款之金額" },
      { label: "使用結算金額", value: `NT$${Math.round(settled).toLocaleString()}`, sub: "已服務課券結算", up: true, tip: "每一張訂單金額會平均至每一張上課券當中，使用結算為該區間內實際服務所產生之帳務結算。" },
      { label: "未使用餘額", value: `NT$${Math.round(unusedBalance).toLocaleString()}`, sub: "區間終點未服務課券", up: false, tip: "每一張訂單金額會平均至每一張上課券當中，未使用餘額為該區間的終點時間時，尚未服務的課程券餘額。" },
    ]
  }, [transactions, inRange])

  // 近六個月收入趨勢（全部訂單）
  const monthlyRevenue = useMemo(() => {
    const now = new Date()
    const months: { key: string; month: string; amount: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, month: `${d.getMonth() + 1}月`, amount: 0 })
    }
    for (const o of orders) {
      if (o.payStatus !== "已付款" && o.payStatus !== "已售後") continue
      const d = new Date(o.createdAt)
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
      const m = months.find(x => x.key === key)
      if (m) m.amount += o.amount
    }
    return months
  }, [orders])
  const maxAmount = Math.max(1, ...monthlyRevenue.map(m => m.amount))

  // 本月來源（依品項彙總）
  const breakdown = useMemo(() => {
    const map = new Map<string, number>()
    let total = 0
    for (const o of inRange) {
      if (o.payStatus !== "已付款" && o.payStatus !== "已售後") continue
      map.set(o.item, (map.get(o.item) ?? 0) + o.amount)
      total += o.amount
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, amount]) => ({ label, amount, pct: total > 0 ? Math.round(amount / total * 100) : 0 }))
  }, [inRange])

  const selectedOrder = selectedId ? orders.find(o => o.id === selectedId) ?? null : null

  function saveAdd() {
    if (!form.date || !form.item || !form.student || !form.amount) return
    const amount = form.type === "退款" ? -Math.abs(form.amount) : Math.abs(form.amount)
    const [, m, d] = form.date.split("-")
    setManualTx(list => [{
      key: `manual-${list.length + 1}`, orderId: null, orderNo: "手動",
      date: `${m}/${d}`, type: form.type, item: form.item, student: form.student, amount, status: form.status,
    }, ...list])
    setAddOpen(false)
    setForm(EMPTY_TX)
  }

  function setThisPeriod() { setFrom(firstOfMonth()); setTo(endOfMonth()) }
  function setLastPeriod() {
    const d = new Date()
    const y = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear()
    const m = d.getMonth() === 0 ? 12 : d.getMonth()
    const last = new Date(y, m, 0).getDate()
    setFrom(`${y}-${pad(m)}-01`)
    setTo(`${y}-${pad(m)}-${pad(last)}`)
  }

  return (
    <div className="p-4 md:p-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Finance</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">帳務管理</h1>
        </div>

        {/* Date filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white border border-[#f0f0f0] rounded-xl px-3 py-2">
            <input
              type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="text-sm text-[#333] outline-none bg-transparent w-[120px]"
            />
          </div>
          <span className="text-[#bbb] text-sm">～</span>
          <div className="flex items-center bg-white border border-[#f0f0f0] rounded-xl px-3 py-2">
            <input
              type="date" value={to} onChange={e => setTo(e.target.value)}
              className="text-sm text-[#333] outline-none bg-transparent w-[120px]"
            />
          </div>
          <button onClick={setThisPeriod}
            className="px-3 py-2 text-sm bg-white border border-[#f0f0f0] rounded-xl text-[#666] hover:border-black hover:text-black transition-colors">
            本期
          </button>
          <button onClick={setLastPeriod}
            className="px-3 py-2 text-sm bg-white border border-[#f0f0f0] rounded-xl text-[#666] hover:border-black hover:text-black transition-colors">
            上期
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {stats.map(({ label, value, sub, up, tip }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-[#999]">{label}</p>
              <Tooltip text={tip} />
            </div>
            <p className="text-lg md:text-xl font-medium leading-none">{value}</p>
            <div className={`flex items-center gap-1 mt-1.5 ${up ? "text-green-600" : "text-[#e08800]"}`}>
              {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              <p className="text-[10px]">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-6 mb-6">
        {/* Revenue bar chart */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-5">
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-4">月收入趨勢</p>
          <div className="flex items-end gap-2 h-36">
            {monthlyRevenue.map((m, i) => {
              const pct = Math.round((m.amount / maxAmount) * 100)
              const isLatest = i === monthlyRevenue.length - 1
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5">
                  <p className="text-[10px] text-[#999]">{(m.amount / 1000).toFixed(0)}k</p>
                  <div className="w-full rounded-t-md transition-all"
                    style={{ height: `${pct}%`, backgroundColor: isLatest ? "#000" : "#e8e8e8", minHeight: 4 }} />
                  <p className={`text-[10px] ${isLatest ? "font-medium" : "text-[#bbb]"}`}>{m.month}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Income breakdown */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-5">
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-4">本期來源</p>
          <div className="flex flex-col gap-3">
            {breakdown.length === 0 && <p className="text-sm text-[#ccc]">本期尚無收入</p>}
            {breakdown.map(({ label, amount, pct }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-[#666]">{label}</p>
                  <p className="text-xs font-medium">NT$ {amount.toLocaleString()}</p>
                </div>
                <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                  <div className="h-full bg-black rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">交易明細</p>
          <button onClick={() => { setForm(EMPTY_TX); setAddOpen(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-black text-white rounded-xl hover:bg-[#222] transition-colors">
            <Plus size={12} />新增交易明細
          </button>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
          <div className="grid grid-cols-[0.7fr_0.6fr_1.4fr_1.4fr_1fr_0.8fr_0.8fr] gap-4 px-5 py-3 border-b border-[#f5f5f5] text-[11px] text-[#aaa] uppercase tracking-widest">
            <span>日期</span><span>類型</span><span>項目</span><span>學員</span><span>金額</span><span>訂單</span><span>狀態</span>
          </div>
          <div className="divide-y divide-[#f5f5f5]">
            {loading && <p className="px-5 py-6 text-sm text-[#ccc]">載入中…</p>}
            {!loading && transactions.length === 0 && <p className="px-5 py-6 text-sm text-[#ccc]">本期尚無交易</p>}
            {transactions.map((t) => (
              <div key={t.key} className="grid grid-cols-[0.7fr_0.6fr_1.4fr_1.4fr_1fr_0.8fr_0.8fr] gap-4 items-center px-5 py-4">
                <p className="text-xs text-[#999]">{t.date}</p>
                <span className={`text-[11px] px-2 py-0.5 rounded-full w-fit ${
                  t.type === "收入" ? "bg-[#f0fdf4] text-green-700" : "bg-[#f5f5f5] text-[#999]"
                }`}>{t.type}</span>
                <p className="text-sm">{t.item}</p>
                <p className="text-sm text-[#666]">{t.student}</p>
                <p className={`text-sm font-medium ${t.amount < 0 ? "text-red-400" : ""}`}>
                  {t.amount < 0 ? "-" : ""}NT$ {Math.abs(t.amount).toLocaleString()}
                </p>
                {t.orderId ? (
                  <button
                    onClick={() => setSelectedId(t.orderId)}
                    className="text-xs text-black font-mono underline underline-offset-2 decoration-[#ccc] hover:decoration-black transition-colors text-left"
                  >{t.orderNo}</button>
                ) : (
                  <span className="text-xs text-[#bbb]">{t.orderNo}</span>
                )}
                <span className={`text-[11px] px-2.5 py-1 rounded-full w-fit ${statusStyle[t.status]}`}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden flex flex-col gap-3">
          {!loading && transactions.length === 0 && <p className="text-sm text-[#ccc] py-4">本期尚無交易</p>}
          {transactions.map((t) => (
            <div key={t.key} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <p className="text-sm font-medium">{t.item}</p>
                  <p className="text-xs text-[#aaa] mt-0.5">
                    {t.student} ·{" "}
                    {t.orderId ? (
                      <button
                        onClick={() => setSelectedId(t.orderId)}
                        className="font-mono underline underline-offset-2 decoration-[#ccc] hover:text-black hover:decoration-black transition-colors"
                      >{t.orderNo}</button>
                    ) : (
                      <span className="font-mono">{t.orderNo}</span>
                    )}
                  </p>
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full shrink-0 ${statusStyle[t.status]}`}>{t.status}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                    t.type === "收入" ? "bg-[#f0fdf4] text-green-700" : "bg-[#f5f5f5] text-[#999]"
                  }`}>{t.type}</span>
                  <p className="text-[10px] text-[#aaa]">{t.date}</p>
                </div>
                <p className={`text-sm font-medium ${t.amount < 0 ? "text-red-400" : ""}`}>
                  {t.amount < 0 ? "-" : ""}NT$ {Math.abs(t.amount).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Add transaction drawer */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setAddOpen(false)} />
          <aside className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f0f0] shrink-0">
              <h2 className="text-base font-medium">新增交易明細</h2>
              <button onClick={() => setAddOpen(false)} className="text-[#bbb] hover:text-black transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {/* 日期 */}
              <div>
                <label className="text-xs text-[#999] mb-1.5 block">日期</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors" />
              </div>

              {/* 類型 */}
              <div>
                <label className="text-xs text-[#999] mb-1.5 block">類型</label>
                <div className="flex gap-2">
                  {(["收入", "退款"] as TxType[]).map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={`flex-1 py-2.5 text-sm rounded-xl border transition-colors ${
                        form.type === t ? "bg-black text-white border-black" : "bg-[#fafaf9] border-[#f0f0f0] text-[#666] hover:border-[#ccc]"
                      }`}>{t}</button>
                  ))}
                </div>
              </div>

              {/* 項目 */}
              <div>
                <label className="text-xs text-[#999] mb-1.5 block">項目</label>
                <input placeholder="例：10堂體驗包" value={form.item} onChange={e => setForm(f => ({ ...f, item: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors" />
              </div>

              {/* 學員 */}
              <div>
                <label className="text-xs text-[#999] mb-1.5 block">學員</label>
                <input placeholder="學員姓名" value={form.student} onChange={e => setForm(f => ({ ...f, student: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors" />
              </div>

              {/* 金額 */}
              <div>
                <label className="text-xs text-[#999] mb-1.5 block">金額（NT$）</label>
                <input type="number" min="0" placeholder="0" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors" />
              </div>

              {/* 狀態 */}
              <div>
                <label className="text-xs text-[#999] mb-1.5 block">狀態</label>
                <div className="flex gap-2">
                  {(["已入帳", "待確認", "已退款"] as TxStatus[]).map(s => (
                    <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))}
                      className={`flex-1 py-2.5 text-xs rounded-xl border transition-colors ${
                        form.status === s ? "bg-black text-white border-black" : "bg-[#fafaf9] border-[#f0f0f0] text-[#666] hover:border-[#ccc]"
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#f0f0f0] shrink-0">
              <button onClick={saveAdd}
                className="w-full py-2.5 text-sm bg-black text-white rounded-xl hover:bg-[#222] transition-colors">
                新增
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
