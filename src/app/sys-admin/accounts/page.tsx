import { Search, Plus } from "lucide-react"

const accounts = [
  { id: 1, name: "陳媽媽",       email: "chen@email.com",  phone: "0912-345-678", students: ["陳小明"],             joined: "2024/09", status: "正常" },
  { id: 2, name: "林美玲",       email: "lin@email.com",   phone: "0923-456-789", students: ["林小華"],             joined: "2024/10", status: "正常" },
  { id: 3, name: "王大文家長",   email: "wang@email.com",  phone: "0934-567-890", students: ["王大文"],             joined: "2024/11", status: "正常" },
  { id: 4, name: "張雅婷",       email: "chang@email.com", phone: "0945-678-901", students: ["張雅婷"],             joined: "2025/01", status: "正常" },
  { id: 5, name: "吳媽媽",       email: "wu@email.com",    phone: "0956-789-012", students: ["吳小朋", "吳小妹"],  joined: "2025/03", status: "正常" },
  { id: 6, name: "劉建宏家長",   email: "liu@email.com",   phone: "0967-890-123", students: ["劉建宏"],             joined: "2025/04", status: "停用" },
]

export default function AccountsPage() {
  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Accounts</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">帳號管理</h1>
        </div>
        <button className="flex items-center gap-1.5 bg-black text-white text-sm px-3 md:px-4 py-2 rounded-lg">
          <Plus size={15} /><span className="hidden sm:inline">新增帳號</span><span className="sm:hidden">新增</span>
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
        <input placeholder="搜尋帳號名稱 / Email…"
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black" />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
        <div className="grid grid-cols-[1.5fr_2fr_1.4fr_1.8fr_0.8fr_0.7fr_auto] gap-4 px-5 py-3 border-b border-[#f5f5f5] text-[11px] text-[#aaa] uppercase tracking-widest">
          <span>帳號</span><span>Email</span><span>電話</span><span>學生</span><span>加入</span><span>狀態</span><span></span>
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {accounts.map((a) => (
            <div key={a.id} className="grid grid-cols-[1.5fr_2fr_1.4fr_1.8fr_0.8fr_0.7fr_auto] gap-4 items-center px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-[11px] text-[#999] font-medium">
                  {a.name.slice(0, 1)}
                </div>
                <p className="text-sm font-medium truncate">{a.name}</p>
              </div>
              <p className="text-xs text-[#666] truncate">{a.email}</p>
              <p className="text-xs text-[#999]">{a.phone}</p>
              <div className="flex flex-wrap gap-1">
                {a.students.map((s) => (
                  <span key={s} className="text-[10px] bg-[#f5f5f5] text-[#666] px-1.5 py-0.5 rounded">{s}</span>
                ))}
              </div>
              <p className="text-xs text-[#999]">{a.joined}</p>
              <span className={`text-[11px] px-2.5 py-1 rounded-full w-fit ${
                a.status === "正常" ? "bg-black text-white" : "bg-[#f5f5f5] text-[#999]"
              }`}>{a.status}</span>
              <button className="text-xs text-[#999] hover:text-black">編輯</button>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {accounts.map((a) => (
          <div key={a.id} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-sm text-[#999] font-medium">
                  {a.name.slice(0, 1)}
                </div>
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-[#aaa]">{a.email}</p>
                </div>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full shrink-0 ${
                a.status === "正常" ? "bg-black text-white" : "bg-[#f5f5f5] text-[#999]"
              }`}>{a.status}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {a.students.map((s) => (
                <span key={s} className="text-[10px] bg-[#f5f5f5] text-[#666] px-1.5 py-0.5 rounded">{s}</span>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-[10px] text-[#aaa]">{a.phone} · 加入 {a.joined}</p>
              <button className="text-xs text-[#999] hover:text-black">編輯</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
