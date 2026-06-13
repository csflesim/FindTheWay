import Link from "next/link"

const categories = ["全部", "素描", "水彩", "油畫", "兒童美術", "親子"]

const courses = [
  { id: 1, title: "基礎水彩入門", age: "8歲以上", date: "每週六 10:00", spots: 3, price: 1200 },
  { id: 2, title: "兒童創意素描", age: "6–12歲", date: "每週日 14:00", spots: 5, price: 980 },
  { id: 3, title: "成人油畫工作坊", age: "18歲以上", date: "每週五 19:00", spots: 2, price: 1500 },
]

export default function MobileHomePage() {
  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-[#ebebeb] px-5 py-4 flex items-center justify-between z-10">
        <div>
          <p className="text-[10px] text-[#aaa] tracking-widest uppercase">Find the Way</p>
          <h1 className="text-sm font-medium leading-tight">藝術工作坊</h1>
        </div>
        <Link
          href="/m/login"
          className="text-xs border border-black px-3 py-1.5 rounded-full hover:bg-black hover:text-white transition-colors"
        >
          登入 / 註冊
        </Link>
      </header>

      {/* Hero Banner */}
      <div className="mx-4 mt-4 bg-black text-white rounded-2xl p-5">
        <p className="text-[10px] text-white/50 mb-1 tracking-widest uppercase">Welcome</p>
        <p className="text-xl font-serif leading-snug">忙碌不迷路<br />藝術工作坊</p>
        <p className="text-xs text-white/50 mt-3 leading-relaxed">
          登入後可查看課堂券餘額<br />與課程報名紀錄
        </p>
        <Link
          href="/m/login"
          className="inline-block mt-4 text-[11px] bg-white text-black px-4 py-1.5 rounded-full"
        >
          立即登入
        </Link>
      </div>

      {/* Courses */}
      <div className="mt-6 px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">近期課程</h2>
          <Link href="/m/courses" className="text-xs text-[#999]">
            查看全部 ›
          </Link>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
          {categories.map((cat, i) => (
            <span
              key={cat}
              className={`shrink-0 text-xs px-3 py-1 rounded-full border ${
                i === 0
                  ? "bg-black text-white border-black"
                  : "border-[#ddd] text-[#666]"
              }`}
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Course cards */}
        <div className="flex flex-col gap-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/m/courses/${course.id}`}
              className="bg-white rounded-xl p-4 flex gap-3 border border-[#f0f0f0]"
            >
              <div className="w-16 h-16 bg-[#f2f2f2] rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-tight">{course.title}</p>
                  <span className="text-[10px] bg-[#f5f5f5] text-[#666] px-1.5 py-0.5 rounded shrink-0">
                    {course.age}
                  </span>
                </div>
                <p className="text-xs text-[#999] mt-1">{course.date}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-[#999]">剩 {course.spots} 名</span>
                  <span className="text-xs font-medium">NT$ {course.price.toLocaleString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="h-6" />
    </div>
  )
}
