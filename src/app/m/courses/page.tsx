'use client'

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { fetchMemberCourses, type MemberCourse } from "../_lib/coursesDb"
import { CATEGORIES } from "../_lib/courses"

export default function CoursesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [activeCategory, setActiveCategory] = useState("全部")
  const [courses, setCourses] = useState<MemberCourse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMemberCourses(supabase).then(list => {
      setCourses(list)
      setLoading(false)
    })
  }, [supabase])

  const filtered = activeCategory === "全部"
    ? courses
    : courses.filter(c => c.category === activeCategory)

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
        {loading && (
          <p className="text-sm text-[#ccc] py-8 text-center">載入中…</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-[#ccc] py-8 text-center">此分類暫無課程</p>
        )}
        {filtered.map((course) => (
          <Link
            key={course.id}
            href={`/m/courses/${course.id}`}
            className="bg-white rounded-xl overflow-hidden border border-[#f0f0f0] active:bg-[#fafaf9] transition-colors"
          >
            {course.imgLandscape
              ? <img src={course.imgLandscape} alt={course.title} className="w-full aspect-[3/1] object-cover" />
              : <div className="w-full aspect-[3/1] bg-[#f2f2f2]" />
            }
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className="text-sm font-medium">{course.title}</h3>
                {course.age && (
                  <span className="text-[10px] bg-[#f5f5f5] text-[#666] px-2 py-0.5 rounded shrink-0">
                    {course.age}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex -space-x-1.5">
                  {course.teachers.map(t => (
                    t.photo
                      ? <img key={t.name} src={t.photo} alt={t.name} className="w-5 h-5 rounded-full object-cover ring-1 ring-white" />
                      : <div key={t.name} className="w-5 h-5 rounded-full bg-[#e8e8e8] ring-1 ring-white flex items-center justify-center text-[8px] text-[#999]">{t.name.slice(0,1)}</div>
                  ))}
                </div>
                <p className="text-xs text-[#999]">{course.teachers.map(t => t.name).join("、")} · {course.date} {course.time}</p>
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
