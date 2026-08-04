'use client'

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { fetchMemberCourses, type MemberCourse } from "./_lib/coursesDb"
import { CATEGORIES } from "./_lib/courses"

type Banner = { id: string; img: string; link: string }

function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [idx, setIdx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const count = banners.length

  function startTimer() {
    if (count <= 1) return
    timerRef.current = setInterval(() => {
      setIdx(i => (i + 1) % count)
    }, 3500)
  }

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  function go(n: number) {
    if (timerRef.current) clearInterval(timerRef.current)
    setIdx((idx + n + count) % count)
    startTimer()
  }

  if (count === 0) return null

  return (
    <div className="mx-4 mt-4 rounded-2xl overflow-hidden relative">
      {/* Slides */}
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {banners.map(b => (
          <Link key={b.id} href={b.link || "/m/courses"} className="shrink-0 w-full">
            <img src={b.img} alt="" className="w-full aspect-[3/1] object-cover" />
          </Link>
        ))}
      </div>

      {/* Tap zones */}
      <button onClick={() => go(-1)} className="absolute left-0 top-0 h-full w-1/4" />
      <button onClick={() => go(1)}  className="absolute right-0 top-0 h-full w-1/4" />

      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {banners.map((_, i) => (
          <button key={i} onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setIdx(i); startTimer() }}
            className={`rounded-full transition-all duration-300 ${i === idx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  )
}

export default function MobileHomePage() {
  const supabase = useMemo(() => createClient(), [])
  const [activeCategory, setActiveCategory] = useState("全部")
  const [courses, setCourses] = useState<MemberCourse[]>([])
  const [dbBanners, setDbBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<{ name: string; avatar: string | null } | null>(null)

  useEffect(() => {
    Promise.all([
      fetchMemberCourses(supabase),
      supabase.from("banners").select("id, image_url, link_url").eq("active", true).order("sort_order"),
      supabase.auth.getUser(),
    ]).then(async ([courseList, bannerRes, userRes]) => {
      setCourses(courseList)
      setDbBanners(((bannerRes.data ?? []) as { id: string; image_url: string; link_url: string | null }[])
        .map(b => ({ id: b.id, img: b.image_url, link: b.link_url ?? "" })))
      const user = userRes.data.user
      if (user) {
        const { data: profile } = await supabase
          .from("profiles").select("name, avatar_url").eq("id", user.id).maybeSingle()
        if (profile) setMe({ name: profile.name || "會員", avatar: profile.avatar_url })
      }
      setLoading(false)
    })
  }, [supabase])

  // 輪播：後台設定的 banner + 前三堂課的橫圖
  const banners: Banner[] = [
    ...dbBanners,
    ...courses.slice(0, 3)
      .filter(c => c.imgLandscape)
      .map(c => ({ id: `course-${c.id}`, img: c.imgLandscape!, link: `/m/courses/${c.id}` })),
  ]

  const filtered = activeCategory === "全部"
    ? courses
    : courses.filter(c => c.category === activeCategory)

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-[#ebebeb] px-5 py-4 flex items-center justify-between z-10">
        <div>
          <p className="text-[10px] text-[#aaa] tracking-widest uppercase">Find the Way</p>
          <h1 className="text-sm font-medium leading-tight">藝術工作坊</h1>
        </div>
        {me ? (
          <Link href="/m/profile" className="flex items-center gap-2">
            <span className="text-xs text-[#666]">{me.name}</span>
            {me.avatar
              ? <img src={me.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
              : <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-[11px]">{me.name.slice(0, 1)}</div>
            }
          </Link>
        ) : (
          <Link
            href="/m/login"
            className="text-xs border border-black px-3 py-1.5 rounded-full hover:bg-black hover:text-white transition-colors"
          >
            登入 / 註冊
          </Link>
        )}
      </header>

      <BannerCarousel banners={banners} />

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
          {loading && (
            <p className="text-sm text-[#ccc] py-6 text-center">載入中…</p>
          )}
          {!loading && filtered.length === 0 && (
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
                  {course.age && (
                    <span className="text-[10px] bg-[#f5f5f5] text-[#666] px-1.5 py-0.5 rounded shrink-0">
                      {course.age}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="flex -space-x-1.5">
                    {course.teachers.map(t => (
                      t.photo
                        ? <img key={t.name} src={t.photo} alt={t.name} className="w-4 h-4 rounded-full object-cover ring-1 ring-white" />
                        : <div key={t.name} className="w-4 h-4 rounded-full bg-[#e8e8e8] ring-1 ring-white flex items-center justify-center text-[7px] text-[#999]">{t.name.slice(0,1)}</div>
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
