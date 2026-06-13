import { Search, Plus } from "lucide-react"

const teachers = [
  { id: 1, name: "陳老師", specialty: "水彩・油畫", courses: 3, monthlyClasses: 12, attendanceRate: 100, joined: "2023/06", status: "在職" },
  { id: 2, name: "林老師", specialty: "素描・兒童創意", courses: 2, monthlyClasses: 8,  attendanceRate: 96,  joined: "2023/09", status: "在職" },
  { id: 3, name: "張老師", specialty: "水墨・書法",   courses: 1, monthlyClasses: 4,  attendanceRate: 100, joined: "2024/01", status: "在職" },
  { id: 4, name: "李老師", specialty: "版畫・雕塑",   courses: 0, monthlyClasses: 0,  attendanceRate: 0,   joined: "2024/08", status: "休假中" },
]

const statusStyle: Record<string, string> = {
  "在職":  "bg-black text-white",
  "休假中": "bg-[#fff3cd] text-[#856404]",
  "離職":  "bg-[#f5f5f5] text-[#999]",
}

export default function TeachersPage() {
  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Teachers</p>
          <h1 className="text-lg md:text-xl font-medium mt-0.5">教師管理</h1>
        </div>
        <button className="flex items-center gap-1.5 bg-black text-white text-sm px-3 md:px-4 py-2 rounded-lg">
          <Plus size={15} /><span className="hidden sm:inline">新增教師</span><span className="sm:hidden">新增</span>
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
        <input placeholder="搜尋教師姓名 / 專長…"
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black" />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
        <div className="grid grid-cols-[1.5fr_2fr_0.8fr_1fr_1fr_0.8fr_0.7fr_auto] gap-4 px-5 py-3 border-b border-[#f5f5f5] text-[11px] text-[#aaa] uppercase tracking-widest">
          <span>教師</span><span>專長</span><span>課程數</span><span>本月課堂</span><span>出席率</span><span>加入</span><span>狀態</span><span></span>
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {teachers.map((t) => (
            <div key={t.id} className="grid grid-cols-[1.5fr_2fr_0.8fr_1fr_1fr_0.8fr_0.7fr_auto] gap-4 items-center px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-black rounded-full shrink-0 flex items-center justify-center text-[11px] text-white font-medium">
                  {t.name.slice(0, 1)}
                </div>
                <p className="text-sm font-medium">{t.name}</p>
              </div>
              <p className="text-xs text-[#999]">{t.specialty}</p>
              <p className="text-sm text-center">{t.courses}</p>
              <p className="text-sm text-center">{t.monthlyClasses} 堂</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
                  <div className="h-full bg-black rounded-full" style={{ width: `${t.attendanceRate}%` }} />
                </div>
                <span className="text-xs text-[#999] shrink-0">{t.attendanceRate}%</span>
              </div>
              <p className="text-xs text-[#999]">{t.joined}</p>
              <span className={`text-[11px] px-2.5 py-1 rounded-full w-fit ${statusStyle[t.status]}`}>{t.status}</span>
              <button className="text-xs text-[#999] hover:text-black">編輯</button>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {teachers.map((t) => (
          <div key={t.id} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-black rounded-full shrink-0 flex items-center justify-center text-sm text-white font-medium">
                  {t.name.slice(0, 1)}
                </div>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-[#999]">{t.specialty}</p>
                </div>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full shrink-0 ${statusStyle[t.status]}`}>{t.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 py-3 border-t border-[#f5f5f5]">
              <div className="text-center">
                <p className="text-base font-medium">{t.courses}</p>
                <p className="text-[10px] text-[#aaa] mt-0.5">課程數</p>
              </div>
              <div className="text-center border-x border-[#f5f5f5]">
                <p className="text-base font-medium">{t.monthlyClasses}</p>
                <p className="text-[10px] text-[#aaa] mt-0.5">本月課堂</p>
              </div>
              <div className="text-center">
                <p className="text-base font-medium">{t.attendanceRate}%</p>
                <p className="text-[10px] text-[#aaa] mt-0.5">出席率</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-[#aaa]">加入 {t.joined}</p>
              <button className="text-xs text-[#999] hover:text-black">編輯</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
