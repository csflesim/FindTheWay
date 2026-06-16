'use client'

import { use, useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ChevronLeft, Star, Play, Pause, Lock, Maximize2, Minimize2, RotateCcw, RotateCw } from "lucide-react"
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

function YouTubeEmbed({ videoId, coverUrl }: { videoId: string; coverUrl?: string }) {
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
  const [quality, setQuality] = useState<string>("default")
  const [availableQualities, setAvailableQualities] = useState<string[]>([])
  const [showQuality, setShowQuality] = useState(false)
  const playerId = `yt-${videoId}`

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
        controls: 0,
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
          const q: string[] = e.target.getAvailableQualityLevels?.() ?? []
          if (q.length) setAvailableQualities(q)
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

  function skipSeconds(delta: number) {
    if (!playerRef.current) return
    const t = Math.max(0, (playerRef.current.getCurrentTime() ?? 0) + delta)
    playerRef.current.seekTo(t, true)
    setCurrent(t)
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

  function changeQuality(q: string) {
    playerRef.current?.setPlaybackQuality(q)
    setQuality(q)
    setShowQuality(false)
  }

  const QUALITY_LABEL: Record<string, string> = {
    highres: "4K", hd1080: "1080p", hd720: "720p",
    large: "480p", medium: "360p", small: "240p", default: "自動",
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0

  return (
    <div ref={containerRef} className="relative w-full bg-black select-none" style={{ paddingBottom: "56.25%" }}
         onContextMenu={e => e.preventDefault()}>

      {/* YouTube iframe */}
      <div id={playerId} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Transparent click blocker — keeps all YouTube UI unclickable */}
      <div className="absolute inset-0 z-10" style={{ touchAction: "none" }}
           onContextMenu={e => e.preventDefault()} />

      {/* Custom UI layer */}
      <div
        className={`absolute inset-0 z-20 transition-colors ${started && !playing ? "bg-black" : ""}`}
        onClick={togglePlay}
      >
        {/* Cover image — shown before first play */}
        {!started && coverUrl && (
          <div className="absolute inset-0">
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Center controls — shown when paused */}
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-10">
              {started && (
                <button onClick={() => skipSeconds(-10)}
                  className="flex flex-col items-center gap-1 text-white/80 active:text-white transition-colors">
                  <RotateCcw size={22} />
                  <span className="text-[10px]">10</span>
                </button>
              )}

              <button onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-white/20 backdrop-blur border border-white/20 flex items-center justify-center active:bg-white/30 transition-colors">
                <Play size={26} className="text-white fill-white ml-1" />
              </button>

              {started && (
                <button onClick={() => skipSeconds(10)}
                  className="flex flex-col items-center gap-1 text-white/80 active:text-white transition-colors">
                  <RotateCw size={22} />
                  <span className="text-[10px]">10</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bottom control bar — shown after first play */}
        {started && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-3"
               onClick={e => e.stopPropagation()}>
            <input
              type="range" min="0" max="100" step="0.1"
              value={pct}
              onChange={seek}
              className="w-full mb-2 cursor-pointer accent-white"
              style={{ height: 3 }}
            />
            <div className="flex items-center gap-3 text-white">
              <button onClick={() => skipSeconds(-10)} className="shrink-0 text-white/80 active:text-white">
                <RotateCcw size={15} />
              </button>
              <button onClick={togglePlay} className="shrink-0">
                {playing
                  ? <Pause size={16} className="fill-white text-white" />
                  : <Play  size={16} className="fill-white text-white ml-px" />
                }
              </button>
              <button onClick={() => skipSeconds(10)} className="shrink-0 text-white/80 active:text-white">
                <RotateCw size={15} />
              </button>

              <span className="text-xs tabular-nums text-white/80">
                {fmt(current)} / {fmt(duration)}
              </span>

              <div className="ml-auto flex items-center gap-1 relative">
                {[0.5, 1, 1.5, 2].map(r => (
                  <button key={r}
                    onClick={() => setRate(r)}
                    className={`px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                      speed === r ? "bg-white text-black font-medium" : "text-white/60 hover:text-white"
                    }`}>
                    {r}x
                  </button>
                ))}

                {/* Quality picker */}
                {availableQualities.length > 0 && (
                  <div className="relative ml-1">
                    <button
                      onClick={() => setShowQuality(v => !v)}
                      className="px-1.5 py-0.5 rounded text-[11px] text-white/60 hover:text-white transition-colors">
                      {QUALITY_LABEL[quality] ?? quality}
                    </button>
                    {showQuality && (
                      <div className="absolute bottom-7 right-0 bg-black/90 border border-white/10 rounded-xl overflow-hidden min-w-[72px] z-10">
                        {["default", ...availableQualities.filter(q => q !== "default")].map(q => (
                          <button key={q} onClick={() => changeQuality(q)}
                            className={`w-full text-left px-3 py-2 text-[11px] transition-colors ${
                              quality === q ? "text-white font-medium" : "text-white/60 hover:text-white"
                            }`}>
                            {QUALITY_LABEL[q] ?? q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button onClick={toggleFullscreen}
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
          ? <YouTubeEmbed videoId={currentVideoId} coverUrl={course.coverUrl || undefined} />
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
