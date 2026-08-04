import type { SupabaseClient } from "@supabase/supabase-js"

// 會員側學員資料：students 表 + 由訂單票券計算每位學員的課堂券餘額。
// 「本人」是虛擬項（id = "self"）：未指定學員的票券都算本人的。

export type MemberStudent = {
  id: string            // uuid 或 "self"
  name: string
  age: number | null
  relation: string
  status: "待審核" | "已核准" | "已拒絕"
  tickets: number       // 未使用課堂券
}

type StudentRow = {
  id: string
  name: string
  age: number | null
  relation: string
  status: MemberStudent["status"]
}

export type TicketLite = {
  id: string
  status: string
  student_id: string | null
  transferred_to: string | null
}

export type MemberOrderLite = {
  id: string
  order_no: string
  item_name: string
  status: string
  course_id: string | null
  student_id: string | null
  created_at: string
  tickets: TicketLite[]
}

/** 票券目前歸屬：轉讓優先，其次原持有學員，否則本人（null） */
export function ticketHolder(t: TicketLite): string | null {
  return t.transferred_to ?? t.student_id
}

export function unusedCountFor(orders: MemberOrderLite[], studentId: string | null): number {
  return orders
    .filter(o => o.status === "已付款")
    .flatMap(o => o.tickets)
    .filter(t => t.status === "未使用" && ticketHolder(t) === studentId)
    .length
}

export async function fetchMemberData(supabase: SupabaseClient, profileName: string) {
  const [sRes, oRes] = await Promise.all([
    supabase.from("students").select("id, name, age, relation, status").order("created_at"),
    supabase.from("orders")
      .select("id, order_no, item_name, status, course_id, student_id, created_at, tickets(id, status, student_id, transferred_to)")
      .order("created_at", { ascending: false }),
  ])
  const rows = (sRes.data ?? []) as StudentRow[]
  const orders = (oRes.data ?? []) as unknown as MemberOrderLite[]

  const self: MemberStudent = {
    id: "self",
    name: profileName || "本人",
    age: null,
    relation: "本人",
    status: "已核准",
    tickets: unusedCountFor(orders, null),
  }
  const approved: MemberStudent[] = rows
    .filter(r => r.status === "已核准")
    .map(r => ({ ...r, tickets: unusedCountFor(orders, r.id) }))
  const pending: MemberStudent[] = rows
    .filter(r => r.status === "待審核")
    .map(r => ({ ...r, tickets: 0 }))

  return { self, approved, pending, orders }
}
