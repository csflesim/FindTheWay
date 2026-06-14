'use client'

import { useState, useMemo } from "react"
import { Search, Plus, X } from "lucide-react"
import {
  Order, PayStatus, Ticket,
  INITIAL_ORDERS, makeTickets,
  payStatusStyle, useStatusStyle, getUseStatus,
  OrderDetail,
} from "../_lib/orders"

const PACKAGES = [
  { name: "單堂試課券", qty: 1,  price: 1200 },
  { name: "5堂精選包",  qty: 5,  price: 5500 },
  { name: "10堂體驗包", qty: 10, price: 9800 },
  { name: "20堂年繳包", qty: 20, price: 18000 },
]

const ACCOUNTS = [
  { name: "鄭大德", students: ["鄭小德", "鄭小明"] },
  { name: "賴大紫", students: ["賴小柏", "賴小紫", "林小雅"] },
]

const PAY_METHODS = ["銀行轉帳", "現金", "Line Pay", "信用卡"]
const ALL_PAY_STATUSES: PayStatus[] = ["已付款", "待確認", "已退款"]

const EMPTY_FORM = {
  account: "",
  studentName: "",
  item: "",
  qty: 1,
  amount: 0,
  payMethod: "銀行轉帳",
  payStatus: "待確認" as PayStatus,
  notes: "",
}

// ── Drawer ──────────────────────────────────────────

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f0f0] shrink-0">
          <h2 className="text-base font-medium">{title}</h2>
          <button onClick={onClose} className="text-[#bbb] hover:text-black transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-[#999] mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black focus:bg-white transition-colors"

// ── Helpers ──────────────────────────────────────────

function nextOrderId(orders: Order[]) {
  const nums = orders.map(o => parseInt(o.id.replace("ORD-", ""), 10)).filter(n => !isNaN(n))
  const max = nums.length ? Math.max(...nums) : 40
  return `ORD-${String(max + 1).padStart(4, "0")}`
}

function todayMMDD() {
  const d = new Date()
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
}

