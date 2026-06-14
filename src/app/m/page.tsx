'use client'

import { useState } from "react"
import Link from "next/link"
import { COURSES, CATEGORIES } from "./_lib/courses"

const TEACHER_PHOTOS: Record<string, string> = {
  "小紫老師": "/image/purple.jpg",
  "明德老師": "/image/mingdez.jpg",
}

export default function MobileHomePage() {
  const [activeCategory, setActiveCategory] = useState("全部")

  const filtered = activeCategory === "全部"
    ? COURSES
    : COURSES.filter(c => c.category === activeCategory)

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
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 text-xs px-3 py-1 rounded-full border transition-colors ${
                activeCategory === cat
                  ? "bg-black text-white border-black"
                  : "border-[#ddd] text-[#666] hover:border-black hover:text-black"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Course cards */}
        <div className="flex flex-col gap-3">
          {filtered.length === 0 && (
            <p className="text-sm text-[#ccc] py-6 text-center">此分類暫無課程</p>
          )}
          {filtered.map((course) => (
            <Link
              key={course.id}
              href={`/m/courses/${course.id}`}
              className="bg-white rounded-xl p-4 flex gap-3 border border-[#f0f0f0] active:bg-[#fafaf9] transition-colors"
            >
              {course.imgSquare
                ? <img src={course.imgSquare} alt={course.title} className="w-16 h-16 rounded-lg shrink-0 object-cover" />
                : <div className="w-16 h-16 bg-[#f2f2f2] rounded-lg shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-tight">{course.title}</p>
                  <span className="text-[10px] bg-[#f5f5f5] text-[#666] px-1.5 py-0.5 rounded shrink-0">
                    {course.age}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="flex -space-x-1.5">
                    {course.teacher.split("、").map(t => (
                      TEACHER_PHOTOS[t]
                        ? <img key={t} src={TEACHER_PHOTOS[t]} alt={t} className="w-4 h-4 rounded-full object-cover ring-1 ring-white" />
                        : <div key={t} className="w-4 h-4 rounded-full bg-[#e8e8e8] ring-1 ring-white flex items-center justify-center text-[7px] text-[#999]">{t.slice(0,1)}</div>
                    ))}
                  </div>
                  <p className="text-xs text-[#999]">{course.date} {course.time}</p>
                </div>
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
