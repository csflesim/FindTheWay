'use client'

import { useState, useMemo, useEffect } from "react"
import { Search, Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  Order, OrderRow, PayStatus, PAY_METHODS, Product,
  ORDER_SELECT, orderFromRow, issueTickets,
  payStatusStyle, useStatusStyle, getUseStatus,
  ticketConsumed, OrderDetail,
} from "../_lib/orders"
import { AfterSalesPanel } from "../_lib/aftersales"

type Account = { id: string; name: string }
type StudentRef = { id: string; name: string; owner_id: string }

const ALL_PAY_STATUSES: PayStatus[] = ["已付款", "待確認", "已退款", "已取消", "已售後"]

const EMPTY_FORM = {
  accountId: "",
  studentId: "",
  productId: "",
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

// ── Main Page ────────────────────────────────────────

export default function OrdersPage() {
  const supabase = useMemo(() => createClient(), [])
  const [orders, setOrders]           = useState<Order[]>([])
  const [accounts, setAccounts]       = useState<Account[]>([])
  const [students, setStudents]       = useState<StudentRef[]>([])
  const [products, setProducts]       = useState<Product[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [query, setQuery]             = useState("")
  const [filterStatus, setFilterStatus] = useState<PayStatus | "全部">("全部")
  const [drawer, setDrawer]           = useState(false)
  const [detail, setDetail]           = useState<Order | null>(null)
  const [afterSalesTarget, setAfterSalesTarget] = useState<Order | null>(null)
  const [form, setForm]               = useState(EMPTY_FORM)

  useEffect(() => {
    Promise.all([
      supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, name").order("name"),
      supabase.from("students").select("id, name, owner_id").eq("status", "已核准"),
      supabase.from("products").select("id, name, sessions, price, validity_months").eq("active", true).order("sort_order"),
    ]).then(([oRes, pRes, sRes, prodRes]) => {
      if (oRes.error) console.error("載入訂單失敗:", oRes.error.message)
      else setOrders((oRes.data as unknown as OrderRow[]).map(orderFromRow))
      setAccounts((pRes.data ?? []) as Account[])
      setStudents((sRes.data ?? []) as StudentRef[])
      setProducts((prodRes.data ?? []) as Product[])
      setLoading(false)
    })
  }, [supabase])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders.filter(o => {
      const matchQ = !q || o.orderNo.toLowerCase().includes(q) || o.student.includes(q) || o.account.includes(q) || o.item.includes(q)
      const matchS = filterStatus === "全部" || o.payStatus === filterStatus
      return matchQ && matchS
    })
  }, [orders, query, filterStatus])

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function selectPackage(id: string) {
    const pkg = products.find(p => p.id === id)
    setForm(f => ({ ...f, productId: id, amount: pkg?.price ?? 0 }))
  }

  async function refetchOrder(id: string): Promise<Order | null> {
    const { data, error } = await supabase.from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle()
    if (error || !data) return null
    return orderFromRow(data as unknown as OrderRow)
  }

  async function saveAdd() {
    if (saving) return
    const pkg = products.find(p => p.id === form.productId)
    if (!form.accountId || !pkg) return
    setSaving(true)
    try {
      const paid = form.payStatus === "已付款"
      const { data, error } = await supabase.from("orders").insert({
        member_id: form.accountId,
        student_id: form.studentId || null,
        product_id: pkg.id,
        item_name: pkg.name,
        qty: pkg.sessions,
        amount: form.amount,
        status: form.payStatus,
        pay_method: paid ? form.payMethod : null,
        paid_at: paid ? new Date().toISOString() : null,
        notes: form.notes || null,
      }).select("id, order_no, student_id, qty").single()
      if (error) throw new Error(error.message)

      if (paid) {
        const errMsg = await issueTickets(supabase, {
          id: data.id, orderNo: data.order_no, studentId: data.student_id, qty: data.qty,
        }, pkg.validity_months)
        if (errMsg) throw new Error(errMsg)
      }
      const fresh = await refetchOrder(data.id)
      if (fresh) setOrders(prev => [fresh, ...prev])
      setDrawer(false)
      setForm(EMPTY_FORM)
    } catch (err) {
      alert(err instanceof Error ? err.message : "新增失敗")
    } finally {
      setSaving(false)
    }
  }

  async function confirmPayment(order: Order, method: string) {
    if (saving) return
    setSaving(true)
    try {
      // 伺服器端統一處理：發券、課堂券扣抵核銷、報名人數同步、工作流觸發
      const res = await fetch("/api/orders/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, payMethod: method }),
      })
      const d = await res.json()
      if (!res.ok || !d.ok) throw new Error(d.error ?? `確認失敗（${res.status}）`)

      const fresh = await refetchOrder(order.id)
      if (fresh) setOrders(prev => prev.map(o => o.id === order.id ? fresh : o))
      setDetail(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : "確認付款失敗")
    } finally {
      setSaving(false)
    }
  }

  async function cancelOrder(id: string) {
    const { error } = await supabase.from("orders").update({ status: "已取消" }).eq("id", id)
    if (error) { alert(`取消失敗：${error.message}`); return }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, payStatus: "已取消" as PayStatus } : o))
    setDetail(null)
    // 觸發「報名取消」工作流（不阻塞 UI）
    fetch("/api/workflows/fire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "order", subtype: "cancelled", orderId: id }),
    }).catch(() => {})
  }

  function handleAfterSalesProcessed(updated: Order) {
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
    setAfterSalesTarget(null)
  }

  const accountStudents = students.filter(s => s.owner_id === form.accountId)

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
          <span>訂單</span><span>學員</span><span>所屬帳號</span><span>品項</span><span>金額</span><span>日期</span><span>付款狀態</span><span>使用狀態</span><span />
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {loading && <p className="px-5 py-6 text-sm text-[#ccc]">載入中…</p>}
          {!loading && filtered.length === 0 && <p className="px-5 py-6 text-sm text-[#ccc]">查無訂單</p>}
          {filtered.map((o) => {
            const useStatus = getUseStatus(o)
            return (
              <div
                key={o.id}
                className="grid grid-cols-[0.7fr_0.8fr_0.8fr_1.2fr_0.8fr_0.5fr_0.75fr_1fr_auto] gap-3 items-center px-5 py-4 hover:bg-[#fafaf9] transition-colors cursor-pointer"
                onClick={() => setDetail(o)}
              >
                <p className="text-xs text-[#999] font-mono">{o.orderNo}</p>
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
        {loading && <p className="text-sm text-[#ccc] py-4">載入中…</p>}
        {!loading && filtered.length === 0 && <p className="text-sm text-[#ccc] py-4">查無訂單</p>}
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
                  <p className="text-xs text-[#aaa]">{o.orderNo} · {o.date}</p>
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
              <select className={inputCls} value={form.accountId}
                onChange={e => setForm(f => ({ ...f, accountId: e.target.value, studentId: "" }))}>
                <option value="">選擇帳號</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>

            <Field label="學員（選填）">
              <select
                className={inputCls}
                value={form.studentId}
                onChange={e => set("studentId", e.target.value)}
                disabled={!form.accountId}
              >
                <option value="">{form.accountId ? "不指定（本人）" : "請先選擇帳號"}</option>
                {accountStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>

            <Field label="課堂券組合">
              <select className={inputCls} value={form.productId} onChange={e => selectPackage(e.target.value)}>
                <option value="">選擇組合</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
              disabled={saving || !form.accountId || !form.productId || form.amount <= 0}
              className="flex-1 py-2.5 text-sm bg-black text-white rounded-xl hover:bg-[#222] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {saving ? "儲存中…" : "新增"}
            </button>
          </div>
        </Drawer>
      )}

      {/* ── Detail Panel ── */}
      {detail && (
        <OrderDetail
          order={detail}
          onClose={() => setDetail(null)}
          onConfirm={detail.payStatus === "待確認" ? (method) => confirmPayment(detail, method) : undefined}
          onCancel={detail.payStatus === "待確認" ? () => cancelOrder(detail.id) : undefined}
          onInitiateAfterSales={
            detail.payStatus === "已付款" && detail.tickets.some(ticketConsumed)
              ? () => { setAfterSalesTarget(detail); setDetail(null) }
              : undefined
          }
        />
      )}

      {/* ── After-Sales Panel ── */}
      {afterSalesTarget && (
        <AfterSalesPanel
          order={afterSalesTarget}
          onClose={() => setAfterSalesTarget(null)}
          onProcessed={handleAfterSalesProcessed}
        />
      )}
    </div>
  )
}
