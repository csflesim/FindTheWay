'use client'

import { useEffect, useMemo, useState } from "react"
import { ChevronRight, Eye, EyeOff, Upload } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useTeacher } from "../_lib/useTeacher"
import { fetchTeacherCourses, occurrencesInRange } from "../_lib/teacherData"

type HistoryEntry = { id: string; course: string; date: string; present: number; total: number }

const inputCls = "w-full px-4 py-3 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-3">{title}</p>
      <div className="bg-white rounded-xl divide-y divide-[#f5f5f5] border border-[#f0f0f0]">
        {children}
      </div>
    </div>
  )
}

export default function TeacherProfilePage() {
  const supabase = useMemo(() => createClient(), [])
  const { teacher, loading } = useTeacher()
  const [stats, setStats] = useState({ monthly: 0, courseCount: 0, rate: 100 })
  const [history, setHistory] = useState<HistoryEntry[]>([])

  // 顯示用（編輯後即時更新）
  const [display, setDisplay] = useState({ name: "", specialty: "", photoUrl: null as string | null })

  // 個人資料編輯
  const [editingInfo, setEditingInfo] = useState(false)
  const [form, setForm] = useState({ name: "", specialty: "", phone: "", bio: "", photo: "" })
  const [busy, setBusy] = useState(false)

  // 改密碼
  const [editingPwd, setEditingPwd] = useState(false)
  const [oldPwd, setOldPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    if (!teacher) return
    setDisplay({ name: teacher.name, specialty: teacher.specialty, photoUrl: teacher.photoUrl })
    setForm({ name: teacher.name, specialty: teacher.specialty, phone: teacher.phone, bio: teacher.bio, photo: teacher.photoUrl ?? "" })
    ;(async () => {
      const courses = await fetchTeacherCourses(supabase, teacher.id)
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const monthly = occurrencesInRange(courses, monthStart, monthEnd).length

      const courseIds = courses.map(c => c.id)
      let entries: HistoryEntry[] = []
      let rate = 100
      if (courseIds.length > 0) {
        const { data } = await supabase
          .from("course_attendance")
          .select("id, date, records, course:courses(title)")
          .in("course_id", courseIds)
          .order("date", { ascending: false })
          .limit(20)
        const rows = (data ?? []) as unknown as {
          id: string; date: string; records: { status: string }[]
          course: { title: string } | null
        }[]
        entries = rows.map(r => ({
          id: r.id,
          course: r.course?.title ?? "—",
          date: r.date,
          present: (r.records ?? []).filter(x => x.status === "出席").length,
          total: (r.records ?? []).length,
        }))
        const allRecords = rows.flatMap(r => r.records ?? [])
        if (allRecords.length > 0) {
          rate = Math.round(allRecords.filter(x => x.status === "出席").length / allRecords.length * 100)
        }
      }
      setStats({ monthly, courseCount: courses.length, rate })
      setHistory(entries)
    })()
  }, [teacher, supabase])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setForm(f => ({ ...f, photo: reader.result as string }))
    reader.readAsDataURL(file)
  }

  async function saveInfo() {
    if (busy || !form.name.trim()) return
    setBusy(true)
    const res = await fetch("/api/teacher/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        specialty: form.specialty.trim(),
        phone: form.phone.trim(),
        bio: form.bio.trim(),
        photoDataUrl: form.photo.startsWith("data:") ? form.photo : undefined,
      }),
    })
    const d = await res.json()
    setBusy(false)
    if (!res.ok || !d.ok) { alert(`儲存失敗：${d.error ?? res.status}`); return }
    setDisplay({ name: form.name.trim(), specialty: form.specialty.trim(), photoUrl: d.photoUrl ?? display.photoUrl })
    if (d.photoUrl) setForm(f => ({ ...f, photo: d.photoUrl }))
    setEditingInfo(false)
  }

  async function savePassword() {
    if (busy || !teacher) return
    setBusy(true)
    const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: teacher.email, password: oldPwd })
    if (verifyErr) { setBusy(false); alert("舊密碼錯誤"); return }
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setBusy(false)
    if (error) { alert(`更新失敗：${error.message}`); return }
    alert("密碼已更新")
    setEditingPwd(false); setOldPwd(""); setNewPwd("")
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = "/m/teacher/login"
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-[#ccc] text-sm">載入中…</div>
  }
  if (!teacher) return null

  return (
    <div>
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-[#ebebeb] px-5 py-4 z-10">
        <p className="text-[10px] text-[#aaa] uppercase tracking-widest">Teacher</p>
        <h1 className="text-sm font-medium">我的</h1>
      </header>

      {/* Profile card */}
      <div className="mx-4 mt-4 bg-black text-white rounded-2xl p-5">
        <div className="flex items-center gap-3">
          {display.photoUrl
            ? <img src={display.photoUrl} alt="頭貼" className="w-12 h-12 rounded-full shrink-0 object-cover" />
            : <div className="w-12 h-12 rounded-full shrink-0 bg-white/20 flex items-center justify-center text-base">{display.name.slice(0, 1)}</div>
          }
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-widest">Instructor</p>
            <p className="text-sm font-medium mt-0.5">{display.name}</p>
            <p className="text-xs text-white/50">{teacher.isLineAccount ? "（LINE 帳號）" : teacher.email}</p>
          </div>
        </div>
        <div className="flex gap-6 mt-4 pt-4 border-t border-white/10">
          <div>
            <p className="text-2xl font-light">{stats.monthly}</p>
            <p className="text-[10px] text-white/50 mt-0.5">本月課堂</p>
          </div>
          <div>
            <p className="text-2xl font-light">{stats.courseCount}</p>
            <p className="text-[10px] text-white/50 mt-0.5">課程種類</p>
          </div>
          <div>
            <p className="text-2xl font-light">{stats.rate}%</p>
            <p className="text-[10px] text-white/50 mt-0.5">平均出席率</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-5 flex flex-col gap-5">

        {/* 個人資料 */}
        <Section title="個人資料">
          {editingInfo ? (
            <div className="px-4 py-4 flex flex-col gap-3">
              {/* 頭貼 */}
              <div>
                <p className="text-xs text-[#aaa] mb-1.5">頭貼</p>
                <label className="block cursor-pointer group w-16">
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#e8e8e8] group-hover:border-black transition-colors overflow-hidden flex items-center justify-center bg-[#fafaf9]">
                    {form.photo ? (
                      <img src={form.photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Upload size={14} className="text-[#ccc]" />
                    )}
                  </div>
                </label>
              </div>
              <div>
                <label className="text-xs text-[#aaa] mb-1 block">姓名</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-[#aaa] mb-1 block">專長</label>
                <input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                  placeholder="水彩・油畫…" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-[#aaa] mb-1 block">電話</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="09xx-xxx-xxx" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-[#aaa] mb-1 block">簡介</label>
                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  rows={3} placeholder="教學理念、經歷…"
                  className={`${inputCls} resize-none`} />
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => { setEditingInfo(false); setForm({ name: teacher.name, specialty: teacher.specialty, phone: teacher.phone, bio: teacher.bio, photo: display.photoUrl ?? "" }) }}
                  className="flex-1 py-2.5 text-sm border border-[#f0f0f0] rounded-xl"
                >
                  取消
                </button>
                <button
                  onClick={saveInfo}
                  disabled={busy || !form.name.trim()}
                  className="flex-1 py-2.5 text-sm bg-black text-white rounded-xl disabled:opacity-40"
                >
                  {busy ? "儲存中…" : "儲存"}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setEditingInfo(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left">
              <span className="text-sm">編輯個人資料</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#aaa]">{display.specialty || "—"}</span>
                <ChevronRight size={16} className="text-[#ccc]" />
              </div>
            </button>
          )}
        </Section>

        {/* 安全性 */}
        <Section title="安全性">
          {teacher.isLineAccount ? (
            <div className="px-4 py-3.5">
              <p className="text-sm">密碼</p>
              <p className="text-xs text-[#aaa] mt-0.5">此帳號透過 LINE 登入，無需密碼</p>
            </div>
          ) : editingPwd ? (
            <div className="px-4 py-4 flex flex-col gap-2">
              <label className="text-xs text-[#aaa]">舊密碼</label>
              <div className="relative">
                <input type={showOld ? "text" : "password"} value={oldPwd}
                  onChange={e => setOldPwd(e.target.value)} placeholder="輸入舊密碼"
                  className={inputCls + " pr-10"} />
                <button onClick={() => setShowOld(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa]">
                  {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <label className="text-xs text-[#aaa] mt-1">新密碼</label>
              <div className="relative">
                <input type={showNew ? "text" : "password"} value={newPwd}
                  onChange={e => setNewPwd(e.target.value)} placeholder="輸入新密碼（至少8位）"
                  className={inputCls + " pr-10"} />
                <button onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa]">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex gap-2 mt-1">
                <button onClick={() => { setEditingPwd(false); setOldPwd(""); setNewPwd("") }}
                  className="flex-1 py-2.5 text-sm border border-[#f0f0f0] rounded-xl">
                  取消
                </button>
                <button disabled={busy || !oldPwd || newPwd.length < 8} onClick={savePassword}
                  className="flex-1 py-2.5 text-sm bg-black text-white rounded-xl disabled:opacity-40">
                  {busy ? "更新中…" : "更新密碼"}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setEditingPwd(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left">
              <span className="text-sm">修改密碼</span>
              <ChevronRight size={16} className="text-[#ccc]" />
            </button>
          )}
        </Section>

        {/* History */}
        <div>
          <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-3">點名紀錄</p>
          {history.length === 0 ? (
            <p className="text-sm text-[#ccc] py-4">尚無點名紀錄</p>
          ) : (
            <div className="bg-white rounded-xl divide-y divide-[#f5f5f5] border border-[#f0f0f0]">
              {history.map((record) => {
                const rate = record.total > 0 ? Math.round((record.present / record.total) * 100) : 0
                return (
                  <div key={record.id} className="flex items-center justify-between px-4 py-3.5">
                    <div>
                      <p className="text-sm font-medium">{record.course}</p>
                      <p className="text-xs text-[#999] mt-0.5">{record.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{record.present} / {record.total}</p>
                      <p className="text-[10px] text-[#999]">出席 {rate}%</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          className="w-full py-3 text-sm text-red-500 bg-white border border-[#f0f0f0] rounded-xl">
          登出
        </button>
      </div>

      <div className="h-6" />
    </div>
  )
}
