'use client'

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { fetchMemberData, type MemberStudent } from "../_lib/studentsDb"

export default function StudentsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [students, setStudents] = useState<MemberStudent[]>([])
  const [pending, setPending] = useState<MemberStudent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle()
      const { self, approved, pending } = await fetchMemberData(supabase, profile?.name ?? "本人")
      setStudents([self, ...approved])
      setPending(pending)
      setLoading(false)
    })
  }, [supabase])

  return (
    <div>
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-[#ebebeb] px-5 py-4 flex items-center justify-between z-10">
        <h1 className="text-base font-medium">名下學員</h1>
        <Link href="/m/students/add" className="flex items-center gap-1 text-xs text-black">
          <Plus size={14} />新增
        </Link>
      </header>

      <div className="px-4 py-4 flex flex-col gap-3">
        {loading && <p className="text-sm text-[#ccc] text-center py-8">載入中…</p>}
        {students.map(s => (
          <Link
            key={s.id}
            href={`/m/students/${s.id}`}
            className="bg-white rounded-xl border border-[#f0f0f0] px-4 py-4 flex items-center gap-4"
          >
            <div className="w-11 h-11 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-sm text-[#999]">
              {s.name.slice(0, 1)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-[#aaa] mt-0.5">{s.age != null ? `${s.age} 歲 · ` : ""}{s.relation}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-light">{s.tickets}</p>
              <p className="text-[10px] text-[#aaa]">堂</p>
            </div>
            <ChevronRight size={16} className="text-[#ccc]" />
          </Link>
        ))}
        {pending.map(s => (
          <div
            key={s.id}
            className="bg-white rounded-xl border border-amber-200 px-4 py-4 flex items-center gap-4"
          >
            <div className="w-11 h-11 bg-amber-100 rounded-full shrink-0 flex items-center justify-center text-sm text-amber-600">
              {s.name.slice(0, 1)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-[#aaa] mt-0.5">{s.age != null ? `${s.age} 歲 · ` : ""}{s.relation}</p>
            </div>
            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0">
              待審核
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
