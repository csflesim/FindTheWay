import { Plus, Check, Minus } from "lucide-react"

const roles = [
  {
    id: 1,
    name: "超級管理員",
    desc: "擁有所有功能的完整存取權限",
    members: 1,
    permissions: {
      帳號管理: true,  學員管理: true,  教師管理: true,  課程管理: true,
      商品管理: true,  訂單管理: true,  帳務管理: true,  出席管理: true,
      系統管理: true,
    },
  },
  {
    id: 2,
    name: "課務管理員",
    desc: "負責課程、教師、學員及出席管理",
    members: 2,
    permissions: {
      帳號管理: true,  學員管理: true,  教師管理: true,  課程管理: true,
      商品管理: false, 訂單管理: false, 帳務管理: false, 出席管理: true,
      系統管理: false,
    },
  },
  {
    id: 3,
    name: "財務管理員",
    desc: "負責訂單、商品及帳務管理",
    members: 1,
    permissions: {
      帳號管理: false, 學員管理: true,  教師管理: false, 課程管理: false,
      商品管理: true,  訂單管理: true,  帳務管理: true,  出席管理: false,
      系統管理: false,
    },
  },
]

const ALL_PERMS = ["帳號管理","學員管理","教師管理","課程管理","商品管理","訂單管理","帳務管理","出席管理","系統管理"]

export default function RolesPage() {
  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">System / Roles</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">角色管理</h1>
        </div>
        <button className="flex items-center gap-1.5 bg-black text-white text-sm px-3 md:px-4 py-2 rounded-lg">
          <Plus size={15} /><span className="hidden sm:inline">新增角色</span><span className="sm:hidden">新增</span>
        </button>
      </div>

      {/* Desktop permission matrix */}
      <div className="hidden md:block bg-white rounded-xl border border-[#f0f0f0] overflow-hidden mb-4">
        {/* Header row */}
        <div className="flex border-b border-[#f5f5f5]">
          <div className="w-52 shrink-0 px-5 py-3 text-[11px] text-[#aaa] uppercase tracking-widest">角色</div>
          {ALL_PERMS.map(p => (
            <div key={p} className="flex-1 text-center px-1 py-3 text-[11px] text-[#aaa]">{p}</div>
          ))}
          <div className="w-16 shrink-0" />
        </div>
        {/* Role rows */}
        {roles.map((r) => (
          <div key={r.id} className="flex items-center border-b border-[#f5f5f5] last:border-0 hover:bg-[#fafafa] transition-colors">
            <div className="w-52 shrink-0 px-5 py-4">
              <p className="text-sm font-medium">{r.name}</p>
              <p className="text-xs text-[#999] mt-0.5">{r.members} 人</p>
            </div>
            {ALL_PERMS.map(p => (
              <div key={p} className="flex-1 flex justify-center py-4">
                {r.permissions[p as keyof typeof r.permissions]
                  ? <Check size={15} className="text-black" strokeWidth={2.5} />
                  : <Minus size={13} className="text-[#e0e0e0]" />
                }
              </div>
            ))}
            <div className="w-16 shrink-0 flex justify-center">
              <button className="text-xs text-[#999] hover:text-black">編輯</button>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {roles.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
            <div className="flex items-start justify-between px-4 pt-4 pb-3">
              <div>
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-[#999] mt-0.5">{r.desc}</p>
                <p className="text-[10px] text-[#bbb] mt-1">{r.members} 位人員</p>
              </div>
              <button className="text-xs text-[#999] hover:text-black shrink-0 ml-3">編輯</button>
            </div>
            <div className="border-t border-[#f5f5f5] px-4 py-3 flex flex-wrap gap-1.5">
              {ALL_PERMS.map(p => (
                <span key={p} className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  r.permissions[p as keyof typeof r.permissions]
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
