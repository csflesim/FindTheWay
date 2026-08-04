'use client'

import { useEffect, useMemo, useState } from "react"
import { ChevronRight, Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useTeacher } from "../_lib/useTeacher"
import { fetchTeacherCourses, occurrencesInRange } from "../_lib/teacherData"

type HistoryEntry = { id: string; course: string; date: string; present: number; total: number }

const NOTIFY_KEY = "ftw.teacher-notify.v1"
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

function Row({ label, value, onClick }: { label: string; value?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 text-left"
    >
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        {value && <span className="text-sm text-[#aaa] truncate max-w-[180px]">{value}</span>}
        <ChevronRight size={16} className="text-[#ccc] shrink-0" />
      </div>
    </button>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm">{label}</span>
      <button
        onClick={onChange}
        className={`w-10 h-6 rounded-full transition-colors relative ${value ? "bg-black" : "bg-[#ddd]"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${value ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </div>
  )
}

// 逐列展開編輯（與會員帳號設定同樣式）
function EditableRow({ label, value, placeholder, multiline, busy, onSave }: {
  label: string
  value: string
  placeholder?: string
  multiline?: boolean
  busy: boolean
  onSave: (v: string) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => { setDraft(value) }, [value])

  if (!editing) {
    return <Row label={label} value={value || "—"} onClick={() => setEditing(true)} />
  }
  return (
    <div className="px-4 py-3.5 flex flex-col gap-2">
      <label className="text-xs text-[#aaa]">{label}</label>
      {multiline ? (
        <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3}
          placeholder={placeholder} className={`${inputCls} resize-none`} autoFocus />
      ) : (
        <input value={draft} onChange={e => setDraft(e.target.value)}
          placeholder={placeholder} className={inputCls} autoFocus />
      )}
      <div className="flex gap-2 mt-1">
        <button onClick={() => { setEditing(false); setDraft(value) }}
          className="flex-1 py-2 text-sm border border-[#f0f0f0] rounded-xl">
          取消
        </button>
        <button
          onClick={async () => { const ok = await onSave(draft); if (ok) setEditing(false) }}
          disabled={busy}
          className="flex-1 py-2 text-sm bg-black text-white rounded-xl disabled:opacity-40"
        >
          {busy ? "儲存中…" : "儲存"}
        </button>
      </div>
    </div>
  )
}

export default function TeacherProfilePage() {
  const supabase = useMemo(() => createClient(), [])
  const { teacher, loading } = useTeacher()
  const [stats, setStats] = useState({ monthly: 0, courseCount: 0, rate: 100 })
  const [history, setHistory] = useState<HistoryEntry[]>([])

  // 個人資料（編輯後即時更新）
  const [info, setInfo] = useState({ name: "", specialty: "", phone: "", bio: "", photoUrl: null as string | null })
  const [busy, setBusy] = useState(false)

  // 改密碼
  const [editingPwd, setEditingPwd] = useState(false)
  const [oldPwd, setOldPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)

  // 通知設定
  const [notifyCourse, setNotifyCourse] = useState(true)
  const [notifySystem, setNotifySystem] = useState(true)
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  useEffect(() => {
    try {
      const s = localStorage.getItem(NOTIFY_KEY)
      if (s) {
        const p = JSON.parse(s)
        if (typeof p.course === "boolean") setNotifyCourse(p.course)
        if (typeof p.system === "boolean") setNotifySystem(p.system)
      }
    } catch {}
  }, [])

  function saveNotify(course: boolean, system: boolean) {
    try { localStorage.setItem(NOTIFY_KEY, JSON.stringify({ course, system })) } catch {}
  }

  useEffect(() => {
    if (!teacher) return
    setInfo({ name: teacher.name, specialty: teacher.specialty, phone: teacher.phone, bio: teacher.bio, photoUrl: teacher.photoUrl })
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

  async function saveField(patch: Partial<typeof info> & { photoDataUrl?: string }): Promise<boolean> {
    if (busy) return false
    setBusy(true)
    const next = { ...info, ...patch }
    const res = await fetch("/api/teacher/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: next.name.trim(),
        specialty: next.specialty.trim(),
        phone: next.phone.trim(),
        bio: next.bio.trim(),
        photoDataUrl: patch.photoDataUrl,
      }),
    })
    const d = await res.json()
    setBusy(false)
    if (!res.ok || !d.ok) { alert(`儲存失敗：${d.error ?? res.status}`); return false }
    setInfo({ ...next, photoUrl: d.photoUrl ?? next.photoUrl })
    return true
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => saveField({ photoDataUrl: reader.result as string })
    reader.readAsDataURL(file)
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
    <div className="min-h-screen bg-[#fafaf9]">
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-[#ebebeb] px-5 py-4 z-10">
        <p className="text-[10px] text-[#aaa] uppercase tracking-widest">Teacher</p>
        <h1 className="text-sm font-medium">我的</h1>
      </header>

      {/* Profile card */}
      <div className="mx-4 mt-4 bg-black text-white rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <label className="cursor-pointer shrink-0 relative group">
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            {info.photoUrl
              ? <img src={info.photoUrl} alt="頭貼" className="w-12 h-12 rounded-full object-cover" />
              : <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-base">{info.name.slice(0, 1)}</div>
            }
            <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[9px]">更換</span>
          </label>
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-widest">Instructor</p>
            <p className="text-sm font-medium mt-0.5">{info.name}</p>
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

      <div className="px-4 py-5 flex flex-col gap-6">

        {/* 個人資料 */}
        <Section title="個人資料">
          <EditableRow label="顯示名稱" value={info.name} busy={busy}
            onSave={v => v.trim() ? saveField({ name: v }) : Promise.resolve(false)} />
          <EditableRow label="專長" value={info.specialty} placeholder="水彩・油畫…" busy={busy}
            onSave={v => saveField({ specialty: v })} />
          <EditableRow label="電話" value={info.phone} placeholder="09xx-xxx-xxx" busy={busy}
            onSave={v => saveField({ phone: v })} />
          <EditableRow label="簡介" value={info.bio} placeholder="教學理念、經歷…" multiline busy={busy}
            onSave={v => saveField({ bio: v })} />
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm">電子信箱</span>
            <span className="text-sm text-[#aaa]">{teacher.isLineAccount ? "（LINE 帳號）" : teacher.email || "—"}</span>
          </div>
        </Section>

        {/* 安全性 */}
        <Section title="安全性">
          {teacher.isLineAccount ? (
            <div className="px-4 py-3.5">
              <p className="text-sm">密碼</p>
              <p className="text-xs text-[#aaa] mt-0.5">此帳號透過 LINE 登入，無需密碼</p>
            </div>
          ) : editingPwd ? (
            <div className="px-4 py-3.5 flex flex-col gap-2">
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
                  className="flex-1 py-2 text-sm border border-[#f0f0f0] rounded-xl">
                  取消
                </button>
                <button disabled={busy || !oldPwd || newPwd.length < 8} onClick={savePassword}
                  className="flex-1 py-2 text-sm bg-black text-white rounded-xl disabled:opacity-40">
                  {busy ? "更新中…" : "更新密碼"}
                </button>
              </div>
            </div>
          ) : (
            <Row label="修改密碼" onClick={() => setEditingPwd(true)} />
          )}
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm">LINE 帳號綁定</p>
              <p className="text-xs text-[#aaa] mt-0.5">{teacher.lineBound ? "已綁定" : "使用 LINE 登入即自動綁定"}</p>
            </div>
            {teacher.lineBound
              ? <span className="text-xs text-[#22c55e] font-medium">已綁定</span>
              : <span className="text-xs text-[#ccc]">未綁定</span>
            }
          </div>
        </Section>

        {/* 通知設定 */}
        <Section title="通知設定">
          <Toggle label="課程提醒" value={notifyCourse}
            onChange={() => setNotifyCourse(v => { saveNotify(!v, notifySystem); return !v })} />
          <Toggle label="系統通知" value={notifySystem}
            onChange={() => setNotifySystem(v => { saveNotify(notifyCourse, !v); return !v })} />
        </Section>

        {/* 點名紀錄 */}
        <div>
          <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-3">點名紀錄</p>
          {history.length === 0 ? (
            <p className="text-sm text-[#ccc] py-2">尚無點名紀錄</p>
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

        {/* 帳號 */}
        <Section title="帳號">
          <button
            onClick={() => setLogoutConfirm(true)}
            className="w-full flex items-center px-4 py-3.5 text-sm text-red-500"
          >
            登出
          </button>
        </Section>

      </div>

      {/* Logout confirm overlay */}
      {logoutConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-[60]">
          <div className="bg-white rounded-t-2xl w-full max-w-md px-5 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <p className="text-base font-medium mb-1">確定登出？</p>
            <p className="text-sm text-[#aaa] mb-5">您的資料將安全保存，下次可重新登入。</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleLogout}
                className="block w-full py-3 text-sm text-center bg-black text-white rounded-xl"
              >
                確認登出
              </button>
              <button
                onClick={() => setLogoutConfirm(false)}
                className="w-full py-3 text-sm border border-[#f0f0f0] rounded-xl"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-6" />
    </div>
  )
}
