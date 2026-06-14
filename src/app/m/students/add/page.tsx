'use client'

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const RELATIONS = ["本人", "子女", "配偶", "其他"]

const inputCls = "w-full px-4 py-3 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors"

export default function AddStudentPage() {
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [relation, setRelation] = useState("子女")

  const canSubmit = name.trim() && age.trim()

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="bg-white border-b border-[#ebebeb] px-5 py-4 flex items-center gap-3">
        <Link href="/m/students" className="p-1 -ml-1 text-[#999] hover:text-black">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-base font-medium">新增學生</h1>
      </div>

      <div className="px-4 py-5 flex flex-col gap-4">
        <div>
          <label className="text-xs text-[#999] mb-1.5 block">姓名</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="學生姓名"
            className={inputCls}
          />
        </div>

        <div>
          <label className="text-xs text-[#999] mb-1.5 block">年齡</label>
          <input
            type="number"
            min={1}
            max={99}
            value={age}
            onChange={e => setAge(e.target.value)}
            placeholder="歲"
            className={inputCls}
          />
        </div>

        <div>
          <label className="text-xs text-[#999] mb-1.5 block">與本人關係</label>
          <div className="grid grid-cols-4 gap-2">
            {RELATIONS.map(r => (
              <button
                key={r}
                onClick={() => setRelation(r)}
                className={`py-2.5 text-sm rounded-xl border transition-colors ${
                  relation === r ? "bg-black text-white border-black" : "bg-white text-[#555] border-[#f0f0f0]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <button
          disabled={!canSubmit}
          className="mt-2 w-full py-3 bg-black text-white text-sm rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#222] transition-colors"
        >
          新增
        </button>
      </div>
    </div>
  )
}
