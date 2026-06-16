'use client'

import { use, useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ChevronLeft, Star, Play, Lock } from "lucide-react"
import { ONLINE_COURSES, type Section } from "../../_lib/online-courses"

function ytId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v")
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0]
  } catch {}
  return url.match(/[?&]v=([^&\s]+)/)?.[1] ?? null
}

// Load YouTube IFrame API once
function useYTApiReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    if ((window as any).YT?.Player) { setReady(true); return }
    const tag = document.createElement("script")
    tag.src = "https://www.youtube.com/iframe_api"
    document.head.appendChild(tag)
    ;(window as any).onYouTubeIframeAPIReady = () => setReady(true)
  }, [])
  return ready
}

function YouTubeEmbed({ videoId }: { videoId: string }) {
  const apiReady = useYTApiReady()
  const playerRef = useRef<any>(null)
  const [hasStarted, setHasStarted] = useState(false)
  const playerId = `yt-player-${videoId}`

  useEffect(() => {
    if (!apiReady) return
    playerRef.current = new (window as any).YT.Player(playerId, {
      videoId,
      playerVars: {
        rel: 0,
        playsinline: 1,
        modestbranding: 1,
        iv_load_policy: 3,   // disable annotations
        controls: 1,
        fs: 0,               // disable fullscreen button in player
        host: "https://www.youtube-nocookie.com",
      },
      events: {
        onReady: (e: any) => {
          const iframe = e.target.getIframe()
          // Remove clipboard-write / picture-in-picture / web-share
          iframe.setAttribute("allow", "accelerometer; autoplay; encrypted-media; gyroscope")
          // Remove fullscreen permission at browser level
          iframe.removeAttribute("allowfullscreen")
          iframe.removeAttribute("allowFullScreen")
        },
        onStateChange: (e: any) => {
          if (e.data === 1) setHasStarted(true)   // YT.PlayerState.PLAYING
        },
      },
    })
    return () => { playerRef.current?.destroy?.() }
  }, [apiReady, videoId])

  return (
    <div className="relative w-full bg-black" style={{ paddingBottom: "56.25%" }}
         onContextMenu={e => e.preventDefault()}>

      {/* YouTube API mounts the iframe here */}
      <div id={playerId} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/*
        BEFORE first play:
          Full-size overlay — blocks the "Watch on YouTube" center button and title link.
          Clicking anywhere starts the video via IFrame API.

        AFTER first play:
          Only a thin top-bar overlay — blocks the YouTube title link (appears on hover).
          The bottom controls (timeline, speed, volume) are fully accessible.
      */}
      {!hasStarted ? (
        <>
          {/* Full overlay before play */}
          <div
            className="absolute inset-0 z-10 cursor-pointer"
            style={{ touchAction: "none" }}
            onClick={() => playerRef.current?.playVideo()}
            onContextMenu={e => e.preventDefault()}
          />
          {/* Custom play button */}
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
              <Play size={24} className="text-white fill-white ml-1" />
            </div>
          </div>
        </>
      ) : (
        /* After play: only block the YouTube title bar at the top */
        <div
          className="absolute top-0 left-0 right-0 z-10"
          style={{ height: 48, touchAction: "none" }}
          onContextMenu={e => e.preventDefault()}
        />
      )}
    </div>
  )
}

export default function OnlineCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const course = ONLINE_COURSES.find(c => c.id === Number(id))
  const [activeTab, setActiveTab] = useState<"intro" | "review">("intro")
  const [activeSection, setActiveSection] = useState(0)

  if (!course) {
    return <div className="min-h-screen flex items-center justify-center text-[#ccc]">課程不存在</div>
  }

  const recommended = ONLINE_COURSES.filter(c => course.recommendedIds.includes(c.id))
  const sortedSections = [...course.sections].sort((a, b) => a.sort - b.sort)
  const currentSection: Section | undefined = sortedSections[activeSection]
  const currentVideoId = currentSection ? ytId(currentSection.videoUrl) : null

  return (
    <div className="min-h-screen bg-[#fafaf9] pb-24">
      {/* Video player */}
      <div className="relative bg-black">
        {/* Back button — floats above the player */}
        <Link href="/m/online-courses"
          className="absolute top-4 left-4 z-20 w-8 h-8 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white">
          <ChevronLeft size={18} />
        </Link>

        {currentVideoId
          ? <YouTubeEmbed videoId={currentVideoId} />
          : (
            /* Fallback placeholder when no valid YouTube ID */
            <div className="aspect-video bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
              <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center">
                <Play size={24} className="text-white fill-white ml-1" />
              </div>
            </div>
          )
        }
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

            {/* Table of contents — clicking switches the video above */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium">目錄</h2>
                <span className="text-xs text-[#999]">共 {sortedSections.length} 節</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                {sortedSections.map((s, i) => {
                  const isActive = i === activeSection
                  const canPlay = s.freePreview
                  return (
                    <button key={s.id} type="button"
                      onClick={() => canPlay && setActiveSection(i)}
                      className={`shrink-0 w-36 rounded-xl border p-3 flex flex-col gap-2 text-left transition-colors ${
                        isActive
                          ? "bg-black text-white border-black"
                          : canPlay
                            ? "bg-white border-[#f0f0f0] active:bg-[#f9f9f9]"
                            : "bg-white border-[#f0f0f0] opacity-60 cursor-default"
                      }`}>
                      <p className={`text-xs font-medium leading-snug line-clamp-2 ${isActive ? "text-white" : "text-[#333]"}`}>
                        {s.title || `第 ${i + 1} 節`}
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className={`text-[10px] ${isActive ? "text-white/70" : "text-[#999]"}`}>{s.label}</span>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isActive ? "bg-white/20" : "bg-[#f5f5f5]"}`}>
                          {canPlay
                            ? <Play size={10} className={isActive ? "text-white fill-white ml-px" : "text-[#333] fill-[#333] ml-px"} />
                            : <Lock size={10} className="text-[#aaa]" />
                          }
                        </div>
                      </div>
                      {canPlay && !isActive && (
                        <span className="text-[9px] text-[#2e7d32] bg-[#e8f5e9] px-1.5 py-0.5 rounded-full w-fit">免費可看</span>
                      )}
                    </button>
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
