import { Search, Plus } from "lucide-react"

const members = [
  { id: 1, name: "陳美玲", email: "admin@findtheway.com",  role: "超級管理員", lastLogin: "2026/06/13 14:32", status: "啟用" },
  { id: 2, name: "林志偉", email: "lin@findtheway.com",    role: "課務管理員", lastLogin: "2026/06/13 09:18", status: "啟用" },
  { id: 3, name: "張雅婷", email: "zhang@findtheway.com",  role: "財務管理員", lastLogin: "2026/06/12 17:05", status: "啟用" },
  { id: 4, name: "王建宏", email: "wang@findtheway.com",   role: "課務管理員", lastLogin: "2026/06/10 11:44", status: "停用" },
]

const roleColor: Record<string, string> = {
  "超級管理員": "bg-black text-white",
  "課務管理員": "bg-[#f0f0f0] text-[#555]",
  "財務管理員": "bg-[#e8f4fd] text-[#1a6fa8]",
}

export default function MembersPage() {
  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">System / Members</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">人員管理</h1>
        </div>
        <button className="flex items-center gap-1.5 bg-black text-white text-sm px-3 md:px-4 py-2 rounded-lg">
          <Plus size={15} /><span className="hidden sm:inline">新增人員</span><span className="sm:hidden">新增</span>
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
        <input placeholder="搜尋姓名 / Email…"
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black" />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
        <div className="grid grid-cols-[1.5fr_2fr_1.4fr_2fr_0.7fr_auto] gap-4 px-5 py-3 border-b border-[#f5f5f5] text-[11px] text-[#aaa] uppercase tracking-widest">
          <span>姓名</span><span>Email</span><span>角色</span><span>最後登入</span><span>狀態</span><span></span>
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {members.map((m) => (
            <div key={m.id} className="grid grid-cols-[1.5fr_2fr_1.4fr_2fr_0.7fr_auto] gap-4 items-center px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-[11px] text-[#999] font-medium">
                  {m.name.slice(0, 1)}
                </div>
                <p className="text-sm font-medium">{m.name}</p>
              </div>
              <p className="text-xs text-[#666]">{m.email}</p>
              <span className={`text-[11px] px-2.5 py-1 rounded-full w-fit ${roleColor[m.role] ?? "bg-[#f5f5f5] text-[#999]"}`}>
                {m.role}
              </span>
              <p className="text-xs text-[#999]">{m.lastLogin}</p>
              <span className={`text-[11px] px-2.5 py-1 rounded-full w-fit ${
                m.status === "啟用" ? "bg-black text-white" : "bg-[#f5f5f5] text-[#999]"
              }`}>{m.status}</span>
              <button className="text-xs text-[#999] hover:text-black">編輯</button>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {members.map((m) => (
          <div key={m.id} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-sm text-[#999] font-medium">
                  {m.name.slice(0, 1)}
                </div>
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-[#aaa]">{m.email}</p>
                </div>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full shrink-0 ${
                m.status === "啟用" ? "bg-black text-white" : "bg-[#f5f5f5] text-[#999]"
              }`}>{m.status}</span>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className={`text-[11px] px-2.5 py-1 rounded-full ${roleColor[m.role] ?? "bg-[#f5f5f5] text-[#999]"}`}>
                {m.role}
              </span>
              <p className="text-[10px] text-[#aaa]">{m.lastLogin}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
