import Link from "next/link"

const categories = ["全部", "素描", "水彩", "油畫", "兒童美術", "親子"]

const courses = [
  { id: 1, title: "基礎水彩入門", age: "8歲以上", teacher: "陳老師", date: "每週六 10:00–12:00", spots: 3, price: 1200 },
  { id: 2, title: "兒童創意素描", age: "6–12歲", teacher: "林老師", date: "每週日 14:00–15:30", spots: 5, price: 980 },
  { id: 3, title: "成人油畫工作坊", age: "18歲以上", teacher: "陳老師", date: "每週五 19:00–21:00", spots: 2, price: 1500 },
  { id: 4, title: "親子藝術探索", age: "4–8歲（含家長）", teacher: "林老師", date: "每週六 14:00–15:30", spots: 4, price: 1100 },
  { id: 5, title: "水墨入門體驗", age: "10歲以上", teacher: "張老師", date: "每週三 19:00–21:00", spots: 6, price: 1300 },
]

export default function CoursesPage() {
  return (
    <div>
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-[#ebebeb] px-5 py-4 z-10">
        <h1 className="text-base font-medium">課程列表</h1>
      </header>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-[#f0f0f0] no-scrollbar">
        {categories.map((cat, i) => (
          <span
            key={cat}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border ${
              i === 0
                ? "bg-black text-white border-black"
                : "border-[#ddd] text-[#666]"
            }`}
          >
            {cat}
          </span>
        ))}
      </div>

      {/* Course list */}
      <div className="px-4 py-3 flex flex-col gap-3">
        {courses.map((course) => (
          <Link
            key={course.id}
            href={`/m/courses/${course.id}`}
            className="bg-white rounded-xl overflow-hidden border border-[#f0f0f0]"
          >
            {/* Thumbnail */}
            <div className="w-full h-36 bg-[#f2f2f2]" />
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className="text-sm font-medium">{course.title}</h3>
                <span className="text-[10px] bg-[#f5f5f5] text-[#666] px-2 py-0.5 rounded shrink-0">
                  {course.age}
                </span>
              </div>
              <p className="text-xs text-[#999]">{course.teacher} · {course.date}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-[#999]">剩 {course.spots} 個名額</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">NT$ {course.price.toLocaleString()}</span>
                  <span className="text-[11px] bg-black text-white px-3 py-1 rounded-full">
                    報名
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
