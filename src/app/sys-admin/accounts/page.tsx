'use client'

import { useState } from "react"
import { Search, Plus, X, Trash2, UserPlus } from "lucide-react"

type Student = { id: number; name: string; age: number }
type Account = {
  id: number
  name: string
  email: string
  phone: string
  lineUserId?: string
  password?: string
  students: Student[]
  joined: string
  status: "正常" | "停用"
}

const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 1, name: "鄭大德", email: "zheng@email.com", phone: "0912-345-678", joined: "2024/09", status: "正常",
    students: [
      { id: 1, name: "鄭小德", age: 10 },
      { id: 2, name: "鄭小明", age: 8  },
    ],
  },
  {
    id: 2, name: "賴大紫", email: "lai@email.com", phone: "0923-456-789", joined: "2024/10", status: "正常",
    students: [
      { id: 3, name: "賴小柏", age: 7 },
      { id: 4, name: "賴小紫", age: 6 },
    ],
  },
]

const EMPTY_FORM: Omit<Account, "id" | "joined"> = {
  name: "", email: "", phone: "", lineUserId: "", password: "", status: "正常", students: [],
}

function Drawer({
  title, onClose, children,
}: { title: string; onClose: () => void; children: React.ReactNode }) {
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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS)
  const [drawer, setDrawer]     = useState<"add" | "edit" | null>(null)
  const [editing, setEditing]   = useState<Account | null>(null)
  const [form, setForm]         = useState<Omit<Account, "id" | "joined">>(EMPTY_FORM)
  const [newStudent, setNewStudent] = useState({ name: "", age: "" })
  const [nextId, setNextId]     = useState(10)

  function openAdd() {
    setForm(EMPTY_FORM)
    setDrawer("add")
  }

  function openEdit(a: Account) {
    setEditing(a)
    setForm({ name: a.name, email: a.email, phone: a.phone, lineUserId: a.lineUserId ?? "", password: "", status: a.status, students: [...a.students] })
    setDrawer("edit")
  }

  function close() { setDrawer(null); setEditing(null); setNewStudent({ name: "", age: "" }) }

  function addStudent() {
    if (!newStudent.name.trim()) return
    const s: Student = { id: nextId, name: newStudent.name.trim(), age: parseInt(newStudent.age) || 0 }
    setForm(f => ({ ...f, students: [...f.students, s] }))
    setNextId(n => n + 1)
    setNewStudent({ name: "", age: "" })
  }

  function removeStudent(id: number) {
    setForm(f => ({ ...f, students: f.students.filter(s => s.id !== id) }))
  }

  function saveAdd() {
    const today = new Date()
    const joined = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}`
    const newAcc: Account = { id: nextId, ...form, joined }
    setAccounts(prev => [...prev, newAcc])
    setNextId(n => n + 1)
    close()
  }

  function saveEdit() {
    if (!editing) return
    setAccounts(prev => prev.map(a => a.id === editing.id ? { ...a, ...form } : a))
    close()
  }

  function deleteAccount(id: number) {
    setAccounts(prev => prev.filter(a => a.id !== id))
    close()
  }

  const isDrawerOpen = drawer !== null

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Accounts</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">帳號管理</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-black text-white text-sm px-3 md:px-4 py-2 rounded-lg hover:bg-[#222] transition-colors"
        >
          <Plus size={15} /><span className="hidden sm:inline">新增帳號</span><span className="sm:hidden">新增</span>
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
        <input placeholder="搜尋帳號名稱 / Email…"
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black" />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
        <div className="grid grid-cols-[1.5fr_2fr_1.4fr_1.8fr_0.8fr_0.7fr_auto] gap-4 px-5 py-3 border-b border-[#f5f5f5] text-[11px] text-[#aaa] uppercase tracking-widest">
          <span>帳號</span><span>Email</span><span>電話</span><span>學生</span><span>加入</span><span>狀態</span><span></span>
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {accounts.map((a) => (
            <div key={a.id} className="grid grid-cols-[1.5fr_2fr_1.4fr_1.8fr_0.8fr_0.7fr_auto] gap-4 items-center px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-[11px] text-[#999] font-medium">
                  {a.name.slice(0, 1)}
                </div>
                <p className="text-sm font-medium truncate">{a.name}</p>
              </div>
              <p className="text-xs text-[#666] truncate">{a.email}</p>
              <p className="text-xs text-[#999]">{a.phone}</p>
              <div className="flex flex-wrap gap-1">
                {a.students.map((s) => (
                  <span key={s.id} className="text-[10px] bg-[#f5f5f5] text-[#666] px-1.5 py-0.5 rounded">{s.name}</span>
                ))}
              </div>
              <p className="text-xs text-[#999]">{a.joined}</p>
              <span className={`text-[11px] px-2.5 py-1 rounded-full w-fit ${
                a.status === "正常" ? "bg-black text-white" : "bg-[#f5f5f5] text-[#999]"
              }`}>{a.status}</span>
              <button onClick={() => openEdit(a)} className="text-xs text-[#999] hover:text-black">編輯</button>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {accounts.map((a) => (
          <div key={a.id} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-sm text-[#999] font-medium">
                  {a.name.slice(0, 1)}
                </div>
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-[#aaa]">{a.email}</p>
                </div>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full shrink-0 ${
                a.status === "正常" ? "bg-black text-white" : "bg-[#f5f5f5] text-[#999]"
              }`}>{a.status}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {a.students.map((s) => (
                <span key={s.id} className="text-[10px] bg-[#f5f5f5] text-[#666] px-1.5 py-0.5 rounded">{s.name}</span>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-[10px] text-[#aaa]">{a.phone} · 加入 {a.joined}</p>
              <button onClick={() => openEdit(a)} className="text-xs text-[#999] hover:text-black">編輯</button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Drawer ── */}
      {isDrawerOpen && (
        <Drawer
          title={drawer === "add" ? "新增帳號" : "編輯帳號"}
          onClose={close}
        >
          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Account info */}
            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-[#aaa] uppercase tracking-widest">帳號資料</p>

              <Field label="姓名">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="帳號持有人姓名" className={inputCls} />
              </Field>

              <Field label="Email">
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@example.com" className={inputCls} />
              </Field>

              <Field label="電話">
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="09xx-xxx-xxx" className={inputCls} />
              </Field>

              <Field label="LINE User ID">
                <div className="w-full px-3 py-2.5 text-sm bg-[#f5f5f5] border border-[#f0f0f0] rounded-xl text-[#999] select-all">
                  {form.lineUserId ? form.lineUserId : <span className="text-[#ccc]">尚未綁定</span>}
                </div>
              </Field>

              <Field label={drawer === "add" ? "密碼" : "重設密碼（留空則不變更）"}>
                <input type="password" value={form.password ?? ""} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••" className={inputCls} />
              </Field>

              <Field label="狀態">
                <div className="flex gap-2">
                  {(["正常", "停用"] as const).map(s => (
                    <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))}
                      className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${
                        form.status === s ? "bg-black text-white border-black" : "bg-white text-[#666] border-[#f0f0f0] hover:border-black"
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="border-t border-[#f5f5f5]" />

            {/* Students */}
            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-[#aaa] uppercase tracking-widest">名下學生</p>

              {form.students.length === 0 && (
                <p className="text-sm text-[#bbb]">尚未新增學生</p>
              )}

              <div className="flex flex-col gap-2">
                {form.students.map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-[#fafaf9] rounded-xl px-4 py-3 border border-[#f0f0f0]">
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-[#aaa] mt-0.5">{s.age} 歲</p>
                    </div>
                    <button onClick={() => removeStudent(s.id)} className="text-[#ccc] hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add student inline */}
              <div className="bg-[#fafaf9] rounded-xl border border-[#f0f0f0] p-3 flex flex-col gap-2">
                <p className="text-[11px] text-[#bbb]">新增學生</p>
                <div className="flex gap-2">
                  <input
                    value={newStudent.name}
                    onChange={e => setNewStudent(p => ({ ...p, name: e.target.value }))}
                    placeholder="姓名"
                    className="flex-1 px-3 py-2 text-sm bg-white border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors"
                    onKeyDown={e => e.key === "Enter" && addStudent()}
                  />
                  <input
                    value={newStudent.age}
                    onChange={e => setNewStudent(p => ({ ...p, age: e.target.value }))}
                    placeholder="年齡"
                    type="number"
                    className="w-16 px-3 py-2 text-sm bg-white border border-[#f0f0f0] rounded-lg outline-none focus:border-black transition-colors"
                    onKeyDown={e => e.key === "Enter" && addStudent()}
                  />
                  <button onClick={addStudent}
                    className="px-3 py-2 bg-black text-white rounded-lg hover:bg-[#222] transition-colors">
                    <UserPlus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className={`px-6 py-4 border-t border-[#f0f0f0] flex gap-2 ${drawer === "edit" ? "justify-between" : "justify-end"}`}>
            {drawer === "edit" && editing && (
              <button
                onClick={() => deleteAccount(editing.id)}
                className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors px-3 py-2"
              >
                <Trash2 size={14} />刪除帳號
              </button>
            )}
            <div className="flex gap-2">
              <button onClick={close} className="px-4 py-2 text-sm border border-[#f0f0f0] rounded-xl hover:border-black transition-colors">
                取消
              </button>
              <button
                onClick={drawer === "add" ? saveAdd : saveEdit}
                className="px-5 py-2 text-sm bg-black text-white rounded-xl hover:bg-[#222] transition-colors"
              >
                {drawer === "add" ? "建立帳號" : "儲存"}
              </button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  )
}
