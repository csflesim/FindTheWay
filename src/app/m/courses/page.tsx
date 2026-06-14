'use client'

import { useState } from "react"
import Link from "next/link"
import { COURSES, CATEGORIES } from "../_lib/courses"

const TEACHER_PHOTOS: Record<string, string> = {
  "小紫老師": "/image/purple.jpg",
  "明德老師": "/image/mingdez.jpg",
}

export default function CoursesPage() {
  const [activeCategory, setActiveCategory] = useState("全部")

  const filtered = activeCategory === "全部"
    ? COURSES
    : COURSES.filter(c => c.category === activeCategory)

  return (
    <div>
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-[#ebebeb] px-5 py-4 z-10">
        <h1 className="text-base font-medium">課程列表</h1>
      </header>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-[#f0f0f0] no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              activeCategory === cat
                ? "bg-black text-white border-black"
                : "border-[#ddd] text-[#666] hover:border-black hover:text-black"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Course list */}
      <div className="px-4 py-3 flex flex-col gap-3">
        {filtered.length === 0 && (
          <p className="text-sm text-[#ccc] py-8 text-center">此分類暫無課程</p>
        )}
        {filtered.map((course) => (
          <Link
            key={course.id}
            href={`/m/courses/${course.id}`}
            className="bg-white rounded-xl overflow-hidden border border-[#f0f0f0] active:bg-[#fafaf9] transition-colors"
          >
            {course.imgLandscape
              ? <img src={course.imgLandscape} alt={course.title} className="w-full h-36 object-cover" />
              : <div className="w-full h-36 bg-[#f2f2f2]" />
            }
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className="text-sm font-medium">{course.title}</h3>
                <span className="text-[10px] bg-[#f5f5f5] text-[#666] px-2 py-0.5 rounded shrink-0">
                  {course.age}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex -space-x-1.5">
                  {course.teacher.split("、").map(t => (
                    TEACHER_PHOTOS[t]
                      ? <img key={t} src={TEACHER_PHOTOS[t]} alt={t} className="w-5 h-5 rounded-full object-cover ring-1 ring-white" />
                      : <div key={t} className="w-5 h-5 rounded-full bg-[#e8e8e8] ring-1 ring-white flex items-center justify-center text-[8px] text-[#999]">{t.slice(0,1)}</div>
                  ))}
                </div>
                <p className="text-xs text-[#999]">{course.teacher} · {course.date} {course.time}</p>
              </div>
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
