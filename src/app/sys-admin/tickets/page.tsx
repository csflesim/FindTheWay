'use client'

import { useEffect, useMemo, useState } from "react"
import { Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type TicketPackage = {
  id: string
  name: string
  qty: number
  price: number
  isSingle: boolean
  expireMonths: number
  cancelHours: number
  transferable: boolean
  active: boolean
  sold: number
  notes?: string
}

type ProductRow = {
  id: string
  name: string
  sessions: number
  price: number
  is_single: boolean
  validity_months: number
  cancel_hours: number
  transferable: boolean
  active: boolean
  notes: string | null
  sort_order: number
}

const EMPTY_FORM = {
  name: "",
  qty: 1,
  price: 0,
  isSingle: false,
  expireMonths: 12,
  cancelHours: 24,
  transferable: false,
  active: true,
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

export default function TicketsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [packages, setPackages] = useState<TicketPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [drawer, setDrawer] = useState<"add" | "edit" | null>(null)
  const [editing, setEditing] = useState<TicketPackage | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    Promise.all([
      supabase.from("products").select("*").order("sort_order"),
      supabase.from("orders").select("product_id, status"),
    ]).then(([pRes, oRes]) => {
      if (pRes.error) { console.error("載入商品失敗:", pRes.error.message); setLoading(false); return }
      const orders = (oRes.data ?? []) as { product_id: string | null; status: string }[]
      const soldOf = (id: string) =>
        orders.filter(o => o.product_id === id && (o.status === "已付款" || o.status === "已售後")).length
      setPackages((pRes.data as ProductRow[]).map(r => ({
        id: r.id, name: r.name, qty: r.sessions, price: r.price, isSingle: r.is_single,
        expireMonths: r.validity_months, cancelHours: r.cancel_hours,
        transferable: r.transferable, active: r.active,
        sold: soldOf(r.id), notes: r.notes ?? "",
      })))
      setLoading(false)
    })
  }, [supabase])

  function openAdd() {
    setForm(EMPTY_FORM)
    setDrawer("add")
  }

  function openEdit(pkg: TicketPackage) {
    setEditing(pkg)
    setForm({
      name: pkg.name,
      qty: pkg.qty,
      price: pkg.price,
      isSingle: pkg.isSingle,
      expireMonths: pkg.expireMonths,
      cancelHours: pkg.cancelHours,
      transferable: pkg.transferable,
      active: pkg.active,
      notes: pkg.notes ?? "",
    })
    setDrawer("edit")
  }

  function close() {
    setDrawer(null)
    setEditing(null)
  }

  function formToRow() {
    return {
      name: form.name.trim(),
      sessions: form.isSingle ? 1 : form.qty,
      price: form.price,
      is_single: form.isSingle,
      validity_months: form.expireMonths,
      cancel_hours: form.cancelHours,
      transferable: form.transferable,
      active: form.active,
      notes: form.notes || null,
    }
  }

  async function saveAdd() {
    if (saving) return
    setSaving(true)
    const { data, error } = await supabase.from("products")
      .insert({ ...formToRow(), sort_order: packages.length + 1 })
      .select().single()
    setSaving(false)
    if (error) { alert(`新增失敗：${error.message}`); return }
    const r = data as ProductRow
    setPackages(prev => [...prev, {
      id: r.id, name: r.name, qty: r.sessions, price: r.price, isSingle: r.is_single,
      expireMonths: r.validity_months, cancelHours: r.cancel_hours,
      transferable: r.transferable, active: r.active, sold: 0, notes: r.notes ?? "",
    }])
    close()
  }

  async function saveEdit() {
    if (!editing || saving) return
    setSaving(true)
    const { error } = await supabase.from("products").update(formToRow()).eq("id", editing.id)
    setSaving(false)
    if (error) { alert(`儲存失敗：${error.message}`); return }
    setPackages(prev => prev.map(p =>
      p.id === editing.id
        ? { ...p, name: form.name, qty: form.isSingle ? 1 : form.qty, price: form.price, isSingle: form.isSingle, expireMonths: form.expireMonths, cancelHours: form.cancelHours, transferable: form.transferable, active: form.active, notes: form.notes || undefined }
        : p
    ))
    close()
  }

  async function toggleActive(id: string) {
    const target = packages.find(p => p.id === id)
    if (!target) return
    const { error } = await supabase.from("products").update({ active: !target.active }).eq("id", id)
    if (error) { alert(`更新失敗：${error.message}`); return }
    setPackages(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p))
  }

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  const drawerOpen = drawer !== null

  return (
    <div className="p-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Tickets</p>
          <h1 className="text-xl font-medium mt-0.5">課堂券組合</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-black text-white text-sm px-4 py-2 rounded-lg hover:bg-[#222] transition-colors"
        >
          <Plus size={15} />新增組合
        </button>
      </div>

      {/* Cards grid */}
      {loading && <p className="text-sm text-[#ccc]">載入中…</p>}
      <div className="grid md:grid-cols-2 gap-4">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`bg-white rounded-xl border border-[#f0f0f0] p-5 transition-opacity ${!pkg.active ? "opacity-60" : ""}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium">{pkg.name}</p>
                <p className="text-xs text-[#999] mt-0.5">{pkg.isSingle ? "單堂" : `${pkg.qty} 堂 / set`}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                pkg.active ? "border-black text-black" : "border-[#ddd] text-[#aaa]"
              }`}>
                {pkg.active ? "上架中" : "已下架"}
              </span>
            </div>

            <p className="text-2xl font-light">NT$ {pkg.price.toLocaleString()}</p>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#f5f5f5]">
              <div className="flex gap-3 text-xs text-[#999]">
                <span>已售 {pkg.sold} 組</span>
                <span className={pkg.transferable ? "text-black font-medium" : ""}>
                  {pkg.transferable ? "可轉讓" : "不可轉讓"}
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => openEdit(pkg)}
                  className="text-xs text-[#999] hover:text-black transition-colors"
                >
                  編輯
                </button>
                <button
                  onClick={() => toggleActive(pkg.id)}
                  className="text-xs text-[#999] hover:text-black transition-colors"
                >
                  {pkg.active ? "下架" : "上架"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Drawer ── */}
      {drawerOpen && (
        <Drawer
          title={drawer === "add" ? "新增組合" : "編輯組合"}
          onClose={close}
        >
          <div className="flex flex-col gap-5 p-6">
            <Field label="組合名稱">
              <input
                className={inputCls}
                placeholder="例：10堂體驗包"
                value={form.name}
                onChange={e => set("name", e.target.value)}
              />
            </Field>

            <Field label="型別">
              <div className="flex gap-2">
                {([false, true] as const).map(v => (
                  <button
                    key={String(v)}
                    onClick={() => { set("isSingle", v); if (v) set("qty", 1) }}
                    className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${
                      form.isSingle === v
                        ? "bg-black text-white border-black"
                        : "bg-[#fafaf9] text-[#555] border-[#f0f0f0] hover:border-[#ccc]"
                    }`}
                  >
                    {v ? "單堂" : "券包"}
                  </button>
                ))}
              </div>
              {form.isSingle && (
                <p className="text-[11px] text-[#bbb] mt-1.5">單堂型別堂數固定為 1，可作為課程直接報名的計價商品</p>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="堂數">
                <input
                  type="number"
                  min={1}
                  disabled={form.isSingle}
                  className={`${inputCls} ${form.isSingle ? "opacity-50" : ""}`}
                  value={form.isSingle ? 1 : form.qty}
                  onChange={e => set("qty", Number(e.target.value))}
                />
              </Field>
              <Field label="售價（NT$）">
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={form.price}
                  onChange={e => set("price", Number(e.target.value))}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="有效期（月）">
                <input
                  type="number" min={0}
                  className={inputCls}
                  value={form.expireMonths}
                  onChange={e => set("expireMonths", Number(e.target.value))}
                />
              </Field>
              <Field label="取消期限（小時前）">
                <input
                  type="number" min={0}
                  className={inputCls}
                  value={form.cancelHours}
                  onChange={e => set("cancelHours", Number(e.target.value))}
                />
              </Field>
            </div>

            <Field label="可轉讓">
              <div className="flex gap-2">
                {([true, false] as const).map(v => (
                  <button
                    key={String(v)}
                    onClick={() => set("transferable", v)}
                    className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${
                      form.transferable === v
                        ? "bg-black text-white border-black"
                        : "bg-[#fafaf9] text-[#555] border-[#f0f0f0] hover:border-[#ccc]"
                    }`}
                  >
                    {v ? "可轉讓" : "不可轉讓"}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="狀態">
              <div className="flex gap-2">
                {([true, false] as const).map(v => (
                  <button
                    key={String(v)}
                    onClick={() => set("active", v)}
                    className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${
                      form.active === v
                        ? "bg-black text-white border-black"
                        : "bg-[#fafaf9] text-[#555] border-[#f0f0f0] hover:border-[#ccc]"
                    }`}
                  >
                    {v ? "上架" : "下架"}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="備註">
              <textarea
                className={`${inputCls} resize-none h-20`}
                placeholder="選填"
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
              />
            </Field>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#f0f0f0] flex gap-3 shrink-0">
            <button
              onClick={close}
              className="flex-1 py-2.5 text-sm border border-[#f0f0f0] rounded-xl text-[#666] hover:border-[#ccc] transition-colors"
            >
              取消
            </button>
            <button
              onClick={drawer === "add" ? saveAdd : saveEdit}
              disabled={saving || !form.name || form.qty < 1 || form.price < 0}
              className="flex-1 py-2.5 text-sm bg-black text-white rounded-xl hover:bg-[#222] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "儲存中…" : drawer === "add" ? "新增" : "儲存"}
            </button>
          </div>
        </Drawer>
      )}
    </div>
  )
}
