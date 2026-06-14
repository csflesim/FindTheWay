'use client'

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { COURSES, CATEGORIES } from "./_lib/courses"

const TEACHER_PHOTOS: Record<string, string> = {
  "小紫老師": "/image/purple.jpg",
  "明德老師": "/image/mingdez.jpg",
}

const BANNERS = [
  { id: 1, img: "/image/banner2.png",            link: "" },
  { id: 2, img: "/image/banner1.png",            link: "" },
  { id: 3, img: "/image/watercolor1200x400.png", link: "/m/courses/1" },
  { id: 4, img: "/image/sketch1200x400.png",     link: "/m/courses/2" },
  { id: 5, img: "/image/oilpainting1200x400.png", link: "/m/courses/3" },
]

function BannerCarousel() {
  const [idx, setIdx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function startTimer() {
    timerRef.current = setInterval(() => {
      setIdx(i => (i + 1) % BANNERS.length)
    }, 3500)
  }

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  function go(n: number) {
    if (timerRef.current) clearInterval(timerRef.current)
    setIdx((idx + n + BANNERS.length) % BANNERS.length)
    startTimer()
  }

  return (
    <div className="mx-4 mt-4 rounded-2xl overflow-hidden relative">
      {/* Slides */}
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {BANNERS.map(b => (
          <Link key={b.id} href={b.link} className="shrink-0 w-full">
            <img src={b.img} alt="" className="w-full aspect-[3/1] object-cover" />
          </Link>
        ))}
      </div>

      {/* Tap zones */}
      <button onClick={() => go(-1)} className="absolute left-0 top-0 h-full w-1/4" />
      <button onClick={() => go(1)}  className="absolute right-0 top-0 h-full w-1/4" />

      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {BANNERS.map((_, i) => (
          <button key={i} onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setIdx(i); startTimer() }}
            className={`rounded-full transition-all duration-300 ${i === idx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  )
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

      <BannerCarousel />

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
