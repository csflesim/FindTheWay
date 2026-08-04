'use client'

import { useEffect, useMemo, useState } from "react"
import { Check, Minus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

// 系統實際的角色權限（RLS 依 profiles.role 判定，非可自訂矩陣）

type RoleDef = {
  key: string
  name: string
  desc: string
  permissions: Record<string, boolean>
}

const ALL_PERMS = ["會員管理","學員管理","教師管理","課程管理","商品管理","訂單管理","帳務管理","出席管理","訊息通知","系統管理"]

const ROLE_DEFS: RoleDef[] = [
  {
    key: "admin",
    name: "超級管理員",
    desc: "擁有所有後台功能的完整存取權限",
    permissions: Object.fromEntries(ALL_PERMS.map(p => [p, true])),
  },
  {
    key: "staff",
    name: "管理員",
    desc: "可登入後台，操作所有日常管理功能",
    permissions: Object.fromEntries(ALL_PERMS.map(p => [p, true])),
  },
  {
    key: "teacher",
    name: "教師",
    desc: "登入教師專區：課表、點名、請假；不可進入後台",
    permissions: Object.fromEntries(ALL_PERMS.map(p => [p, p === "出席管理"])),
  },
  {
    key: "member",
    name: "會員",
    desc: "前台會員：報名課程、購買課堂券、管理名下學員",
    permissions: Object.fromEntries(ALL_PERMS.map(p => [p, false])),
  },
]

export default function RolesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    supabase.from("profiles").select("role").then(({ data }) => {
      const c: Record<string, number> = {}
      for (const p of data ?? []) c[p.role] = (c[p.role] ?? 0) + 1
      setCounts(c)
    })
  }, [supabase])

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="mb-5">
        <p className="text-[11px] text-[#aaa] uppercase tracking-widest">System / Roles</p>
        <h1 className="text-lg md:text-xl font-medium mt-0.5">角色管理</h1>
        <p className="text-xs text-[#aaa] mt-1">角色權限由系統資料庫層（RLS）強制，於「人員管理」指派角色</p>
      </div>

      {/* Desktop permission matrix */}
      <div className="hidden md:block bg-white rounded-xl border border-[#f0f0f0] overflow-hidden mb-4">
        {/* Header row */}
        <div className="flex border-b border-[#f5f5f5]">
          <div className="w-52 shrink-0 px-5 py-3 text-[11px] text-[#aaa] uppercase tracking-widest">角色</div>
          {ALL_PERMS.map(p => (
            <div key={p} className="flex-1 text-center px-1 py-3 text-[11px] text-[#aaa]">{p}</div>
          ))}
        </div>
        {/* Role rows */}
        {ROLE_DEFS.map((r) => (
          <div key={r.key} className="flex items-center border-b border-[#f5f5f5] last:border-0 hover:bg-[#fafafa] transition-colors">
            <div className="w-52 shrink-0 px-5 py-4">
              <p className="text-sm font-medium">{r.name}</p>
              <p className="text-xs text-[#999] mt-0.5">{counts[r.key] ?? 0} 人</p>
            </div>
            {ALL_PERMS.map(p => (
              <div key={p} className="flex-1 flex justify-center py-4">
                {r.permissions[p]
                  ? <Check size={15} className="text-black" strokeWidth={2.5} />
                  : <Minus size={13} className="text-[#e0e0e0]" />
                }
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {ROLE_DEFS.map((r) => (
          <div key={r.key} className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <p className="text-sm font-medium">{r.name}</p>
              <p className="text-xs text-[#999] mt-0.5">{r.desc}</p>
              <p className="text-[10px] text-[#bbb] mt-1">{counts[r.key] ?? 0} 位人員</p>
            </div>
            <div className="border-t border-[#f5f5f5] px-4 py-3 flex flex-wrap gap-1.5">
              {ALL_PERMS.map(p => (
                <span key={p} className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  r.permissions[p]
                    ? "bg-black text-white border-black"
                    : "bg-white text-[#ccc] border-[#f0f0f0]"
                }`}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
