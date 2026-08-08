import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// 儲存點名並自動核銷課堂券：
// - 「出席」的學生：找一張其名下（或本人）未使用票券標記「已使用」，票券 id 記回 records
// - 從出席改成缺席/延期：把先前核銷的那張票券退回「未使用」
// - 課程若設定「可使用課堂券」（courses.ticket_types 存商品 id），只核銷對應券包的票券
// - 以「課堂券扣抵」訂單報名的人：確認付款時已扣過一張，點名不再扣
//   （每張扣抵訂單抵一堂——records 記 deductOrderId，佔用過的日期以外仍正常扣券）
// 權限：後台人員或教師（教師需為該課程的授課老師）。

type InRecord = { name: string; status: string; ticketId?: string | null; deductOrderId?: string | null }

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { courseId, date, records } = await req.json() as {
    courseId?: string; date?: string; records?: InRecord[]
  }
  if (!courseId || !date || !Array.isArray(records)) {
    return NextResponse.json({ error: "參數不完整" }, { status: 400 })
  }

  const admin = createAdminClient()

  // ── 權限：staff/admin，或該課程授課教師 ──
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle()
  const isStaff = !!profile && ["staff", "admin"].includes(profile.role)
  if (!isStaff) {
    const { data: teacher } = await admin.from("teachers").select("id").eq("profile_id", user.id).maybeSingle()
    if (!teacher) return NextResponse.json({ error: "forbidden" }, { status: 403 })
    const { data: link } = await admin.from("course_teachers")
      .select("course_id").eq("course_id", courseId).eq("teacher_id", teacher.id).maybeSingle()
    if (!link) return NextResponse.json({ error: "非此課程授課教師" }, { status: 403 })
  }

  // ── 課程限定可用券別（商品 id；空陣列 = 不限）──
  const { data: courseRow } = await admin.from("courses")
    .select("ticket_types").eq("id", courseId).maybeSingle()
  const allowedProducts = ((courseRow?.ticket_types ?? []) as string[])
    .filter(v => /^[0-9a-f-]{36}$/i.test(v))   // 僅認 uuid，舊名稱字串視為不限

  // ── 既有紀錄（取得先前核銷對照）──
  const { data: existing } = await admin
    .from("course_attendance")
    .select("id, records")
    .eq("course_id", courseId)
    .eq("date", date)
    .maybeSingle()
  const prevTicketByName = new Map(
    ((existing?.records ?? []) as InRecord[])
      .filter(r => r.ticketId)
      .map(r => [r.name, r.ticketId as string])
  )
  const prevDeductByName = new Map(
    ((existing?.records ?? []) as InRecord[])
      .filter(r => r.deductOrderId)
      .map(r => [r.name, r.deductOrderId as string])
  )

  // ── 課堂券扣抵報名的抵扣額度：一張扣抵訂單抵一堂 ──
  const { data: deductOrders } = await admin
    .from("orders")
    .select("id, student_id, member_id")
    .eq("course_id", courseId)
    .eq("status", "已付款")
    .like("notes", "課堂券扣抵%")
  // 其他日期已佔用的扣抵訂單
  const usedDeducts = new Set<string>()
  if ((deductOrders ?? []).length > 0) {
    const { data: otherRows } = await admin
      .from("course_attendance")
      .select("date, records")
      .eq("course_id", courseId)
      .neq("date", date)
    for (const row of otherRows ?? []) {
      for (const r of (row.records ?? []) as InRecord[]) {
        if (r.deductOrderId) usedDeducts.add(r.deductOrderId)
      }
    }
  }

  // 名字 → 學員 id / 會員 id（供票券查找與扣抵訂單比對共用）
  async function resolvePerson(name: string): Promise<{ studentId: string | null; memberId: string | null }> {
    const { data: student } = await admin.from("students")
      .select("id").eq("name", name).eq("status", "已核准").limit(1).maybeSingle()
    const { data: member } = await admin.from("profiles")
      .select("id").eq("name", name).limit(1).maybeSingle()
    return { studentId: student?.id ?? null, memberId: member?.id ?? null }
  }

  // 此人是否有尚未佔用的扣抵訂單（訂單指定學員→比對學員；未指定→比對會員本人）
  function findFreeDeduct(p: { studentId: string | null; memberId: string | null }): string | null {
    for (const o of deductOrders ?? []) {
      if (usedDeducts.has(o.id)) continue
      const match = o.student_id ? o.student_id === p.studentId : o.member_id === p.memberId
      if (match) return o.id
    }
    return null
  }

  // ── 找學生名下可核銷的票券 ──
  async function findTicketFor(p: { studentId: string | null; memberId: string | null }): Promise<string | null> {
    // 學員 → 該學員持有（含受讓）的未使用券
    if (p.studentId) {
      let q = admin.from("tickets")
        .select("id, expires_at, orders!inner(product_id)")
        .eq("status", "未使用")
        .or(`transferred_to.eq.${p.studentId},and(transferred_to.is.null,student_id.eq.${p.studentId})`)
      if (allowedProducts.length > 0) q = q.in("orders.product_id", allowedProducts)
      const { data: t } = await q
        .order("expires_at", { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle()
      if (t) return t.id
    }
    // 會員本人 → 其訂單中未指定學員且未轉讓的未使用券
    if (p.memberId) {
      let oq = admin.from("orders")
        .select("id").eq("member_id", p.memberId).eq("status", "已付款")
      if (allowedProducts.length > 0) oq = oq.in("product_id", allowedProducts)
      const { data: orders } = await oq
      const orderIds = (orders ?? []).map(o => o.id)
      if (orderIds.length > 0) {
        const { data: t } = await admin.from("tickets")
          .select("id")
          .eq("status", "未使用")
          .is("student_id", null)
          .is("transferred_to", null)
          .in("order_id", orderIds)
          .order("expires_at", { ascending: true, nullsFirst: false })
          .limit(1)
          .maybeSingle()
        if (t) return t.id
      }
    }
    return null
  }

  // ── 逐筆處理核銷 / 退回 ──
  const outRecords: InRecord[] = []
  for (const r of records) {
    const prevTicket = prevTicketByName.get(r.name) ?? r.ticketId ?? null
    const prevDeduct = prevDeductByName.get(r.name) ?? null
    if (r.status === "出席") {
      if (prevTicket) {
        outRecords.push({ name: r.name, status: r.status, ticketId: prevTicket })
      } else if (prevDeduct) {
        // 本日已用扣抵額度抵過 → 維持
        usedDeducts.add(prevDeduct)
        outRecords.push({ name: r.name, status: r.status, deductOrderId: prevDeduct })
      } else {
        const person = await resolvePerson(r.name)
        // 以「課堂券扣抵」報名者：確認付款時已扣過，這裡佔用額度、不再扣券
        const deductId = findFreeDeduct(person)
        if (deductId) {
          usedDeducts.add(deductId)
          outRecords.push({ name: r.name, status: r.status, deductOrderId: deductId })
        } else {
          const ticketId = await findTicketFor(person)
          if (ticketId) {
            await admin.from("tickets")
              .update({ status: "已使用", used_at: new Date().toISOString() })
              .eq("id", ticketId)
            outRecords.push({ name: r.name, status: r.status, ticketId })
          } else {
            outRecords.push({ name: r.name, status: r.status })   // 無券可扣，僅記出席
          }
        }
      }
    } else {
      if (prevTicket) {
        // 出席改缺席/延期 → 退回票券
        await admin.from("tickets")
          .update({ status: "未使用", used_at: null })
          .eq("id", prevTicket)
          .eq("status", "已使用")
      }
      // 扣抵額度不用退——紀錄不再帶 deductOrderId 即釋出，可供其他日期使用
      outRecords.push({ name: r.name, status: r.status })
    }
    prevTicketByName.delete(r.name)
  }
  // 名單中被移除、但先前有核銷的 → 退回
  for (const ticketId of prevTicketByName.values()) {
    await admin.from("tickets")
      .update({ status: "未使用", used_at: null })
      .eq("id", ticketId)
      .eq("status", "已使用")
  }

  // ── 寫入點名紀錄 ──
  let rowId = existing?.id ?? null
  if (rowId) {
    const { error } = await admin.from("course_attendance").update({ records: outRecords }).eq("id", rowId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { data, error } = await admin.from("course_attendance")
      .insert({ course_id: courseId, date, records: outRecords })
      .select("id").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    rowId = data.id
  }

  const consumed = outRecords.filter(r => r.ticketId).length
  return NextResponse.json({ ok: true, rowId, records: outRecords, consumed })
}
