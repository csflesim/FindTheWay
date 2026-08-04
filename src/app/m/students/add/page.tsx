'use client'

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check } from "lucide-react"

const RELATIONS = ["子女", "配偶", "其他"]
const STUDENTS_KEY = "ftw.students.v1"

const inputCls = "w-full px-4 py-3 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors"

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function getNextReqId(): string {
  try {
    const s = localStorage.getItem(STUDENTS_KEY)
    const list = s ? JSON.parse(s) : []
    return `REQ-${String(list.length + 1).padStart(3, "0")}`
  } catch {}
  return "REQ-001"
}

export default function AddStudentPage() {
  const [name, setName]         = useState("")
  const [age, setAge]           = useState("")
  const [relation, setRelation] = useState("子女")
  const [done, setDone]         = useState(false)

  const canSubmit = name.trim() && age.trim()

  function handleSubmit() {
    if (!canSubmit) return
    try {
      const req = {
        id: getNextReqId(),
        name: name.trim(),
        age: parseInt(age) || 0,
        relation,
        account: "賴大紫",
        submittedAt: todayStr(),
        status: "待審核",
      }
      const s = localStorage.getItem(STUDENTS_KEY)
      const list = s ? JSON.parse(s) : []
      localStorage.setItem(STUDENTS_KEY, JSON.stringify([...list, req]))
    } catch {}
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center px-5 text-center">
        <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center mb-5">
          <Check size={28} className="text-white" />
        </div>
        <h2 className="text-lg font-medium mb-2">申請已送出</h2>
        <p className="text-sm text-[#aaa] mb-1.5">等待工作室審核後即可加入</p>
        <p className="text-xs text-[#bbb] mb-8">審核通過後將通知您</p>
        <Link href="/m/students"
          className="bg-black text-white text-sm px-8 py-3 rounded-xl hover:bg-[#222] transition-colors">
          返回學員列表
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="bg-white border-b border-[#ebebeb] px-5 py-4 flex items-center gap-3">
        <Link href="/m/students" className="p-1 -ml-1 text-[#999] hover:text-black">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-base font-medium">新增學員</h1>
      </div>

      <div className="px-4 py-5 flex flex-col gap-4">
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-700 leading-relaxed">
            新增學員需經工作室審核，審核通過後才會加入名下學員列表。
          </p>
        </div>

        <div>
          <label className="text-xs text-[#999] mb-1.5 block">姓名</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="學員姓名"
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
          <div className="grid grid-cols-3 gap-2">
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
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="mt-2 w-full py-3 bg-black text-white text-sm rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#222] transition-colors"
        >
          送出申請
        </button>
      </div>
    </div>
  )
}
