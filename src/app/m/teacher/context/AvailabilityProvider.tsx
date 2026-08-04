'use client'

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export type Block = {
  id: string
  dateStr: string
  startTime: string
  endTime: string
  reason: string
}

type CtxType = {
  blocks: Block[]
  addBlock: (b: Omit<Block, "id">) => void
  removeBlock: (id: string) => void
}

const Ctx = createContext<CtxType>({ blocks: [], addBlock: () => {}, removeBlock: () => {} })

export function AvailabilityProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [teacherId, setTeacherId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/teacher/me")
      .then(r => r.json())
      .then(async d => {
        if (!d.teacher) return
        setTeacherId(d.teacher.id)
        const { data } = await supabase
          .from("teacher_availability")
          .select("id, date, start_time, end_time, reason")
          .eq("teacher_id", d.teacher.id)
          .order("date")
        setBlocks((data ?? []).map(r => ({
          id: r.id,
          dateStr: r.date,
          startTime: String(r.start_time).slice(0, 5),
          endTime: String(r.end_time).slice(0, 5),
          reason: r.reason ?? "",
        })))
      })
      .catch(() => {})
  }, [supabase])

  async function addBlock(b: Omit<Block, "id">) {
    if (!teacherId) return
    const { data, error } = await supabase.from("teacher_availability").insert({
      teacher_id: teacherId,
      date: b.dateStr,
      start_time: b.startTime,
      end_time: b.endTime,
      reason: b.reason || null,
    }).select("id").single()
    if (error) { alert(`新增失敗：${error.message}`); return }
    setBlocks(prev => [...prev, { ...b, id: data.id }])
  }

  async function removeBlock(id: string) {
    const { error } = await supabase.from("teacher_availability").delete().eq("id", id)
    if (error) { alert(`刪除失敗：${error.message}`); return }
    setBlocks(prev => prev.filter(b => b.id !== id))
  }

  return <Ctx.Provider value={{ blocks, addBlock, removeBlock }}>{children}</Ctx.Provider>
}

export function useAvailability() {
  return useContext(Ctx)
}
