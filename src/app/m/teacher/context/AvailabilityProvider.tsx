'use client'

import { createContext, useContext, useState } from "react"

export type Block = {
  id: number
  dateStr: string
  startTime: string
  endTime: string
  reason: string
}

type CtxType = {
  blocks: Block[]
  addBlock: (b: Omit<Block, "id">) => void
  removeBlock: (id: number) => void
}

const Ctx = createContext<CtxType>({ blocks: [], addBlock: () => {}, removeBlock: () => {} })

const INITIAL: Block[] = [
  { id: 1, dateStr: "2026-06-19", startTime: "10:00", endTime: "14:00", reason: "家庭事務" },
  { id: 2, dateStr: "2026-06-25", startTime: "09:00", endTime: "22:00", reason: "出差" },
]

export function AvailabilityProvider({ children }: { children: React.ReactNode }) {
  const [blocks, setBlocks] = useState<Block[]>(INITIAL)

  function addBlock(b: Omit<Block, "id">) {
    setBlocks((prev) => [...prev, { id: Date.now(), ...b }])
  }
  function removeBlock(id: number) {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  return <Ctx.Provider value={{ blocks, addBlock, removeBlock }}>{children}</Ctx.Provider>
}

export function useAvailability() {
  return useContext(Ctx)
}
