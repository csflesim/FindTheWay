import { Search, Plus } from "lucide-react"

const students = [
  { id: 1, name: "鄭小德", age: 10, account: "鄭大德", tickets: 7,  courses: ["基礎水彩入門", "水墨入門體驗"], lastActive: "06/13" },
  { id: 2, name: "鄭小明", age: 8,  account: "鄭大德", tickets: 3,  courses: ["兒童創意素描"],                 lastActive: "06/12" },
  { id: 3, name: "賴小柏", age: 7,  account: "賴大紫", tickets: 5,  courses: ["親子藝術探索"],                 lastActive: "06/11" },
  { id: 4, name: "賴小紫", age: 6,  account: "賴大紫", tickets: 0,  courses: ["兒童創意素描"],                 lastActive: "06/10" },
]

export default function StudentsPage() {
  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Students</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">學員管理</h1>
        </div>
        <button className="flex items-center gap-1.5 bg-black text-white text-sm px-3 md:px-4 py-2 rounded-lg">
          <Plus size={15} /><span className="hidden sm:inline">新增學員</span><span className="sm:hidden">新增</span>
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
        <input placeholder="搜尋學員姓名 / 帳號…"
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black" />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
        <div className="grid grid-cols-[1.5fr_0.5fr_1.5fr_0.7fr_2fr_0.7fr_auto] gap-4 px-5 py-3 border-b border-[#f5f5f5] text-[11px] text-[#aaa] uppercase tracking-widest">
          <span>學生</span><span>年齡</span><span>帳號</span><span>課堂券</span><span>報名課程</span><span>最後動態</span><span></span>
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {students.map((s) => (
            <div key={s.id} className="grid grid-cols-[1.5fr_0.5fr_1.5fr_0.7fr_2fr_0.7fr_auto] gap-4 items-center px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-[#f2f2f2] rounded-full shrink-0" />
                <p className="text-sm font-medium truncate">{s.name}</p>
              </div>
              <p className="text-sm text-[#999]">{s.age}歲</p>
              <p className="text-xs text-[#666] truncate">{s.account}</p>
              <p className={`text-sm font-medium ${s.tickets === 0 ? "text-red-400" : ""}`}>{s.tickets} 堂</p>
              <div className="flex flex-wrap gap-1">
                {s.courses.map((c) => (
                  <span key={c} className="text-[10px] bg-[#f5f5f5] text-[#666] px-1.5 py-0.5 rounded truncate max-w-[120px]">{c}</span>
                ))}
              </div>
              <p className="text-xs text-[#999]">{s.lastActive}</p>
              <button className="text-xs text-[#999] hover:text-black">查看</button>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {students.map((s) => (
          <div key={s.id} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[#f2f2f2] rounded-full shrink-0" />
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-[#999]">{s.age}歲 · {s.account}</p>
                </div>
              </div>
              <p className={`text-sm font-medium ${s.tickets === 0 ? "text-red-400" : ""}`}>{s.tickets} 堂</p>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {s.courses.map((c) => (
                <span key={c} className="text-[10px] bg-[#f5f5f5] text-[#666] px-1.5 py-0.5 rounded">{c}</span>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-[10px] text-[#aaa]">最後動態 {s.lastActive}</p>
              <button className="text-xs text-[#999] hover:text-black">查看</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
