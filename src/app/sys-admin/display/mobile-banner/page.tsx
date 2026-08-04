'use client'

import { useEffect, useMemo, useState } from "react"
import { Plus, X, Trash2, Upload, GripVertical } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { uploadImage } from "@/lib/upload"

type Banner = {
  id: string
  img: string
  title: string
  link: string
  active: boolean
}

type BannerRow = {
  id: string
  image_url: string
  title: string | null
  link_url: string | null
  sort_order: number
  active: boolean
}

function fromRow(r: BannerRow): Banner {
  return { id: r.id, img: r.image_url, title: r.title ?? "", link: r.link_url ?? "", active: r.active }
}

function Drawer({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  )
}

const inputCls = "w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black focus:bg-white transition-colors"

export default function MobileBannerPage() {
  const supabase = useMemo(() => createClient(), [])
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [drawer, setDrawer] = useState<"add" | "edit" | null>(null)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [form, setForm] = useState({ img: "", title: "", link: "", active: true })

  useEffect(() => {
    supabase.from("banners").select("*").order("sort_order").then(({ data, error }) => {
      if (error) console.error("載入廣告圖失敗:", error.message)
      else setBanners((data as BannerRow[]).map(fromRow))
      setLoading(false)
    })
  }, [supabase])

  function handleImgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setForm(f => ({ ...f, img: reader.result as string }))
    reader.readAsDataURL(file)
  }

  function openAdd() {
    setForm({ img: "", title: "", link: "", active: true })
    setDrawer("add")
  }

  function openEdit(b: Banner) {
    setEditing(b)
    setForm({ img: b.img, title: b.title, link: b.link, active: b.active })
    setDrawer("edit")
  }

  function close() { setDrawer(null); setEditing(null) }

  async function saveAdd() {
    if (!form.img || saving) return
    setSaving(true)
    try {
      const imageUrl = await uploadImage(supabase, form.img, "banners")
      const { data, error } = await supabase.from("banners").insert({
        image_url: imageUrl,
        title: form.title || null,
        link_url: form.link || null,
        active: form.active,
        sort_order: banners.length + 1,
      }).select().single()
      if (error) throw new Error(error.message)
      setBanners(prev => [...prev, fromRow(data as BannerRow)])
      close()
    } catch (err) {
      alert(err instanceof Error ? err.message : "新增失敗")
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit() {
    if (!editing || saving) return
    setSaving(true)
    try {
      const imageUrl = await uploadImage(supabase, form.img, "banners")
      const { error } = await supabase.from("banners").update({
        image_url: imageUrl,
        title: form.title || null,
        link_url: form.link || null,
        active: form.active,
      }).eq("id", editing.id)
      if (error) throw new Error(error.message)
      setBanners(prev => prev.map(b => b.id === editing.id ? { ...b, img: imageUrl, title: form.title, link: form.link, active: form.active } : b))
      close()
    } catch (err) {
      alert(err instanceof Error ? err.message : "儲存失敗")
    } finally {
      setSaving(false)
    }
  }

  async function deleteBanner(id: string) {
    if (!confirm("確定刪除此廣告圖？")) return
    const { error } = await supabase.from("banners").delete().eq("id", id)
    if (error) { alert(`刪除失敗：${error.message}`); return }
    setBanners(prev => prev.filter(b => b.id !== id))
    close()
  }

  async function toggleActive(id: string) {
    const target = banners.find(b => b.id === id)
    if (!target) return
    const { error } = await supabase.from("banners").update({ active: !target.active }).eq("id", id)
    if (error) { alert(`更新失敗：${error.message}`); return }
    setBanners(prev => prev.map(b => b.id === id ? { ...b, active: !b.active } : b))
  }

  // 重新排序後把整份順序寫回 DB
  async function persistOrder(next: Banner[]) {
    setBanners(next)
    const updates = next.map((b, i) => supabase.from("banners").update({ sort_order: i + 1 }).eq("id", b.id))
    const results = await Promise.all(updates)
    const failed = results.find(r => r.error)
    if (failed?.error) alert(`儲存排序失敗：${failed.error.message}`)
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    const next = [...banners]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    persistOrder(next)
  }

  function moveDown(idx: number) {
    if (idx >= banners.length - 1) return
    const next = [...banners]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    persistOrder(next)
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Display</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">手機版廣告圖</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-black text-white text-sm px-3 md:px-4 py-2 rounded-lg hover:bg-[#222] transition-colors">
          <Plus size={15} /><span className="hidden sm:inline">新增廣告</span><span className="sm:hidden">新增</span>
        </button>
      </div>

      <p className="text-xs text-[#aaa] mb-4">廣告圖依順序顯示於手機首頁輪播（前三堂開課中課程的橫圖會自動接在後面），建議尺寸：1200 × 400 px（3:1）</p>

      {/* Banner list */}
      <div className="flex flex-col gap-3">
        {loading && (
          <div className="bg-white rounded-xl border border-[#f0f0f0] px-5 py-10 text-center">
            <p className="text-sm text-[#ccc]">載入中…</p>
          </div>
        )}
        {!loading && banners.length === 0 && (
          <div className="bg-white rounded-xl border border-[#f0f0f0] px-5 py-10 text-center">
            <p className="text-sm text-[#ccc]">尚無廣告圖，點擊「新增廣告」開始</p>
          </div>
        )}
        {banners.map((b, idx) => (
          <div key={b.id} className={`bg-white rounded-xl border overflow-hidden ${b.active ? "border-[#f0f0f0]" : "border-[#f0f0f0] opacity-50"}`}>
            {/* Preview */}
            <div className="relative">
              <img src={b.img} alt={b.title} className="w-full aspect-[3/1] object-cover" />
              {!b.active && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <span className="text-xs text-[#999] bg-white px-2.5 py-1 rounded-full border border-[#e0e0e0]">已停用</span>
                </div>
              )}
              {/* Order badge */}
              <span className="absolute top-2 left-2 w-6 h-6 bg-black/60 text-white text-[11px] rounded-full flex items-center justify-center">
                {idx + 1}
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Reorder */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => moveUp(idx)} disabled={idx === 0}
                  className="text-[#ccc] hover:text-black disabled:opacity-20 transition-colors leading-none text-[10px]">▲</button>
                <button onClick={() => moveDown(idx)} disabled={idx === banners.length - 1}
                  className="text-[#ccc] hover:text-black disabled:opacity-20 transition-colors leading-none text-[10px]">▼</button>
              </div>

              <GripVertical size={14} className="text-[#ddd] shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{b.title || "（無標題）"}</p>
                <p className="text-xs text-[#aaa] truncate mt-0.5">{b.link || "—"}</p>
              </div>

              {/* Toggle active */}
              <button onClick={() => toggleActive(b.id)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors shrink-0 ${
                  b.active ? "bg-black text-white border-black" : "bg-white text-[#999] border-[#e0e0e0] hover:border-black"
                }`}>
                {b.active ? "啟用中" : "停用"}
              </button>

              <button onClick={() => openEdit(b)} className="text-xs text-[#999] hover:text-black transition-colors shrink-0">
                編輯
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Drawer */}
      {drawer && (
        <Drawer onClose={close}>
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f0f0] shrink-0">
            <h2 className="text-base font-medium">{drawer === "add" ? "新增廣告圖" : "編輯廣告圖"}</h2>
            <button onClick={close} className="text-[#bbb] hover:text-black transition-colors"><X size={18} /></button>
          </div>

          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Image upload */}
            <div>
              <p className="text-xs text-[#999] mb-1.5">廣告圖片<span className="ml-1 text-[#ccc]">建議尺寸：1200 × 400 px（3:1）</span></p>
              <label className="block cursor-pointer group">
                <input type="file" accept="image/*" className="hidden" onChange={handleImgChange} />
                <div className="w-full aspect-[3/1] rounded-xl border-2 border-dashed border-[#e8e8e8] group-hover:border-black transition-colors overflow-hidden flex items-center justify-center bg-[#fafaf9]">
                  {form.img ? (
                    <img src={form.img} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={20} className="text-[#ccc]" />
                      <p className="text-xs text-[#bbb]">點擊上傳圖片</p>
                    </div>
                  )}
                </div>
              </label>
              {form.img && (
                <button onClick={() => setForm(f => ({ ...f, img: "" }))}
                  className="mt-1.5 text-[11px] text-[#bbb] hover:text-red-400 transition-colors">
                  移除圖片
                </button>
              )}
            </div>

            <div>
              <label className="text-xs text-[#999] mb-1.5 block">標題（選填）</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="廣告標題…" className={inputCls} />
            </div>

            <div>
              <label className="text-xs text-[#999] mb-1.5 block">點擊連結（選填）</label>
              <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                placeholder="/m/courses" className={inputCls} />
            </div>

            <div>
              <label className="text-xs text-[#999] mb-1.5 block">狀態</label>
              <div className="flex gap-2">
                {([true, false] as const).map(v => (
                  <button key={String(v)} onClick={() => setForm(f => ({ ...f, active: v }))}
                    className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${
                      form.active === v ? "bg-black text-white border-black" : "bg-white text-[#666] border-[#f0f0f0] hover:border-black"
                    }`}>
                    {v ? "啟用" : "停用"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`px-6 py-4 border-t border-[#f0f0f0] flex gap-2 ${drawer === "edit" ? "justify-between" : "justify-end"}`}>
            {drawer === "edit" && editing && (
              <button onClick={() => deleteBanner(editing.id)}
                className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors px-3 py-2">
                <Trash2 size={14} />刪除
              </button>
            )}
            <div className="flex gap-2">
              <button onClick={close} className="px-4 py-2 text-sm border border-[#f0f0f0] rounded-xl hover:border-black transition-colors">
                取消
              </button>
              <button onClick={drawer === "add" ? saveAdd : saveEdit} disabled={!form.img || saving}
                className="px-5 py-2 text-sm bg-black text-white rounded-xl hover:bg-[#222] disabled:opacity-40 transition-colors">
                {saving ? "儲存中…" : drawer === "add" ? "新增" : "儲存"}
              </button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  )
}
