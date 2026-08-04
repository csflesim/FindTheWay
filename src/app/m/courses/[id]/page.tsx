'use client'

import { use, useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, MapPin, Users, CheckCircle2, X, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { fetchMemberCourse, type MemberCourse } from "../../_lib/coursesDb"

type TicketOrder = {
  id: string
  orderNo: string
  item: string
  unused: number
}

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [course, setCourse] = useState<MemberCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<{ id: string; name: string } | null>(null)

  const [step, setStep]           = useState<"view" | "confirm" | "done">("view")
  const [submitting, setSubmitting] = useState(false)
  const [payMode, setPayMode]     = useState<"direct" | "ticket">("direct")
  const [payMethod, setPayMethod] = useState("銀行轉帳")
  const [payMethods, setPayMethods] = useState<string[]>(["銀行轉帳", "現金"])
  const [ticketOrders, setTicketOrders] = useState<TicketOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<string>("")

  useEffect(() => {
    Promise.all([
      fetchMemberCourse(supabase, id),
      fetch("/api/public-params").then(r => r.json()).catch(() => null),
      supabase.auth.getUser(),
    ]).then(async ([c, publicParams, userRes]) => {
      setCourse(c)
      if (publicParams?.payMethods?.length > 0) {
        setPayMethods(publicParams.payMethods)
        setPayMethod(publicParams.payMethods[0])
      }
      const user = userRes.data.user
      if (user) {
        const [{ data: profile }, { data: paidOrders }] = await Promise.all([
          supabase.from("profiles").select("id, name, role").eq("id", user.id).maybeSingle(),
          supabase.from("orders")
            .select("id, order_no, item_name, tickets(id, status)")
            .eq("status", "已付款"),
        ])
        // 前台報名僅限會員身分
        if (profile?.role === "member") setMe({ id: profile.id, name: profile.name || "會員" })
        const avail = ((paidOrders ?? []) as unknown as {
          id: string; order_no: string; item_name: string
          tickets: { id: string; status: string }[]
        }[])
          .map(o => ({
            id: o.id, orderNo: o.order_no, item: o.item_name,
            unused: o.tickets.filter(t => t.status === "未使用").length,
          }))
          .filter(o => o.unused > 0)
        setTicketOrders(avail)
        if (avail.length > 0) {
          setPayMode("ticket")
          setSelectedOrder(avail[0].id)
        }
      }
      setLoading(false)
    })
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

  function openConfirm() {
    if (!me) {
      router.push("/m/login")
      return
    }
    setStep("confirm")
  }

  async function handleConfirm() {
    if (!me || !course || submitting) return
    setSubmitting(true)
    const isTicket = payMode === "ticket" && selectedOrder
    const ticketOrder = ticketOrders.find(o => o.id === selectedOrder)
    const { data, error } = await supabase.from("orders").insert({
      member_id: me.id,
      course_id: course.id,
      item_name: course.title,
      qty: 1,
      amount: isTicket ? 0 : course.price,
      status: "待確認",
      pay_method: isTicket ? null : payMethod,
      notes: isTicket ? `課堂券扣抵（${ticketOrder?.orderNo ?? ""}）` : "單堂直購",
    }).select("id").single()
    setSubmitting(false)
    if (error) {
      alert(`報名失敗：${error.message}`)
      return
    }
    // 觸發「報名建立」工作流（不阻塞畫面）
    fetch("/api/workflows/fire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "order", subtype: "created", orderId: data.id }),
    }).catch(() => {})
    setStep("done")
  }

  const canConfirm = payMode === "direct" || (payMode === "ticket" && !!selectedOrder)
  const almostFull = course.spots <= 3
  const totalUnused = ticketOrders.reduce((sum, o) => sum + o.unused, 0)
  const teacherNames = course.teachers.map(t => t.name).join("、")

  /* ── 成功畫面 ── */
  if (step === "done") {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center px-5 text-center">
        <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center mb-5">
          <Check size={28} className="text-white" />
        </div>
        <h2 className="text-lg font-medium mb-2">報名申請已送出</h2>
        <p className="text-sm text-[#aaa] mb-1.5">{course.title}</p>
        <p className="text-xs text-[#bbb] mb-8">
          {payMode === "ticket"
            ? "已申請課堂券扣抵，等待工作室確認後完成報名"
            : "等待工作室確認付款後完成報名，請依付款說明完成繳費"}
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href="/m/orders"
            className="bg-black text-white text-sm px-8 py-3 rounded-xl hover:bg-[#222] transition-colors text-center">
            查看我的訂單
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
            <div className="flex items-start gap-2">
              <Users size={13} className="text-[#bbb] shrink-0 mt-0.5" />
              <p className="text-xs">
                剩餘 <span className={`font-medium ${almostFull ? "text-red-500" : "text-black"}`}>{course.spots}</span> 個名額
              </p>
            </div>
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

      {/* Bottom CTA */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-[#ebebeb] px-5 py-4">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <div>
            <p className="text-[10px] text-[#aaa]">單堂直購</p>
            <p className="text-lg font-medium">NT$ {course.price.toLocaleString()}</p>
            {totalUnused > 0 && (
              <p className="text-[10px] text-green-600 mt-0.5">課堂券 {totalUnused} 張可用</p>
            )}
          </div>
          <button
            onClick={openConfirm}
            className="flex-1 py-3 bg-black text-white text-sm font-medium rounded-xl hover:bg-[#222] transition-colors"
          >
            {me ? "立即報名" : "登入後報名"}
          </button>
        </div>
      </div>

      {/* ── 確認 Modal ── */}
      {step === "confirm" && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setStep("view")} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h2 className="text-base font-medium">確認報名</h2>
              <button onClick={() => setStep("view")} className="text-[#bbb] hover:text-black transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 pb-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">

              {/* 課程摘要 */}
              <div className="bg-[#fafaf9] rounded-xl p-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="text-sm font-medium">{course.title}</p>
                    <p className="text-xs text-[#aaa] mt-0.5">{course.date} {course.time}{course.studio ? ` · ${course.studio}` : ""}</p>
                  </div>
                  <p className="text-sm font-medium shrink-0">NT$ {course.price.toLocaleString()}</p>
                </div>
                <p className="text-[10px] text-[#bbb] mt-2">學員：{me?.name ?? ""} · 授課：{teacherNames}</p>
              </div>

              {/* 付款方式切換 */}
              <div>
                <p className="text-xs text-[#999] mb-2">付款方式</p>
                <div className="grid grid-cols-2 gap-2">
                  {ticketOrders.length > 0 && (
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
                    } ${ticketOrders.length === 0 ? "col-span-2" : ""}`}
                  >
                    直接付款
                  </button>
                </div>
              </div>

              {/* 課堂券選擇 */}
              {payMode === "ticket" && (
                <div>
                  <p className="text-xs text-[#999] mb-2">選擇要扣抵的券包</p>
                  <div className="flex flex-col gap-2">
                    {ticketOrders.map(o => (
                      <button
                        key={o.id}
                        onClick={() => setSelectedOrder(o.id)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
                          selectedOrder === o.id
                            ? "border-black bg-black/5"
                            : "border-[#f0f0f0] bg-[#fafaf9] hover:border-[#ccc]"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium">{o.item}</p>
                          <p className="text-xs text-[#aaa] mt-0.5">{o.orderNo}</p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-sm font-medium">{o.unused}</p>
                          <p className="text-[10px] text-[#aaa]">張可用</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 直接付款 */}
              {payMode === "direct" && (
                <div className="flex flex-col gap-3">
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
                    <p className="text-xs text-blue-600 leading-relaxed mb-3">
                      確認報名後，請以{payMethod === "銀行轉帳" ? "銀行轉帳" : payMethod}繳費，並通知工作室確認。收到款項後即完成報名。
                    </p>
                    {payMethod === "銀行轉帳" && (
                      <div className="bg-white rounded-lg px-3 py-2.5">
                        <p className="text-[10px] text-[#aaa] mb-1">匯款帳號（示範）</p>
                        <p className="text-xs font-mono text-[#333]">台灣銀行 004 · 123-456789-001</p>
                        <p className="text-[10px] text-[#aaa] mt-0.5">戶名：忙碌不迷路藝術工作坊</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep("view")}
                  className="flex-1 py-3 text-sm border border-[#e8e8e8] rounded-xl text-[#666] hover:border-[#ccc] transition-colors">
                  取消
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!canConfirm || submitting}
                  className="flex-1 py-3 text-sm bg-black text-white rounded-xl hover:bg-[#222] disabled:opacity-40 transition-colors font-medium">
                  {submitting ? "送出中…" : "確認報名"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
