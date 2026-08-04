'use client'

import { useState, useMemo, useRef, useEffect } from "react"
import { Search, Plus, X, ChevronUp, ChevronDown, Trash2, Upload, Eye, EyeOff, GripVertical } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { uploadImage } from "@/lib/upload"
import { fetchOnlineCourses, ONLINE_CATEGORIES, type OnlineCourseData, type OnlineSection } from "@/lib/onlineCoursesDb"

type CourseType = "免費課程" | "系列課"

let sectionSeq = 0
const newSectionId = () => `new_${Date.now()}_${++sectionSeq}`

type FormState = Omit<OnlineCourseData, "id">

const EMPTY_FORM: FormState = {
  title: "", subtitle: "", desc: "",
  type: "免費課程", price: 0, rating: 0, sort: 10,
  publishDate: "", published: true, coverUrl: "",
  recommendedIds: [], categories: [], sections: [],
}

const typeStyle: Record<CourseType, string> = {
  "免費課程": "bg-[#e8f5e9] text-[#2e7d32]",
  "系列課":   "bg-[#e8eaf6] text-[#3949ab]",
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-[#999] mb-1.5 block">
        {required && <span className="text-red-400 mr-0.5">*</span>}{label}
      </label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, className }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; className?: string
}) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors ${className ?? ""}`} />
  )
}

export default function OnlineCoursesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [courses, setCourses] = useState<OnlineCourseData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState("")
  const [filterType, setFilterType] = useState<CourseType | "全部">("全部")
  const [drawerMode, setDrawerMode] = useState<"add" | "edit" | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchOnlineCourses(supabase).then(list => { setCourses(list); setLoading(false) })
  }, [supabase])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return courses.filter(c => {
      const matchQ = !q || c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q)
      const matchT = filterType === "全部" || c.type === filterType
      return matchQ && matchT
    })
  }, [courses, query, filterType])

  function openAdd() {
    setForm({ ...EMPTY_FORM, sort: Math.max(...courses.map(c => c.sort), 0) + 10 })
    setEditId(null)
    setDrawerMode("add")
  }

  function openEdit(c: OnlineCourseData) {
    setForm({
      title: c.title, subtitle: c.subtitle, desc: c.desc,
      type: c.type, price: c.price, rating: c.rating, sort: c.sort,
      publishDate: c.publishDate, published: c.published, coverUrl: c.coverUrl,
      recommendedIds: [...c.recommendedIds],
      categories: [...c.categories],
      sections: c.sections.map(s => ({ ...s })),
    })
    setEditId(c.id)
    setDrawerMode("edit")
  }

  async function saveDrawer() {
    if (!form.title.trim() || saving) return
    setSaving(true)
    try {
      const coverUrl = await uploadImage(supabase, form.coverUrl, "online-courses")
      const row = {
        title: form.title.trim(),
        subtitle: form.subtitle || null,
        description: form.desc || null,
        type: form.type,
        price: form.price,
        rating: form.rating,
        sort_order: form.sort,
        publish_date: form.publishDate || null,
        published: form.published,
        cover_url: coverUrl || null,
        recommended_ids: form.recommendedIds,
        categories: form.categories,
      }

      let courseId = editId
      if (drawerMode === "add") {
        const { data, error } = await supabase.from("online_courses").insert(row).select("id").single()
        if (error) throw new Error(error.message)
        courseId = data.id
      } else if (courseId) {
        const { error } = await supabase.from("online_courses").update(row).eq("id", courseId)
        if (error) throw new Error(error.message)
      }
      if (!courseId) throw new Error("儲存失敗")

      // 小節整批重建（順序 = 目前排序）
      await supabase.from("online_sections").delete().eq("course_id", courseId)
      const sorted = [...form.sections].sort((a, b) => a.sort - b.sort)
      if (sorted.length > 0) {
        const { error } = await supabase.from("online_sections").insert(sorted.map((s, i) => ({
          course_id: courseId,
          title: s.title || `第 ${i + 1} 節`,
          video_url: s.videoUrl,
          label: s.label || null,
          free_preview: s.freePreview,
          sort_order: i + 1,
        })))
        if (error) throw new Error(error.message)
      }

      const fresh = await fetchOnlineCourses(supabase)
      setCourses(fresh)
      setDrawerMode(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : "儲存失敗")
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (deleteId === null) return
    const { error } = await supabase.from("online_courses").delete().eq("id", deleteId)
    if (error) { alert(`刪除失敗：${error.message}`); return }
    setCourses(list => list.filter(c => c.id !== deleteId))
    setDeleteId(null)
  }

  function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setForm(f => ({ ...f, coverUrl: ev.target?.result as string }))
    reader.readAsDataURL(file)
  }

  // Section helpers
  function addSection() {
    const maxSort = form.sections.length > 0 ? Math.max(...form.sections.map(s => s.sort)) : 0
    setForm(f => ({
      ...f,
      sections: [...f.sections, { id: newSectionId(), title: "", videoUrl: "", label: "視頻課程", sort: maxSort + 1, freePreview: false }],
    }))
  }

  function updateSection(id: string, patch: Partial<OnlineSection>) {
    setForm(f => ({ ...f, sections: f.sections.map(s => s.id === id ? { ...s, ...patch } : s) }))
  }

  function removeSection(id: string) {
    setForm(f => ({ ...f, sections: f.sections.filter(s => s.id !== id) }))
  }

  function moveSection(id: string, dir: -1 | 1) {
    setForm(f => {
      const arr = [...f.sections].sort((a, b) => a.sort - b.sort)
      const idx = arr.findIndex(s => s.id === id)
      const swapIdx = idx + dir
      if (swapIdx < 0 || swapIdx >= arr.length) return f
      const newArr = arr.map((s, i) => {
        if (i === idx) return { ...s, sort: arr[swapIdx].sort }
        if (i === swapIdx) return { ...s, sort: arr[idx].sort }
        return s
      })
      return { ...f, sections: newArr }
    })
  }

  function toggleRecommend(id: string) {
    setForm(f => ({
      ...f,
      recommendedIds: f.recommendedIds.includes(id)
        ? f.recommendedIds.filter(r => r !== id)
        : [...f.recommendedIds, id],
    }))
  }

  function toggleCategory(cat: string) {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter(c => c !== cat)
        : [...f.categories, cat],
    }))
  }

  const drawerTitle = drawerMode === "add" ? "新增線上課程" : "編輯線上課程"
  const otherCourses = courses.filter(c => c.id !== editId)
  const sortedSections = [...form.sections].sort((a, b) => a.sort - b.sort)

  return (
    <div className="p-4 md:p-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Online Courses</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">線上課程</h1>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-black text-white rounded-xl hover:bg-[#222] transition-colors">
          <Plus size={14} />新增課程
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="搜尋課程名稱…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors" />
        </div>
        <div className="flex gap-2">
          {(["全部", "免費課程", "系列課"] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-2 text-xs rounded-xl border transition-colors whitespace-nowrap ${
                filterType === t ? "bg-black text-white border-black" : "bg-white text-[#666] border-[#f0f0f0] hover:border-[#ccc]"
              }`}>{t}</button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
        <div className="grid grid-cols-[60px_1fr_100px_60px_80px_60px_80px_100px] gap-4 px-5 py-3 border-b border-[#f5f5f5] text-[11px] text-[#aaa] uppercase tracking-widest">
          <span>封面</span><span>課程名稱</span><span>類型</span><span>小節</span><span>價格</span><span>排序</span><span>發布</span><span>操作</span>
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {loading && <p className="px-5 py-8 text-sm text-[#ccc]">載入中…</p>}
          {!loading && filtered.length === 0 && <p className="px-5 py-8 text-sm text-[#ccc]">查無課程</p>}
          {filtered.map(c => (
            <div key={c.id} className="grid grid-cols-[60px_1fr_100px_60px_80px_60px_80px_100px] gap-4 items-center px-5 py-3.5">
              {/* Cover */}
              <div className="w-14 h-9 rounded-lg bg-[#f5f5f5] overflow-hidden shrink-0">
                {c.coverUrl
                  ? <img src={c.coverUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-[#ccc] text-[10px]">封面</div>
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.title}</p>
                <p className="text-xs text-[#999] truncate mt-0.5">{c.subtitle}</p>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full w-fit whitespace-nowrap ${typeStyle[c.type]}`}>{c.type}</span>
              <p className="text-sm text-[#666]">{c.sections.length}</p>
              <p className="text-sm">{c.price === 0 ? "免費" : `NT$ ${c.price.toLocaleString()}`}</p>
              <p className="text-sm text-[#666]">{c.sort}</p>
              <span className={`text-[11px] px-2.5 py-1 rounded-full w-fit whitespace-nowrap ${
                c.published ? "bg-[#e8f5e9] text-[#2e7d32]" : "bg-[#f5f5f5] text-[#aaa]"
              }`}>{c.published ? "已發布" : "未發布"}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(c)}
                  className="px-3 py-1.5 text-xs bg-black text-white rounded-lg hover:bg-[#333] transition-colors">編輯</button>
                <button onClick={() => setDeleteId(c.id)}
                  className="px-3 py-1.5 text-xs border border-red-200 text-red-400 rounded-lg hover:bg-red-50 transition-colors">刪除</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {loading && <p className="text-sm text-[#ccc] py-4">載入中…</p>}
        {!loading && filtered.length === 0 && <p className="text-sm text-[#ccc] py-4">查無課程</p>}
        {filtered.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-[#f0f0f0] p-4">
            <div className="flex gap-3 mb-3">
              <div className="w-16 h-10 rounded-lg bg-[#f5f5f5] overflow-hidden shrink-0">
                {c.coverUrl
                  ? <img src={c.coverUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-[#ccc] text-[10px]">封面</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug line-clamp-2">{c.title}</p>
                <p className="text-[11px] text-[#999] mt-0.5 truncate">{c.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${typeStyle[c.type]}`}>{c.type}</span>
              <span className="text-xs text-[#999]">{c.sections.length} 小節</span>
              <span className="text-xs text-[#999]">{c.price === 0 ? "免費" : `NT$ ${c.price.toLocaleString()}`}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ml-auto ${
                c.published ? "bg-[#e8f5e9] text-[#2e7d32]" : "bg-[#f5f5f5] text-[#aaa]"
              }`}>{c.published ? "已發布" : "未發布"}</span>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => openEdit(c)}
                className="flex-1 py-2 text-xs bg-black text-white rounded-xl hover:bg-[#333] transition-colors">編輯</button>
              <button onClick={() => setDeleteId(c.id)}
                className="flex-1 py-2 text-xs border border-red-200 text-red-400 rounded-xl hover:bg-red-50 transition-colors">刪除</button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Add / Edit Drawer ── */}
      {drawerMode && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerMode(null)} />
          <aside className="relative w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f0f0] shrink-0">
              <h2 className="text-base font-medium">{drawerTitle}</h2>
              <button onClick={() => setDrawerMode(null)} className="text-[#bbb] hover:text-black transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
              {/* Top row: fields + cover */}
              <div className="flex gap-6">
                <div className="flex-1 flex flex-col gap-4">
                  <Field label="課程名稱" required>
                    <Input value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="課程名稱" />
                  </Field>
                  <Field label="副標題">
                    <Input value={form.subtitle} onChange={v => setForm(f => ({ ...f, subtitle: v }))} placeholder="一句話描述課程" />
                  </Field>
                  <Field label="課程介紹">
                    <textarea value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
                      rows={4} placeholder="課程詳細介紹…"
                      className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors resize-none" />
                  </Field>
                </div>

                {/* Cover upload */}
                <div className="shrink-0">
                  <p className="text-xs text-[#999] mb-1.5">封面圖</p>
                  <button type="button" onClick={() => coverRef.current?.click()}
                    className="w-32 h-20 rounded-xl bg-[#fafaf9] border border-[#f0f0f0] hover:border-black transition-colors overflow-hidden flex items-center justify-center">
                    {form.coverUrl
                      ? <img src={form.coverUrl} alt="" className="w-full h-full object-cover" />
                      : <div className="flex flex-col items-center gap-1 text-[#ccc]">
                          <Upload size={16} /><span className="text-[10px]">上傳圖片</span>
                        </div>
                    }
                  </button>
                  <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCover} />
                  {form.coverUrl && (
                    <button onClick={() => setForm(f => ({ ...f, coverUrl: "" }))}
                      className="mt-1.5 text-[10px] text-[#aaa] hover:text-black w-full text-center transition-colors">移除</button>
                  )}
                </div>
              </div>

              {/* Row 2: type / price / rating / sort */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="類型" required>
                  <div className="flex gap-1.5">
                    {(["免費課程", "系列課"] as CourseType[]).map(t => (
                      <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                        className={`flex-1 py-2 text-xs rounded-xl border transition-colors ${
                          form.type === t ? "bg-black text-white border-black" : "bg-[#fafaf9] border-[#f0f0f0] text-[#666] hover:border-[#ccc]"
                        }`}>{t}</button>
                    ))}
                  </div>
                </Field>
                <Field label="價格（NT$）">
                  <input type="number" min="0" value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors" />
                </Field>
                <Field label="評分">
                  <input type="number" min="0" max="5" step="0.1" value={form.rating}
                    onChange={e => setForm(f => ({ ...f, rating: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors" />
                </Field>
                <Field label="排序">
                  <input type="number" value={form.sort}
                    onChange={e => setForm(f => ({ ...f, sort: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors" />
                </Field>
              </div>

              {/* Row 3: publish date + status */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="發布日期">
                  <input type="date" value={form.publishDate}
                    onChange={e => setForm(f => ({ ...f, publishDate: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm bg-[#fafaf9] border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors" />
                </Field>
                <Field label="發布狀態">
                  <div className="flex items-center gap-3 h-[42px]">
                    <span className="text-sm text-[#999]">{form.published ? "發布" : "隱藏"}</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, published: !f.published }))}
                      className={`relative w-10 rounded-full transition-colors ${form.published ? "bg-black" : "bg-[#e0e0e0]"}`}
                      style={{ height: 22 }}>
                      <span className={`absolute top-0.5 rounded-full bg-white shadow transition-transform ${form.published ? "translate-x-5" : "translate-x-0.5"}`}
                        style={{ width: 18, height: 18 }} />
                    </button>
                    {form.published
                      ? <Eye size={14} className="text-[#2e7d32]" />
                      : <EyeOff size={14} className="text-[#aaa]" />
                    }
                  </div>
                </Field>
              </div>

              {/* Categories */}
              <Field label="前台分類（可複選）">
                <div className="flex gap-2 flex-wrap">
                  {ONLINE_CATEGORIES.map(cat => (
                    <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                        form.categories.includes(cat)
                          ? "bg-black text-white border-black"
                          : "bg-white text-[#666] border-[#f0f0f0] hover:border-[#ccc]"
                      }`}>{cat}</button>
                  ))}
                </div>
              </Field>

              {/* Recommended courses */}
              {otherCourses.length > 0 && (
                <Field label="推薦課程">
                  <div className="flex flex-col gap-1.5">
                    {otherCourses.map(c => (
                      <label key={c.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#fafaf9] border border-[#f0f0f0] cursor-pointer hover:border-[#ccc] transition-colors">
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          form.recommendedIds.includes(c.id) ? "bg-black border-black" : "border-[#ddd]"
                        }`} onClick={() => toggleRecommend(c.id)}>
                          {form.recommendedIds.includes(c.id) && (
                            <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          )}
                        </span>
                        <span className="text-sm truncate">{c.title}</span>
                        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${typeStyle[c.type]}`}>{c.type}</span>
                      </label>
                    ))}
                  </div>
                </Field>
              )}

              {/* Sections */}
              <div>
                <p className="text-xs text-[#999] mb-2">課程小節</p>
                <div className="flex flex-col gap-2">
                  {sortedSections.map((s, idx) => (
                    <div key={s.id} className="flex items-center gap-2 bg-[#fafaf9] border border-[#f0f0f0] rounded-xl px-3 py-2.5">
                      {/* Reorder */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button type="button" onClick={() => moveSection(s.id, -1)} disabled={idx === 0}
                          className="text-[#ccc] hover:text-black disabled:opacity-30 transition-colors">
                          <ChevronUp size={13} />
                        </button>
                        <button type="button" onClick={() => moveSection(s.id, 1)} disabled={idx === sortedSections.length - 1}
                          className="text-[#ccc] hover:text-black disabled:opacity-30 transition-colors">
                          <ChevronDown size={13} />
                        </button>
                      </div>

                      <GripVertical size={14} className="text-[#ddd] shrink-0" />

                      {/* Title */}
                      <input value={s.title} onChange={e => updateSection(s.id, { title: e.target.value })}
                        placeholder="小節標題"
                        className="w-28 px-2 py-1.5 text-xs bg-white border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors shrink-0" />

                      {/* URL */}
                      <input value={s.videoUrl} onChange={e => updateSection(s.id, { videoUrl: e.target.value })}
                        placeholder="YouTube 影片網址"
                        className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-white border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors" />

                      {/* Label */}
                      <input value={s.label} onChange={e => updateSection(s.id, { label: e.target.value })}
                        placeholder="類型"
                        className="w-20 px-2 py-1.5 text-xs bg-white border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors shrink-0" />

                      {/* Free preview toggle */}
                      <label className="flex items-center gap-1.5 shrink-0 cursor-pointer">
                        <input type="checkbox" checked={s.freePreview} onChange={e => updateSection(s.id, { freePreview: e.target.checked })}
                          className="w-3.5 h-3.5 accent-black" />
                        <span className="text-[11px] text-[#666] whitespace-nowrap">免費可看</span>
                      </label>

                      {/* Delete */}
                      <button type="button" onClick={() => removeSection(s.id)}
                        className="text-[#ccc] hover:text-red-400 transition-colors shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={addSection}
                  className="mt-2 w-full py-2.5 text-xs text-[#999] border border-dashed border-[#e0e0e0] rounded-xl hover:border-black hover:text-black transition-colors">
                  + 新增小節
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#f0f0f0] flex gap-3 shrink-0">
              <button onClick={() => setDrawerMode(null)}
                className="flex-1 py-2.5 text-sm border border-[#f0f0f0] rounded-xl text-[#999] hover:border-[#ccc] hover:text-black transition-colors">
                取消
              </button>
              <button onClick={saveDrawer} disabled={saving}
                className="flex-1 py-2.5 text-sm bg-black text-white rounded-xl hover:bg-[#222] disabled:opacity-50 transition-colors">
                {saving ? "儲存中…" : "確認"}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-medium mb-2">刪除課程</h3>
            <p className="text-sm text-[#666] mb-5">
              確定刪除「{courses.find(c => c.id === deleteId)?.title}」？此操作無法復原。
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 text-sm border border-[#f0f0f0] rounded-xl text-[#999] hover:border-[#ccc] hover:text-black transition-colors">
                取消
              </button>
              <button onClick={confirmDelete}
                className="flex-1 py-2.5 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors">
                刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
