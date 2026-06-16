'use client'

import { use, useState } from "react"
import Link from "next/link"
import { ChevronLeft, Star, Play, Lock, ExternalLink } from "lucide-react"
import { ONLINE_COURSES } from "../../_lib/online-courses"

export default function OnlineCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const course = ONLINE_COURSES.find(c => c.id === Number(id))
  const [activeTab, setActiveTab] = useState<"intro" | "review">("intro")

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#ccc]">課程不存在</div>
    )
  }

  const recommended = ONLINE_COURSES.filter(c => course.recommendedIds.includes(c.id))
  const sortedSections = [...course.sections].sort((a, b) => a.sort - b.sort)

  return (
    <div className="min-h-screen bg-[#fafaf9] pb-24">
      {/* Hero */}
      <div className="relative aspect-[16/9] bg-gradient-to-br from-[#1a1a2e] to-[#16213e] overflow-hidden">
        {course.coverUrl && <img src={course.coverUrl} alt="" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-black/40" />

        {/* Back */}
        <Link href="/m/online-courses"
          className="absolute top-4 left-4 w-8 h-8 bg-black/40 backdrop-blur rounded-full flex items-center justify-center text-white">
          <ChevronLeft size={18} />
        </Link>

        {/* Play */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-full flex items-center justify-center border border-white/30">
            <Play size={24} className="text-white fill-white ml-1" />
          </div>
        </div>

        {/* Watch platform */}
        <a href={sortedSections[0]?.videoUrl ?? "#"} target="_blank" rel="noopener noreferrer"
          className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-black/50 backdrop-blur rounded-xl text-white text-xs">
          <ExternalLink size={12} />觀看平台
        </a>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#f0f0f0] bg-white px-4">
        {(["intro", "review"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t ? "border-black text-black" : "border-transparent text-[#999]"
            }`}>
            {t === "intro" ? "簡介" : "評價"}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 flex flex-col gap-6">
        {activeTab === "intro" ? (
          <>
            {/* Meta */}
            <div>
              <h1 className="text-base font-semibold leading-snug mb-1.5">{course.title}</h1>
              <div className="flex items-center gap-2 text-xs text-[#999]">
                <span className="flex items-center gap-0.5">
                  <Star size={11} className="fill-yellow-400 text-yellow-400" />
                  {course.rating.toFixed(1)}分
                </span>
                <span>·</span>
                <span>{course.publishDate} 上線</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-[#555] leading-relaxed">{course.desc}</p>

            {/* Table of contents */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium">目錄</h2>
                <span className="text-xs text-[#999]">共 {sortedSections.length} 節</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                {sortedSections.map((s, i) => {
                  const isHighlight = i === 0 && s.freePreview
                  return (
                    <div key={s.id}
                      className={`shrink-0 w-36 rounded-xl border p-3 flex flex-col gap-2 ${
                        isHighlight ? "bg-black text-white border-black" : "bg-white border-[#f0f0f0]"
                      }`}>
                      <p className={`text-xs font-medium leading-snug line-clamp-2 ${isHighlight ? "text-white" : "text-[#333]"}`}>
                        {s.title || `第 ${i + 1} 節`}
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className={`text-[10px] ${isHighlight ? "text-white/70" : "text-[#999]"}`}>{s.label}</span>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isHighlight ? "bg-white/20" : "bg-[#f5f5f5]"}`}>
                          {s.freePreview
                            ? <Play size={10} className={isHighlight ? "text-white fill-white ml-px" : "text-[#333] fill-[#333] ml-px"} />
                            : <Lock size={10} className="text-[#aaa]" />
                          }
                        </div>
                      </div>
                      {s.freePreview && !isHighlight && (
                        <span className="text-[9px] text-[#2e7d32] bg-[#e8f5e9] px-1.5 py-0.5 rounded-full w-fit">免費可看</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recommended */}
            {recommended.length > 0 && (
              <div>
                <h2 className="text-sm font-medium mb-3">推薦課程</h2>
                <div className="bg-white rounded-2xl border border-[#f0f0f0] overflow-hidden divide-y divide-[#f5f5f5]">
                  {recommended.map(c => (
                    <Link key={c.id} href={`/m/online-courses/${c.id}`}>
                      <div className="flex gap-3 p-3.5 active:bg-[#fafaf9] transition-colors">
                        <div className="w-14 h-10 rounded-lg bg-gradient-to-br from-[#1a1a2e] to-[#16213e] shrink-0 flex items-center justify-center overflow-hidden">
                          {c.coverUrl
                            ? <img src={c.coverUrl} alt="" className="w-full h-full object-cover" />
                            : <span className="text-white/30 text-sm">▶</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug line-clamp-2 mb-0.5">{c.title}</p>
                          <p className="text-[11px] text-[#999] line-clamp-1 mb-1">{c.subtitle}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            c.type === "免費課程" ? "bg-[#e8f5e9] text-[#2e7d32]" : "bg-[#e8eaf6] text-[#3949ab]"
                          }`}>{c.type}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-sm text-[#ccc]">尚無評價</div>
        )}
      </div>
    </div>
  )
}
