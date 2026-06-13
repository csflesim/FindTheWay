import { Plus, Search } from "lucide-react"

const courses = [
  { id: 1, title: "基礎水彩入門",  teacher: "陳老師", schedule: "每週六 10:00–12:00", studio: "A", enrolled: 8,  capacity: 10, status: "開課中" },
  { id: 2, title: "成人油畫工作坊", teacher: "陳老師", schedule: "每週五 19:00–21:00", studio: "B", enrolled: 6,  capacity: 8,  status: "開課中" },
  { id: 3, title: "兒童創意素描",  teacher: "林老師", schedule: "每週日 14:00–15:30", studio: "A", enrolled: 9,  capacity: 10, status: "開課中" },
  { id: 4, title: "親子藝術探索",  teacher: "林老師", schedule: "每週六 14:00–15:30", studio: "B", enrolled: 4,  capacity: 8,  status: "開課中" },
  { id: 5, title: "水墨入門體驗",  teacher: "張老師", schedule: "每週三 19:00–21:00", studio: "C", enrolled: 5,  capacity: 8,  status: "開課中" },
  { id: 6, title: "進階油畫技法",  teacher: "陳老師", schedule: "待排課",              studio: "–", enrolled: 0,  capacity: 8,  status: "草稿"   },
]

const statusStyle: Record<string, string> = {
  "開課中": "bg-black text-white",
  "草稿":   "bg-[#f5f5f5] text-[#999]",
}

export default function CoursesPage() {
  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Courses</p>
          <h1 className="text-xl font-medium mt-0.5">課程管理</h1>
        </div>
        <button className="flex items-center gap-1.5 bg-black text-white text-sm px-4 py-2 rounded-lg">
          <Plus size={15} />新增課程
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
        <input placeholder="搜尋課程名稱 / 教師…"
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
        <div className="hidden md:grid grid-cols-[2fr_1fr_2fr_0.5fr_1fr_0.8fr_auto] gap-4 px-5 py-3 border-b border-[#f5f5f5] text-[11px] text-[#aaa] uppercase tracking-widest">
          <span>課程</span><span>教師</span><span>時間</span><span>教室</span><span>報名</span><span>狀態</span><span></span>
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {courses.map((c) => {
            const pct = Math.round((c.enrolled / c.capacity) * 100)
            return (
              <div key={c.id} className="px-5 py-4 md:grid md:grid-cols-[2fr_1fr_2fr_0.5fr_1fr_0.8fr_auto] md:gap-4 md:items-center flex flex-wrap gap-2">
                <p className="text-sm font-medium w-full md:w-auto">{c.title}</p>
                <p className="text-sm text-[#666]">{c.teacher}</p>
                <p className="text-xs text-[#999]">{c.schedule}</p>
                <p className="text-xs text-[#999]">Studio {c.studio}</p>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
                    <div className="h-full bg-black rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-[#999]">{c.enrolled}/{c.capacity}</span>
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full w-fit ${statusStyle[c.status]}`}>
                  {c.status}
                </span>
                <button className="text-xs text-[#999] hover:text-black">編輯</button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