// ── Main Page ────────────────────────────────────────

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS)
  const [query, setQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<PayStatus | "全部">("全部")
  const [drawer, setDrawer] = useState(false)
  const [detail, setDetail] = useState<Order | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders.filter(o => {
      const matchQ = !q || o.id.toLowerCase().includes(q) || o.student.includes(q) || o.account.includes(q) || o.item.includes(q)
      const matchS = filterStatus === "全部" || o.payStatus === filterStatus
      return matchQ && matchS
    })
  }, [orders, query, filterStatus])

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function selectAccount(name: string) {
    setForm(f => ({ ...f, account: name, studentName: "" }))
  }

  function selectPackage(name: string) {
    const pkg = PACKAGES.find(p => p.name === name)
    setForm(f => ({ ...f, item: name, qty: pkg?.qty ?? 1, amount: pkg?.price ?? 0 }))
  }

  function saveAdd() {
    const id = nextOrderId(orders)
    const order: Order = {
      id,
      student: form.studentName,
      account: form.account,
      item: form.item,
      qty: form.qty,
      amount: form.amount,
      date: todayMMDD(),
      payStatus: form.payStatus,
      payMethod: form.payMethod,
      notes: form.notes || undefined,
      tickets: makeTickets(id, form.qty, 0),
    }
    setOrders(prev => [order, ...prev])
    setDrawer(false)
    setForm(EMPTY_FORM)
  }

  function confirmPayment(id: string) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, payStatus: "已付款" as PayStatus } : o))
    setDetail(prev => prev?.id === id ? { ...prev, payStatus: "已付款" as PayStatus } : prev)
  }

  function refund(id: string) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, payStatus: "已退款" as PayStatus } : o))
    setDetail(prev => prev?.id === id ? { ...prev, payStatus: "已退款" as PayStatus } : prev)
  }

  return (
    <div className="p-4 md:p-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Orders</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">訂單管理</h1>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setDrawer(true) }}
          className="flex items-center gap-1.5 bg-black text-white text-sm px-4 py-2 rounded-lg hover:bg-[#222] transition-colors"
        >
          <Plus size={15} />手動新增訂單
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜尋訂單 / 學員..."
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors"
        />
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-4">
        {(["全部", ...ALL_PAY_STATUSES] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filterStatus === s
                ? "bg-black text-white border-black"
                : "bg-white text-[#666] border-[#f0f0f0] hover:border-[#ccc]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
        <div className="grid grid-cols-[0.7fr_0.8fr_0.8fr_1.2fr_0.8fr_0.5fr_0.75fr_1fr_auto] gap-3 px-5 py-3 border-b border-[#f5f5f5] text-[11px] text-[#aaa] uppercase tracking-widest">
          <span>訂單</span><span>學員</span><span>所屬帳號</span><span>組合</span><span>金額</span><span>日期</span><span>付款狀態</span><span>使用狀態</span><span />
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {filtered.length === 0 && <p className="px-5 py-6 text-sm text-[#ccc]">查無訂單</p>}
          {filtered.map((o) => {
            const useStatus = getUseStatus(o)
            return (
              <div
                key={o.id}
                className="grid grid-cols-[0.7fr_0.8fr_0.8fr_1.2fr_0.8fr_0.5fr_0.75fr_1fr_auto] gap-3 items-center px-5 py-4 hover:bg-[#fafaf9] transition-colors cursor-pointer"
                onClick={() => setDetail(o)}
              >
                <p className="text-xs text-[#999] font-mono">{o.id}</p>
                <p className="text-sm font-medium">{o.student}</p>
                <p className="text-xs text-[#aaa]">{o.account}</p>
                <p className="text-sm text-[#666]">{o.item}</p>
                <p className="text-sm font-medium">NT$ {o.amount.toLocaleString()}</p>
                <p className="text-xs text-[#999]">{o.date}</p>
                <span className={`text-[11px] px-2.5 py-1 rounded-full w-fit ${payStatusStyle[o.payStatus]}`}>{o.payStatus}</span>
                {useStatus ? (
                  <span className={`text-[11px] px-2.5 py-1 rounded-full w-fit ${useStatusStyle(useStatus)}`}>{useStatus}</span>
                ) : (
                  <span className="text-[11px] text-[#ddd]">—</span>
                )}
                <button className="text-xs text-[#999] hover:text-black transition-colors whitespace-nowrap">查看</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {filtered.length === 0 && <p className="text-sm text-[#ccc] py-4">查無訂單</p>}
        {filtered.map((o) => {
          const useStatus = getUseStatus(o)
          return (
            <button
              key={o.id}
              onClick={() => setDetail(o)}
              className="w-full bg-white rounded-xl p-4 border border-[#f0f0f0] text-left hover:border-[#ddd] transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <p className="text-sm font-medium">{o.student}</p>
                  <p className="text-xs text-[#aaa]">{o.id} · {o.date}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[11px] px-2.5 py-1 rounded-full ${payStatusStyle[o.payStatus]}`}>{o.payStatus}</span>
                  {useStatus && <span className={`text-[11px] px-2.5 py-1 rounded-full ${useStatusStyle(useStatus)}`}>{useStatus}</span>}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-[#999]">{o.item}</p>
                <p className="text-sm font-medium">NT$ {o.amount.toLocaleString()}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Add Drawer ── */}
      {drawer && (
        <Drawer title="手動新增訂單" onClose={() => setDrawer(false)}>
          <div className="flex flex-col gap-5 p-6">
            <Field label="所屬帳號">
              <select className={inputCls} value={form.account} onChange={e => selectAccount(e.target.value)}>
                <option value="">選擇帳號</option>
                {ACCOUNTS.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
              </select>
            </Field>

            <Field label="學員">
              <select
                className={inputCls}
                value={form.studentName}
                onChange={e => set("studentName", e.target.value)}
                disabled={!form.account}
              >
                <option value="">{form.account ? "選擇學員" : "請先選擇帳號"}</option>
                {(ACCOUNTS.find(a => a.name === form.account)?.students ?? []).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>

            <Field label="課堂券組合">
              <select className={inputCls} value={form.item} onChange={e => selectPackage(e.target.value)}>
                <option value="">選擇組合</option>
                {PACKAGES.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </Field>

            <Field label="金額（NT$）">
              <input
                type="number" min={0} className={inputCls}
                value={form.amount}
                onChange={e => set("amount", Number(e.target.value))}
              />
            </Field>

            <Field label="付款方式">
              <div className="grid grid-cols-2 gap-2">
                {PAY_METHODS.map(m => (
                  <button key={m} onClick={() => set("payMethod", m)}
                    className={`py-2 text-sm rounded-xl border transition-colors ${
                      form.payMethod === m ? "bg-black text-white border-black" : "bg-[#fafaf9] text-[#555] border-[#f0f0f0] hover:border-[#ccc]"
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="付款狀態">
              <div className="flex gap-2">
                {(["待確認", "已付款"] as PayStatus[]).map(s => (
                  <button key={s} onClick={() => set("payStatus", s)}
                    className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${
                      form.payStatus === s ? "bg-black text-white border-black" : "bg-[#fafaf9] text-[#555] border-[#f0f0f0] hover:border-[#ccc]"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="備註">
              <textarea className={`${inputCls} resize-none h-20`} placeholder="選填"
                value={form.notes} onChange={e => set("notes", e.target.value)} />
            </Field>
          </div>

          <div className="px-6 py-4 border-t border-[#f0f0f0] flex gap-3 shrink-0">
            <button onClick={() => setDrawer(false)}
              className="flex-1 py-2.5 text-sm border border-[#f0f0f0] rounded-xl text-[#666] hover:border-[#ccc] transition-colors">
              取消
            </button>
            <button onClick={saveAdd}
              disabled={!form.account || !form.studentName || !form.item || form.amount <= 0}
              className="flex-1 py-2.5 text-sm bg-black text-white rounded-xl hover:bg-[#222] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              新增
            </button>
          </div>
        </Drawer>
      )}

      {/* ── Detail Panel ── */}
      {detail && (
        <OrderDetail
          order={detail}
          onClose={() => setDetail(null)}
          onConfirm={() => confirmPayment(detail.id)}
          onRefund={() => refund(detail.id)}
        />
      )}
    </div>
  )
}
