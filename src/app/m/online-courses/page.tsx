'use client'

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Search, Bell, Star, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { fetchOnlineCourses, ONLINE_CATEGORIES, type OnlineCourseData } from "@/lib/onlineCoursesDb"

const CATEGORIES = ["全部", ...ONLINE_CATEGORIES]

const CATEGORY_ICONS: Record<string, string> = {
  "AI諮詢":  "🤖",
  "直播營銷": "📡",
  "創造力":  "✨",
  "實體零售": "🏪",
}

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      <Star size={10} className="fill-yellow-400 text-yellow-400" />
      <span className="text-[11px] text-[#666]">{value.toFixed(1)}</span>
    </span>
  )
}

export default function OnlineCoursesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [courses, setCourses] = useState<OnlineCourseData[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("全部")

  useEffect(() => {
    fetchOnlineCourses(supabase, { publishedOnly: true }).then(list => {
      setCourses(list)
      setLoading(false)
    })
  }, [supabase])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return courses.filter(c => {
      const matchQ = !q || c.title.toLowerCase().includes(q) || c.subtitle.includes(q)
      const matchCat = activeCategory === "全部" || c.categories.includes(activeCategory)
      return matchQ && matchCat
    })
  }, [courses, query, activeCategory])

  const freeCourses = filtered.filter(c => c.type === "免費課程")
  const seriesCourses = filtered.filter(c => c.type === "系列課")

  return (
    <div className="min-h-screen bg-[#fafaf9] pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-[#fafaf9]/95 backdrop-blur px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="搜尋你感興趣的課程"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black transition-colors" />
          </div>
          <button className="relative p-2.5 bg-white border border-[#f0f0f0] rounded-xl text-[#666]">
            <Bell size={16} />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-medium">1</span>
          </button>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap shrink-0 border transition-colors ${
                activeCategory === cat
                  ? "bg-black text-white border-black"
                  : "bg-white text-[#555] border-[#f0f0f0]"
              }`}>
              {cat !== "全部" && <span>{CATEGORY_ICONS[cat]}</span>}
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 flex flex-col gap-6 mt-2">
        {/* Free courses */}
        {freeCourses.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium">免費課程</h2>
              <span className="text-xs text-[#999]">{freeCourses.length} 門</span>
            </div>
            <div className="flex flex-col gap-3">
              {freeCourses.map(c => (
                <Link key={c.id} href={`/m/online-courses/${c.id}`}>
                  <div className="bg-white rounded-2xl border border-[#f0f0f0] overflow-hidden active:scale-[0.98] transition-transform">
                    {/* Cover */}
                    <div className="aspect-[3/1] bg-gradient-to-br from-[#1a1a2e] to-[#16213e] relative overflow-hidden">
                      {c.coverUrl
                        ? <img src={c.coverUrl} alt="" className="w-full h-full object-cover" />
                        : <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                              <span className="text-2xl">▶</span>
                            </div>
                          </div>
                      }
                    </div>
                    <div className="p-3.5">
                      <p className="text-sm font-medium leading-snug line-clamp-2 mb-1">{c.title}</p>
                      <p className="text-xs text-[#999] line-clamp-1 mb-2">{c.subtitle}</p>
                      <div className="flex items-center justify-between">
                        <StarRating value={c.rating} />
                        <span className="text-[11px] px-2 py-0.5 bg-[#e8f5e9] text-[#2e7d32] rounded-full">免費</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Series courses */}
        {seriesCourses.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium">系列課</h2>
              <span className="text-xs text-[#999]">{seriesCourses.length} 門</span>
            </div>
            <div className="flex flex-col gap-0 bg-white rounded-2xl border border-[#f0f0f0] overflow-hidden divide-y divide-[#f5f5f5]">
              {seriesCourses.map(c => (
                <Link key={c.id} href={`/m/online-courses/${c.id}`}>
                  <div className="flex gap-3 p-3.5 active:bg-[#fafaf9] transition-colors">
                    {/* Thumbnail */}
                    <div className="w-20 h-14 rounded-xl bg-gradient-to-br from-[#1a1a2e] to-[#16213e] shrink-0 overflow-hidden flex items-center justify-center">
                      {c.coverUrl
                        ? <img src={c.coverUrl} alt="" className="w-full h-full object-cover" />
                        : <span className="text-white/30 text-lg">▶</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug line-clamp-2 mb-0.5">{c.title}</p>
                      <p className="text-[11px] text-[#999] line-clamp-1 mb-1.5">{c.subtitle}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#aaa]">{c.sections.length} 節</span>
                        <span className="text-[11px] px-1.5 py-0.5 bg-[#e8f5e9] text-[#2e7d32] rounded-full">
                          {c.price === 0 ? "免費" : `NT$ ${c.price.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-[#ccc] shrink-0 self-center" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {loading && (
          <div className="text-center py-16 text-[#ccc] text-sm">載入中…</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-[#ccc] text-sm">找不到相關課程</div>
        )}
      </div>
    </div>
  )
}
