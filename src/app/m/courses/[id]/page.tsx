'use client'

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, Clock, MapPin, Users, CheckCircle2 } from "lucide-react"
import { getCourse } from "../../_lib/courses"

const TEACHER_PHOTOS: Record<string, string> = {
  "小紫老師": "/image/purple.jpg",
  "明德老師": "/image/mingdez.jpg",
}

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const course = getCourse(Number(id))

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6">
        <p className="text-[#aaa] text-sm">找不到課程</p>
        <Link href="/m/courses" className="text-xs underline underline-offset-2">返回課程列表</Link>
      </div>
    )
  }

  const almostFull = course.spots <= 3

  return (
    <div className="min-h-screen bg-[#fafaf9] pb-40">
      {/* Header image area */}
      <div className="relative">
        {course.imgLandscape
          ? <img src={course.imgLandscape} alt={course.title} className="w-full h-56 object-contain object-bottom bg-[#f7f5f2]" />
          : <div className="w-full h-56 bg-[#e8e8e8]" />
        }
        <Link
          href="/m/courses"
          className="absolute top-12 left-4 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm"
        >
          <ArrowLeft size={16} />
        </Link>
      </div>

      {/* Content */}
      <div className="px-5 pt-5">
        {/* Title block */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="text-[10px] text-[#aaa] uppercase tracking-widest">{course.category}</span>
            <h1 className="text-xl font-medium mt-0.5">{course.title}</h1>
          </div>
          <span className="text-[11px] bg-[#f5f5f5] text-[#666] px-2 py-1 rounded shrink-0 mt-1">
            {course.age}
          </span>
        </div>

        {/* Two info cards */}
        <div className="flex gap-3 mb-4">
          {/* 課程資訊 */}
          <div className="flex-1 bg-white rounded-2xl border border-[#f0f0f0] p-4 flex flex-col gap-3">
            <p className="text-[10px] text-[#aaa] uppercase tracking-widest">課程資訊</p>
            <div className="flex items-start gap-2">
              <Clock size={13} className="text-[#bbb] shrink-0 mt-0.5" />
              <p className="text-xs text-[#555] leading-snug">{course.date}<br />{course.time}</p>
            </div>
            <div className="flex items-start gap-2">
              <MapPin size={13} className="text-[#bbb] shrink-0 mt-0.5" />
              <p className="text-xs text-[#555]">{course.studio}</p>
            </div>
            <div className="flex items-start gap-2">
              <Users size={13} className="text-[#bbb] shrink-0 mt-0.5" />
              <p className="text-xs">
                剩餘 <span className={`font-medium ${almostFull ? "text-red-500" : "text-black"}`}>{course.spots}</span> 個名額
              </p>
            </div>
          </div>

          {/* 授課老師 */}
          <div className="flex-1 bg-white rounded-2xl border border-[#f0f0f0] p-4 flex flex-col gap-3">
            <p className="text-[10px] text-[#aaa] uppercase tracking-widest">授課老師</p>
            <div className="overflow-x-auto no-scrollbar -mx-1">
              <div className="flex gap-3 px-1">
                {course.teacher.split("、").map(t => (
                  <div key={t} className="flex flex-col items-center gap-1.5 shrink-0 w-14">
                    {TEACHER_PHOTOS[t]
                      ? <img src={TEACHER_PHOTOS[t]} alt={t} className="w-10 h-10 rounded-full object-cover" />
                      : <div className="w-10 h-10 bg-[#f2f2f2] rounded-full flex items-center justify-center text-xs text-[#999]">{t.slice(0, 1)}</div>
                    }
                    <p className="text-[11px] text-[#555] text-center leading-tight w-full truncate">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-2">課程介紹</p>
          <p className="text-sm text-[#555] leading-relaxed">{course.desc}</p>
        </div>

        {/* Highlights */}
        <div className="mb-4">
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-2">課程重點</p>
          <div className="flex flex-col gap-2">
            {course.highlights.map(h => (
              <div key={h} className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-black shrink-0" />
                <p className="text-sm">{h}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-[#ebebeb] px-5 py-4">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <div>
            <p className="text-[10px] text-[#aaa]">每堂課程</p>
            <p className="text-lg font-medium">NT$ {course.price.toLocaleString()}</p>
          </div>
          <Link
            href="/m/login"
            className="flex-1 py-3 bg-black text-white text-sm font-medium rounded-xl text-center hover:bg-[#222] transition-colors"
          >
            登入以報名
          </Link>
        </div>
      </div>
    </div>
  )
}
