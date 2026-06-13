const courses = [
  { id: 1, title: "基礎水彩入門",   date: "06/14 週六", time: "10:00–12:00", teacher: "陳老師", studio: "A" },
  { id: 2, title: "成人油畫工作坊",  date: "06/14 週六", time: "19:00–21:00", teacher: "陳老師", studio: "B" },
  { id: 3, title: "兒童創意素描",   date: "06/15 週日", time: "14:00–15:30", teacher: "林老師", studio: "A" },
  { id: 4, title: "親子藝術探索",   date: "06/15 週日", time: "14:00–15:30", teacher: "林老師", studio: "B" },
  { id: 5, title: "水墨入門體驗",   date: "06/18 週三", time: "19:00–21:00", teacher: "張老師", studio: "C" },
]

const rosterByCourse: Record<number, { name: string; status: "出席" | "缺席" | "請假" }[]> = {
  1: [
    { name: "陳小明", status: "出席" },
    { name: "王大文", status: "出席" },
    { name: "劉建宏", status: "請假" },
    { name: "許小芸", status: "出席" },
    { name: "黃志明", status: "缺席" },
    { name: "蔡美惠", status: "出席" },
    { name: "林佳穎", status: "出席" },
    { name: "洪大偉", status: "出席" },
  ],
  2: [
    { name: "張雅婷", status: "出席" },
    { name: "陳建志", status: "出席" },
    { name: "吳雅婷", status: "缺席" },
    { name: "李明哲", status: "出席" },
    { name: "周美玲", status: "出席" },
    { name: "鄭文峰", status: "請假" },
  ],
  3: [
    { name: "林小華", status: "出席" },
    { name: "吳小朋", status: "出席" },
    { name: "劉小雯", status: "出席" },
    { name: "謝小宇", status: "缺席" },
    { name: "楊小安", status: "出席" },
    { name: "江小蓮", status: "出席" },
    { name: "余小凱", status: "出席" },
    { name: "施小芳", status: "出席" },
    { name: "連小豪", status: "請假" },
  ],
}

const statusStyle: Record<string, string> = {
  "出席": "bg-black text-white",
  "缺席": "bg-[#fee2e2] text-[#b91c1c]",
  "請假": "bg-[#f5f5f5] text-[#999]",
}

function CourseRoster({ course }: { course: typeof courses[number] }) {
  const students = rosterByCourse[course.id] ?? []
  if (students.length === 0) return null
  const present  = students.filter(s => s.status === "出席").length
  const absent   = students.filter(s => s.status === "缺席").length
  const leave    = students.filter(s => s.status === "請假").length

  return (
    <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
      {/* Course header */}
      <div className="px-5 py-4 border-b border-[#f5f5f5]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{course.title}</p>
            <p className="text-xs text-[#999] mt-0.5">{course.date} · {course.time} · Studio {course.studio} · {course.teacher}</p>
          </div>
          <div className="flex gap-4 shrink-0 text-center">
            <div>
              <p className="text-base font-medium">{present}</p>
              <p className="text-[10px] text-[#aaa]">出席</p>
            </div>
            <div>
              <p className="text-base font-medium text-red-400">{absent}</p>
              <p className="text-[10px] text-[#aaa]">缺席</p>
            </div>
            <div>
              <p className="text-base font-medium text-[#999]">{leave}</p>
              <p className="text-[10px] text-[#aaa]">請假</p>
            </div>
          </div>
        </div>
        {/* Attendance bar */}
        <div className="mt-3 h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
          <div className="h-full bg-black rounded-full transition-all"
            style={{ width: `${Math.round((present / students.length) * 100)}%` }} />
        </div>
      </div>

      {/* Student list — desktop */}
      <div className="hidden md:block divide-y divide-[#f5f5f5]">
        {students.map((s, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-[10px] text-[#999]">
                {s.name.slice(0, 1)}
              </div>
              <p className="text-sm">{s.name}</p>
            </div>
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${statusStyle[s.status]}`}>
              {s.status}
            </span>
          </div>
        ))}
      </div>

      {/* Student chips — mobile */}
      <div className="md:hidden px-4 py-3 flex flex-wrap gap-2">
        {students.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 bg-[#f9f9f9] rounded-lg px-2.5 py-1.5">
            <span className="text-xs">{s.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusStyle[s.status]}`}>
              {s.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RosterPage() {
  const withRoster = courses.filter(c => rosterByCourse[c.id])

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="mb-5">
        <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Roster</p>
        <h1 className="text-lg md:text-xl font-medium mt-0.5">出席管理</h1>
      </div>

      {/* Date filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {["本週", "06/14", "06/15", "06/18"].map((d, i) => (
          <button key={d}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs transition-colors ${
              i === 0 ? "bg-black text-white" : "bg-white border border-[#f0f0f0] text-[#999] hover:border-black hover:text-black"
            }`}>
            {d}
          </button>
        ))}
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "本週出席", value: "42", sub: "人次" },
          { label: "缺席",     value: "6",  sub: "人次" },
          { label: "請假",     value: "4",  sub: "人次" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-[#f0f0f0] text-center">
            <p className="text-xl font-medium leading-none">{value}</p>
            <p className="text-[10px] text-[#aaa] mt-1">{sub}</p>
            <p className="text-[10px] text-[#bbb] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Per-course rosters */}
      <div className="flex flex-col gap-4">
        {withRoster.map(course => (
          <CourseRoster key={course.id} course={course} />
        ))}
      </div>
    </div>
  )
}
