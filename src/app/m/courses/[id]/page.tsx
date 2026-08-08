'use client'

import { use, useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, MapPin, Users, CheckCircle2, X, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { fetchMemberCourse, type MemberCourse } from "../../_lib/coursesDb"

type SessionOpt = { date: string; time: string; remaining: number }
type EligibleTicket = { id: string; no: string; item: string; holder: string; expires: string | null }
type SingleProduct = { id: string; name: string; price: number }
type Attendee = { id: string | null; name: string }

function fmtDate(d: string) {
  const [y, m, dd] = d.split("-")
  const wd = "日一二三四五六"[new Date(`${d}T12:00:00`).getDay()]
  return `${m}/${dd}（${wd}）${y !== String(new Date().getFullYear()) ? ` ${y}` : ""}`
}

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [course, setCourse] = useState<MemberCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<{ id: string; name: string } | null>(null)

  const [step, setStep] = useState<"view" | "confirm" | "done">("view")
  const [submitting, setSubmitting] = useState(false)
  const [payMode, setPayMode] = useState<"direct" | "ticket">("direct")
  const [payMethod, setPayMethod] = useState("銀行轉帳")
  const [payMethods, setPayMethods] = useState<string[]>(["銀行轉帳", "現金"])

  const [sessions, setSessions] = useState<SessionOpt[]>([])
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [eligible, setEligible] = useState<EligibleTicket[]>([])
  const [singles, setSingles] = useState<SingleProduct[]>([])
  const [singleId, setSingleId] = useState<string>("")
  const [attendees, setAttendees] = useState<Attendee[]>([{ id: null, name: "本人" }])
  const [attendeeId, setAttendeeId] = useState<string | null>(null)
  const [doneMode, setDoneMode] = useState<"ticket" | "direct">("direct")
  const [myBooked, setMyBooked] = useState<Set<string>>(new Set())

  useEffect(() => {
    (async () => {
      const [c, sessRes, publicParams, userRes] = await Promise.all([
        fetchMemberCourse(supabase, id),
        fetch(`/api/course-sessions?courseId=${id}`).then(r => r.json()).catch(() => null),
        fetch("/api/public-params").then(r => r.json()).catch(() => null),
        supabase.auth.getUser(),
      ])
      setCourse(c)
      setSessions((sessRes?.sessions ?? []) as SessionOpt[])
      if (publicParams?.payMethods?.length > 0) {
        setPayMethods(publicParams.payMethods)
        setPayMethod(publicParams.payMethods[0])
      }

      // 直購計價商品：課程允許清單中的「單堂」商品
      if (c && c.ticketTypes.length > 0) {
        const { data: prods } = await supabase
          .from("products")
          .select("id, name, price, is_single")
          .in("id", c.ticketTypes)
          .eq("is_single", true)
          .eq("active", true)
        const list = ((prods ?? []) as { id: string; name: string; price: number }[])
          .map(p => ({ id: p.id, name: p.name, price: p.price }))
        setSingles(list)
        if (list.length > 0) setSingleId(list[0].id)
      }

      const user = userRes.data.user
      if (user && c) {
        const [{ data: profile }, { data: paidOrders }, { data: students }, { data: mine }] = await Promise.all([
          supabase.from("profiles").select("id, name, role").eq("id", user.id).maybeSingle(),
          // 已售後訂單中未被收回的券仍可使用——可用性看券本身狀態
          supabase.from("orders")
            .select("id, product_id, item_name, status, student:students!student_id(name), tickets(id, ticket_no, status, expires_at, transferee:students!transferred_to(name))")
            .in("status", ["已付款", "已售後"]),
          supabase.from("students").select("id, name").eq("status", "已核准").order("created_at"),
          // 自己在這門課已預約／已上過的日期（RLS 只回自己的券）
          supabase.from("tickets").select("session_date")
            .eq("course_id", id).in("status", ["待使用", "已使用"]),
        ])
        setMyBooked(new Set(((mine ?? []) as { session_date: string | null }[])
          .map(t => t.session_date).filter(Boolean) as string[]))
        if (profile?.role === "member") {
          setMe({ id: profile.id, name: profile.name || "會員" })
          setAttendees([{ id: null, name: "本人" }, ...((students ?? []) as { id: string; name: string }[])])
        }

        // 名下可用券：未使用、未過期、券種在課程允許清單
        const today = new Date().toISOString().slice(0, 10)
        const allowed = new Set(c.ticketTypes)
        const list: EligibleTicket[] = []
        for (const o of (paidOrders ?? []) as unknown as {
          id: string; product_id: string | null; item_name: string
          student: { name: string } | null
          tickets: { id: string; ticket_no: string; status: string; expires_at: string | null; transferee: { name: string } | null }[]
        }[]) {
          if (!o.product_id || !allowed.has(o.product_id)) continue
          for (const t of o.tickets ?? []) {
            if (t.status !== "未使用") continue
            if (t.expires_at && t.expires_at < today) continue
            list.push({
              id: t.id, no: t.ticket_no, item: o.item_name,
              holder: t.transferee?.name ?? o.student?.name ?? "本人",
              expires: t.expires_at,
            })
          }
        }
        list.sort((a, b) => (a.expires ?? "9999").localeCompare(b.expires ?? "9999"))
        setEligible(list)
        if (list.length > 0) setPayMode("ticket")
      }
      setLoading(false)
    })()
  }, [supabase, id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#ccc] text-sm">載入中…</p>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6">
        <p className="text-[#aaa] text-sm">找不到課程</p>
        <Link href="/m/courses" className="text-xs underline underline-offset-2">返回課程列表</Link>
      </div>
    )
  }

  const isInternal = course.types.includes("內部")
  const singleProduct = singles.find(s => s.id === singleId) ?? singles[0]
  const unitPrice = singleProduct?.price ?? course.price
  const n = selectedDates.length
  const assignedTickets = eligible.slice(0, n)   // 效期最早的先用
  const nextSession = sessions[0]

  function toggleDate(d: string) {
    setSelectedDates(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())
  }

  function openConfirm() {
    if (!me) {
      router.push("/m/login")
      return
    }
    setSelectedDates(nextSession && nextSession.remaining > 0 ? [nextSession.date] : [])
    setStep("confirm")
  }

  async function handleConfirm() {
    if (!me || !course || submitting || n === 0) return
    if (payMode === "ticket") {
      if (eligible.length < n) return
      setSubmitting(true)
      const res = await fetch("/api/member/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          dates: selectedDates,
          ticketIds: assignedTickets.map(t => t.id),
        }),
      })
      const d = await res.json()
      setSubmitting(false)
      if (!res.ok || !d.ok) { alert(`報名失敗：${d.error ?? res.status}`); return }
      setDoneMode("ticket")
      setStep("done")
      return
    }
    // 直購：買單堂券商品 ×N，確認付款後自動發券綁定
    if (!singleProduct) { alert("此課程尚未設定單堂商品，請聯繫工作室"); return }
    setSubmitting(true)
    const { data, error } = await supabase.from("orders").insert({
      member_id: me.id,
      course_id: course.id,
      product_id: singleProduct.id,
      student_id: attendeeId,
      item_name: n > 1 ? `${course.title}（${singleProduct.name}×${n}）` : `${course.title}（${singleProduct.name}）`,
      qty: n,
      amount: unitPrice * n,
      status: "待確認",
      pay_method: payMethod,
      notes: "單堂直購",
      booking_dates: selectedDates,
    }).select("id").single()
    setSubmitting(false)
    if (error) {
      alert(`報名失敗：${error.message}`)
      return
    }
    fetch("/api/workflows/fire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "order", subtype: "created", orderId: data.id }),
    }).catch(() => {})
    setDoneMode("direct")
    setStep("done")
  }

  const canConfirm = n > 0 && (
    payMode === "ticket" ? eligible.length >= n : !!singleProduct
  )

  /* ── 成功畫面 ── */
  if (step === "done") {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center px-5 text-center">
        <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center mb-5">
          <Check size={28} className="text-white" />
        </div>
        <h2 className="text-lg font-medium mb-2">{doneMode === "ticket" ? "報名完成" : "報名申請已送出"}</h2>
        <p className="text-sm text-[#aaa] mb-1.5">{course.title}</p>
        <p className="text-xs text-[#bbb] mb-2">{selectedDates.map(fmtDate).join("、")}</p>
        <p className="text-xs text-[#bbb] mb-8">
          {doneMode === "ticket"
            ? `已使用 ${selectedDates.length} 張課堂券完成報名，上課當天點名核銷`
            : "完成繳費並經工作室確認後，將自動發券並完成報名"}
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href="/m/orders"
            className="bg-black text-white text-sm px-8 py-3 rounded-xl hover:bg-[#222] transition-colors text-center">
            查看報名紀錄
          </Link>
          <Link href="/m/courses"
            className="border border-[#e8e8e8] text-sm px-8 py-3 rounded-xl text-[#666] hover:border-[#ccc] transition-colors text-center">
            繼續瀏覽課程
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] pb-40">
      {/* Header image */}
      <div className="relative">
        {course.imgLandscape
          ? <img src={course.imgLandscape} alt={course.title} className="w-full h-56 object-contain object-bottom bg-[#f7f5f2]" />
          : <div className="w-full h-56 bg-[#e8e8e8]" />
        }
        <Link href="/m/courses"
          className="absolute top-12 left-4 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
          <ArrowLeft size={16} />
        </Link>
      </div>

      {/* Content */}
      <div className="px-5 pt-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="text-[10px] text-[#aaa] uppercase tracking-widest">{course.category}</span>
            <h1 className="text-xl font-medium mt-0.5">{course.title}</h1>
          </div>
          {course.age && (
            <span className="text-[11px] bg-[#f5f5f5] text-[#666] px-2 py-1 rounded shrink-0 mt-1">{course.age}</span>
          )}
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1 bg-white rounded-2xl border border-[#f0f0f0] p-4 flex flex-col gap-3">
            <p className="text-[10px] text-[#aaa] uppercase tracking-widest">課程資訊</p>
            <div className="flex items-start gap-2">
              <Clock size={13} className="text-[#bbb] shrink-0 mt-0.5" />
              <p className="text-xs text-[#555] leading-snug">{course.date}<br />{course.time}</p>
            </div>
            <div className="flex items-start gap-2">
              <MapPin size={13} className="text-[#bbb] shrink-0 mt-0.5" />
              <p className="text-xs text-[#555]">{course.studio || "—"}</p>
            </div>
            {isInternal && nextSession && (
              <div className="flex items-start gap-2">
                <Users size={13} className="text-[#bbb] shrink-0 mt-0.5" />
                <p className="text-xs">
                  最近一堂（{fmtDate(nextSession.date)}）剩
                  <span className={`font-medium ${nextSession.remaining <= 3 ? "text-red-500" : "text-black"}`}> {nextSession.remaining} </span>位
                </p>
              </div>
            )}
          </div>

          <div className="flex-1 bg-white rounded-2xl border border-[#f0f0f0] p-4 flex flex-col gap-3">
            <p className="text-[10px] text-[#aaa] uppercase tracking-widest">授課老師</p>
            <div className="overflow-x-auto no-scrollbar -mx-1">
              <div className="flex gap-3 px-1">
                {course.teachers.map(t => (
                  <div key={t.name} className="flex flex-col items-center gap-1.5 shrink-0 w-14">
                    {t.photo
                      ? <img src={t.photo} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                      : <div className="w-10 h-10 bg-[#f2f2f2] rounded-full flex items-center justify-center text-xs text-[#999]">{t.name.slice(0, 1)}</div>
                    }
                    <p className="text-[11px] text-[#555] text-center leading-tight w-full truncate">{t.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-2">課程介紹</p>
          <p className="text-sm text-[#555] leading-relaxed">{course.desc}</p>
        </div>

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

      {/* Bottom CTA（內部課程才開放線上報名） */}
      {isInternal && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-[#ebebeb] px-5 py-4">
          <div className="max-w-md mx-auto flex items-center gap-4">
            <div>
              <p className="text-[10px] text-[#aaa]">單堂</p>
              <p className="text-lg font-medium">NT$ {unitPrice.toLocaleString()}</p>
              {eligible.length > 0 && (
                <p className="text-[10px] text-green-600 mt-0.5">課堂券 {eligible.length} 張可用</p>
              )}
            </div>
            <button
              onClick={openConfirm}
              disabled={sessions.length === 0}
              className="flex-1 py-3 bg-black text-white text-sm font-medium rounded-xl hover:bg-[#222] disabled:opacity-40 transition-colors"
            >
              {sessions.length === 0 ? "近期無開課場次" : me ? "選擇日期報名" : "登入後報名"}
            </button>
          </div>
        </div>
      )}

      {/* ── 報名 Modal ── */}
      {step === "confirm" && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setStep("view")} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl">

            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h2 className="text-base font-medium">預約上課</h2>
              <button onClick={() => setStep("view")} className="text-[#bbb] hover:text-black transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 pb-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">

              {/* 場次複選 */}
              <div>
                <p className="text-xs text-[#999] mb-2">選擇上課日期（可複選）</p>
                <div className="flex flex-col gap-2">
                  {sessions.map(s => {
                    const sel = selectedDates.includes(s.date)
                    const booked = myBooked.has(s.date)
                    const full = s.remaining <= 0
                    return (
                      <button
                        key={s.date}
                        disabled={booked || (full && !sel)}
                        onClick={() => toggleDate(s.date)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
                          sel ? "border-black bg-black/5"
                            : booked ? "border-[#f0f0f0] bg-[#fafaf9] opacity-60"
                            : full ? "border-[#f0f0f0] bg-[#fafaf9] opacity-50"
                            : "border-[#f0f0f0] bg-[#fafaf9] hover:border-[#ccc]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            sel ? "bg-black border-black" : booked ? "bg-[#e8f5e9] border-[#c8e6c9]" : "border-[#ddd]"
                          }`}>
                            {sel && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                            {booked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="#2e7d32" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{fmtDate(s.date)}</p>
                            <p className="text-[11px] text-[#aaa]">{s.time}</p>
                          </div>
                        </div>
                        <span className={`text-[11px] shrink-0 ${
                          booked ? "text-[#2e7d32] font-medium" : full ? "text-red-400" : "text-[#999]"
                        }`}>
                          {booked ? "已預約" : full ? "已額滿" : `剩 ${s.remaining} 位`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 付款方式切換 */}
              <div>
                <p className="text-xs text-[#999] mb-2">報名方式</p>
                <div className="grid grid-cols-2 gap-2">
                  {eligible.length > 0 && (
                    <button
                      onClick={() => setPayMode("ticket")}
                      className={`py-2.5 text-sm rounded-xl border transition-colors ${
                        payMode === "ticket"
                          ? "bg-black text-white border-black"
                          : "bg-[#fafaf9] text-[#555] border-[#f0f0f0] hover:border-[#ccc]"
                      }`}
                    >
                      使用課堂券
                    </button>
                  )}
                  <button
                    onClick={() => setPayMode("direct")}
                    className={`py-2.5 text-sm rounded-xl border transition-colors ${
                      payMode === "direct"
                        ? "bg-black text-white border-black"
                        : "bg-[#fafaf9] text-[#555] border-[#f0f0f0] hover:border-[#ccc]"
                    } ${eligible.length === 0 ? "col-span-2" : ""}`}
                  >
                    購買單堂
                  </button>
                </div>
              </div>

              {/* 用券：自動指定效期最早的券 */}
              {payMode === "ticket" && (
                <div>
                  <p className="text-xs text-[#999] mb-2">
                    將使用 {n} 張課堂券（可用 {eligible.length} 張，效期近的優先）
                  </p>
                  {eligible.length < n && (
                    <p className="text-xs text-red-500 mb-2">可用課堂券不足，請減少堂數或改用購買單堂</p>
                  )}
                  <div className="flex flex-col gap-2">
                    {assignedTickets.map(t => (
                      <div key={t.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-[#f0f0f0] bg-[#fafaf9]">
                        <div>
                          <p className="text-sm">{t.item}</p>
                          <p className="text-[10px] text-[#aaa] font-mono mt-0.5">{t.no} · {t.holder}</p>
                        </div>
                        <p className="text-[10px] text-[#aaa] shrink-0">{t.expires ? `效期 ${t.expires.replace(/-/g, "/")}` : ""}</p>
                      </div>
                    ))}
                    {n === 0 && <p className="text-xs text-[#ccc]">請先選擇上課日期</p>}
                  </div>
                  <p className="text-[10px] text-[#bbb] mt-2">報名立即生效；上課的學員為券的持有人</p>
                </div>
              )}

              {/* 直購 */}
              {payMode === "direct" && (
                <div className="flex flex-col gap-3">
                  {singles.length > 1 && (
                    <div>
                      <p className="text-xs text-[#999] mb-2">選擇票種</p>
                      <div className="flex flex-col gap-2">
                        {singles.map(s => (
                          <button key={s.id} onClick={() => setSingleId(s.id)}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
                              singleId === s.id ? "border-black bg-black/5" : "border-[#f0f0f0] bg-[#fafaf9] hover:border-[#ccc]"
                            }`}>
                            <p className="text-sm font-medium">{s.name}</p>
                            <p className="text-sm shrink-0">NT$ {s.price.toLocaleString()}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {attendees.length > 1 && (
                    <div>
                      <p className="text-xs text-[#999] mb-2">上課學員</p>
                      <div className="grid grid-cols-3 gap-2">
                        {attendees.map(a => (
                          <button key={a.id ?? "self"} onClick={() => setAttendeeId(a.id)}
                            className={`py-2 text-sm rounded-xl border transition-colors ${
                              attendeeId === a.id
                                ? "bg-black text-white border-black"
                                : "bg-[#fafaf9] text-[#555] border-[#f0f0f0] hover:border-[#ccc]"
                            }`}>
                            {a.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-[#999] mb-2">選擇付款方式</p>
                    <div className="grid grid-cols-2 gap-2">
                      {payMethods.map((m: string) => (
                        <button key={m} onClick={() => setPayMethod(m)}
                          className={`py-2.5 text-sm rounded-xl border transition-colors ${
                            payMethod === m
                              ? "bg-black text-white border-black"
                              : "bg-[#fafaf9] text-[#555] border-[#f0f0f0] hover:border-[#ccc]"
                          }`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs font-medium text-blue-700 mb-2">付款說明</p>
                    <p className="text-xs text-blue-600 leading-relaxed">
                      送出後請以{payMethod}繳費並通知工作室；確認收款後系統自動發券並完成報名。
                    </p>
                  </div>
                </div>
              )}

              {/* 金額摘要 + Buttons */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-[#999]">
                  {n} 堂
                  {payMode === "direct" && singleProduct && (
                    <span className="text-black font-medium text-sm ml-2">NT$ {(unitPrice * n).toLocaleString()}</span>
                  )}
                  {payMode === "ticket" && <span className="text-black font-medium text-sm ml-2">使用 {n} 張券</span>}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("view")}
                  className="flex-1 py-3 text-sm border border-[#e8e8e8] rounded-xl text-[#666] hover:border-[#ccc] transition-colors">
                  取消
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!canConfirm || submitting}
                  className="flex-1 py-3 text-sm bg-black text-white rounded-xl hover:bg-[#222] disabled:opacity-40 transition-colors font-medium">
                  {submitting ? "送出中…" : payMode === "ticket" ? "確認報名" : "送出報名"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
