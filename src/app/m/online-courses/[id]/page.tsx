'use client'

import { use, useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ChevronLeft, Star, Play, Pause, Lock, Maximize2, Minimize2 } from "lucide-react"
import { ONLINE_COURSES, type Section } from "../../_lib/online-courses"

function ytId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v")
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0]
  } catch {}
  return url.match(/[?&]v=([^&\s]+)/)?.[1] ?? null
}

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

function fmt(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`
}

function YouTubeEmbed({ videoId }: { videoId: string }) {
  const apiReady = useYTApiReady()
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const playerId = `yt-${videoId}`

  // Track fullscreen state
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  function toggleFullscreen() {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    if (!apiReady) return
    const p = new (window as any).YT.Player(playerId, {
      videoId,
      playerVars: {
        rel: 0,
        playsinline: 1,
        modestbranding: 1,
        iv_load_policy: 3,
        controls: 0,          // hide ALL YouTube native controls (logo included)
        fs: 0,
        disablekb: 1,
        host: "https://www.youtube-nocookie.com",
      },
      events: {
        onReady: (e: any) => {
          const iframe = e.target.getIframe()
          iframe.setAttribute("allow", "accelerometer; autoplay; encrypted-media; gyroscope")
          iframe.removeAttribute("allowfullscreen")
          iframe.removeAttribute("allowFullScreen")
          setDuration(e.target.getDuration())
        },
        onStateChange: (e: any) => {
          const isPlaying = e.data === 1
          setPlaying(isPlaying)
          if (isPlaying) { setStarted(true); setDuration(e.target.getDuration()) }
        },
      },
    })
    playerRef.current = p
    return () => { clearInterval(tickRef.current); p.destroy?.() }
  }, [apiReady, videoId])

  // Poll current time while playing
  useEffect(() => {
    if (playing) {
      tickRef.current = setInterval(() => {
        setCurrent(playerRef.current?.getCurrentTime?.() ?? 0)
      }, 500)
    } else {
      clearInterval(tickRef.current)
    }
    return () => clearInterval(tickRef.current)
  }, [playing])

  function togglePlay() {
    playing ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo()
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const t = (Number(e.target.value) / 100) * duration
    playerRef.current?.seekTo(t, true)
    setCurrent(t)
  }

  function setRate(r: number) {
    playerRef.current?.setPlaybackRate(r)
    setSpeed(r)
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0

  return (
    <div ref={containerRef} className="relative w-full bg-black select-none" style={{ paddingBottom: "56.25%" }}
         onContextMenu={e => e.preventDefault()}>

      {/* YouTube mounts iframe here */}
      <div id={playerId} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Full overlay — blocks ALL YouTube UI (title, logo, end cards) */}
      <div className="absolute inset-0 z-10" style={{ touchAction: "none" }}
           onContextMenu={e => e.preventDefault()} />

      {/* Our custom player UI (z-20, above overlay) */}
      <div className="absolute inset-0 z-20 flex flex-col">

        {/* Center area — click to toggle play/pause */}
        <div className="flex-1 flex items-center justify-center cursor-pointer" onClick={togglePlay}>
          {!playing && (
            <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
              <Play size={24} className="text-white fill-white ml-1" />
            </div>
          )}
        </div>

        {/* Control bar (shows after first play) */}
        {started && (
          <div className="bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-3">
            {/* Seek bar */}
            <input
              type="range" min="0" max="100" step="0.1"
              value={pct}
              onChange={seek}
              onClick={e => e.stopPropagation()}
              className="w-full mb-2 cursor-pointer accent-white"
              style={{ height: 3 }}
            />
            <div className="flex items-center gap-3 text-white">
              {/* Play / Pause */}
              <button onClick={e => { e.stopPropagation(); togglePlay() }} className="shrink-0">
                {playing
                  ? <Pause size={16} className="fill-white text-white" />
                  : <Play  size={16} className="fill-white text-white ml-px" />
                }
              </button>

              {/* Time */}
              <span className="text-xs tabular-nums text-white/80">
                {fmt(current)} / {fmt(duration)}
              </span>

              {/* Speed + fullscreen — right side */}
              <div className="ml-auto flex items-center gap-1">
                {[0.5, 1, 1.5, 2].map(r => (
                  <button key={r}
                    onClick={e => { e.stopPropagation(); setRate(r) }}
                    className={`px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                      speed === r ? "bg-white text-black font-medium" : "text-white/60 hover:text-white"
                    }`}>
                    {r}x
                  </button>
                ))}
                <button onClick={e => { e.stopPropagation(); toggleFullscreen() }}
                  className="ml-1 text-white/70 hover:text-white transition-colors">
                  {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
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
      <div className="relative bg-black">
        <Link href="/m/online-courses"
          className="absolute top-4 left-4 z-30 w-8 h-8 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white">
          <ChevronLeft size={18} />
        </Link>

        {currentVideoId
          ? <YouTubeEmbed videoId={currentVideoId} />
          : (
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

            <p className="text-sm text-[#555] leading-relaxed">{course.desc}</p>

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
                        isActive ? "bg-black text-white border-black"
                          : canPlay ? "bg-white border-[#f0f0f0] active:bg-[#f9f9f9]"
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

            {recommended.length > 0 && (
              <div>
                <h2 className="text-sm font-medium mb-3">推薦課程</h2>
                <div className="bg-white rounded-2xl border border-[#f0f0f0] overflow-hidden divide-y divide-[#f5f5f5]">
                  {recommended.map(c => (
                    <Link key={c.id} href={`/m/online-courses/${c.id}`}>
                      <div className="flex gap-3 p-3.5 active:bg-[#fafaf9] transition-colors">
                        <div className="w-14 h-10 rounded-lg bg-gradient-to-br from-[#1a1a2e] to-[#16213e] shrink-0 flex items-center justify-center overflow-hidden">
                          {c.coverUrl ? <img src={c.coverUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-white/30 text-sm">▶</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug line-clamp-2 mb-0.5">{c.title}</p>
                          <p className="text-[11px] text-[#999] line-clamp-1 mb-1">{c.subtitle}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.type === "免費課程" ? "bg-[#e8f5e9] text-[#2e7d32]" : "bg-[#e8eaf6] text-[#3949ab]"}`}>{c.type}</span>
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
