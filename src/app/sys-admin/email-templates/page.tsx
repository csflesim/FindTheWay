'use client'

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight } from "lucide-react"
import { loadStoredTemplates, saveStoredTemplates, DEFAULT_STORED_TEMPLATES, type StoredTemplate } from "@/lib/templateStore"

const DEFAULT_EMAIL_HTML = `<p>親愛的 {{name}} 您好，</p>
<p>{{message}}</p>
<p>如有任何問題，請聯繫工作室。</p>
<p>忙碌不迷路藝術工作坊 敬上</p>`

const DEFAULT_LINE_TEXT = `您好 {{name}}！
{{message}}
如有疑問請聯絡我們。`

const EMPTY: Omit<StoredTemplate, "id"> = {
  name: "", emailOn: true, lineOn: false,
  emailSubject: "", emailHtml: DEFAULT_EMAIL_HTML, lineText: DEFAULT_LINE_TEXT,
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<StoredTemplate[]>(DEFAULT_STORED_TEMPLATES)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<StoredTemplate | null>(null)
  const [form, setForm] = useState<Omit<StoredTemplate, "id">>(EMPTY)
  const [activeTab, setActiveTab] = useState<"email" | "line">("email")

  useEffect(() => { const s = loadStoredTemplates(); if (s.length) setTemplates(s) }, [])

  function persist(next: StoredTemplate[]) { setTemplates(next); saveStoredTemplates(next) }

  function openNew() { setEditing(null); setForm({ ...EMPTY }); setActiveTab("email"); setDrawerOpen(true) }
  function openEdit(t: StoredTemplate) {
    setEditing(t)
    setForm({ name: t.name, emailOn: t.emailOn, lineOn: t.lineOn, emailSubject: t.emailSubject ?? "", emailHtml: t.emailHtml ?? DEFAULT_EMAIL_HTML, lineText: t.lineText ?? DEFAULT_LINE_TEXT })
    setActiveTab("email"); setDrawerOpen(true)
  }
  function save() {
    if (!form.name.trim()) return
    if (editing) persist(templates.map(t => t.id === editing.id ? { ...t, ...form } : t))
    else persist([...templates, { id: `tpl_${Date.now()}`, ...form }])
    setDrawerOpen(false)
  }
  function remove(id: string) { persist(templates.filter(t => t.id !== id)) }
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }))

  const inputCls = "w-full px-3 py-2.5 text-sm border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors"

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Notifications / Templates</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">訊息模板管理</h1>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-1.5 bg-black text-white text-sm px-4 py-2 rounded-lg hover:bg-[#222] transition-colors">
          <Plus size={14} />新增模板
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {templates.map(t => (
          <div key={t.id} className="bg-white rounded-xl border border-[#f0f0f0] px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <p className="text-sm font-medium">{t.name}</p>
                  {t.emailOn && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">✉ Email</span>}
                  {t.lineOn  && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600">🟢 LINE</span>}
                </div>
                {t.emailOn && t.emailSubject && <p className="text-[11px] text-[#aaa]">主旨：{t.emailSubject}</p>}
                {t.lineOn  && t.lineText     && <p className="text-[11px] text-[#aaa] line-clamp-1 mt-0.5">LINE：{t.lineText.slice(0, 60)}…</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openEdit(t)} className="text-[#aaa] hover:text-black transition-colors"><Pencil size={15} /></button>
                <button onClick={() => remove(t.id)} className="text-[#aaa] hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="text-center py-16 text-sm text-[#ccc]">尚無模板，點上方「新增」開始建立</div>
        )}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-full max-w-lg bg-white h-full flex flex-col shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] sticky top-0 bg-white z-10">
              <h2 className="text-sm font-medium">{editing ? "編輯模板" : "新增模板"}</h2>
              <button onClick={() => setDrawerOpen(false)} className="text-[#aaa] hover:text-black"><X size={18} /></button>
            </div>

            <div className="flex-1 px-5 py-5 flex flex-col gap-5">
              <div>
                <label className="text-xs text-[#aaa] mb-1.5 block">模板名稱</label>
                <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="例：報名成功通知" className={inputCls} />
              </div>

              <div>
                <label className="text-xs text-[#aaa] mb-2 block">啟用通道</label>
                <div className="flex gap-5">
                  <label className="flex items-center gap-2 text-sm cursor-pointer" onClick={() => set("emailOn", !form.emailOn)}>
                    {form.emailOn ? <ToggleRight size={22} className="text-blue-600" /> : <ToggleLeft size={22} className="text-[#ccc]" />}Email
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer" onClick={() => set("lineOn", !form.lineOn)}>
                    {form.lineOn ? <ToggleRight size={22} className="text-[#06C755]" /> : <ToggleLeft size={22} className="text-[#ccc]" />}LINE
                  </label>
                </div>
              </div>

              <div className="flex gap-2 border-b border-[#f0f0f0]">
                {(["email", "line"] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`pb-2 px-1 text-sm border-b-2 transition-colors ${activeTab === tab ? "border-black text-black font-medium" : "border-transparent text-[#aaa] hover:text-black"}`}>
                    {tab === "email" ? "Email 內容" : "LINE 內容"}
                  </button>
                ))}
              </div>

              {activeTab === "email" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs text-[#aaa] mb-1.5 block">主旨</label>
                    <input value={form.emailSubject ?? ""} onChange={e => set("emailSubject", e.target.value)} placeholder="例：【忙碌不迷路】課前提醒" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-[#aaa] mb-1.5 flex items-center justify-between">
                      <span>HTML 內容</span>
                      <span className="text-[10px] text-[#bbb]">支援 {"{{name}}"} {"{{message}}"} 等變數</span>
                    </label>
                    <textarea value={form.emailHtml ?? ""} onChange={e => set("emailHtml", e.target.value)} rows={10} className={`${inputCls} resize-y`} />
                  </div>
                </div>
              )}

              {activeTab === "line" && (
                <div>
                  <label className="text-xs text-[#aaa] mb-1.5 flex items-center justify-between">
                    <span>訊息文字</span>
                    <span className="text-[10px] text-[#bbb]">支援 {"{{name}}"} {"{{message}}"} 等變數</span>
                  </label>
                  <textarea value={form.lineText ?? ""} onChange={e => set("lineText", e.target.value)} rows={8} className={`${inputCls} resize-none`} />
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-[#f0f0f0] sticky bottom-0 bg-white flex gap-2">
              <button onClick={() => setDrawerOpen(false)}
                className="flex-1 border border-[#f0f0f0] text-sm py-2.5 rounded-lg hover:bg-[#fafaf9] transition-colors">
                取消
              </button>
              <button onClick={save} disabled={!form.name.trim()}
                className="flex-1 bg-black text-white text-sm py-2.5 rounded-lg hover:bg-[#222] disabled:opacity-40 transition-colors">
                {editing ? "儲存變更" : "新增"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
