const history = [
  { id: 1, course: "基礎水彩入門", date: "2026-06-07 10:00", present: 7, total: 8 },
  { id: 2, course: "成人油畫工作坊", date: "2026-06-06 19:00", present: 5, total: 6 },
  { id: 3, course: "基礎水彩入門", date: "2026-05-31 10:00", present: 8, total: 8 },
  { id: 4, course: "水墨入門體驗", date: "2026-05-28 19:00", present: 4, total: 5 },
]

export default function TeacherProfilePage() {
  return (
    <div>
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-[#ebebeb] px-5 py-4 z-10">
        <p className="text-[10px] text-[#aaa] uppercase tracking-widest">Teacher</p>
        <h1 className="text-sm font-medium">我的</h1>
      </header>

      {/* Profile card */}
      <div className="mx-4 mt-4 bg-black text-white rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <img src="/image/mingdez.jpg" alt="頭貼" className="w-12 h-12 rounded-full shrink-0 object-cover" />
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-widest">Instructor</p>
            <p className="text-sm font-medium mt-0.5">明德老師</p>
            <p className="text-xs text-white/50">mingdez@findtheway.com</p>
          </div>
        </div>
        <div className="flex gap-6 mt-4 pt-4 border-t border-white/10">
          <div>
            <p className="text-2xl font-light">12</p>
            <p className="text-[10px] text-white/50 mt-0.5">本月課堂</p>
          </div>
          <div>
            <p className="text-2xl font-light">4</p>
            <p className="text-[10px] text-white/50 mt-0.5">課程種類</p>
          </div>
          <div>
            <p className="text-2xl font-light">92%</p>
            <p className="text-[10px] text-white/50 mt-0.5">平均出席率</p>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="px-4 mt-5">
        <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-3">點名紀錄</p>
        <div className="bg-white rounded-xl divide-y divide-[#f5f5f5] border border-[#f0f0f0]">
          {history.map((record) => {
            const rate = Math.round((record.present / record.total) * 100)
            return (
              <div key={record.id} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-sm font-medium">{record.course}</p>
                  <p className="text-xs text-[#999] mt-0.5">{record.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{record.present} / {record.total}</p>
                  <p className="text-[10px] text-[#999]">出席 {rate}%</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="h-6" />
    </div>
  )
}
