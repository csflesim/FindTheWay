import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// 前台公開參數：付款方式、功能開關。
// settings 表 RLS 僅限後台人員，前台一律經此 API 取非敏感 key。
export async function GET() {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("settings")
      .select("key, value")
      .in("key", ["pay_methods", "features", "business_hours"])
    if (error) throw new Error(error.message)

    const map = Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
    return NextResponse.json({
      payMethods: Array.isArray(map.pay_methods) && map.pay_methods.length > 0
        ? map.pay_methods
        : ["銀行轉帳", "現金"],
      features: {
        onlineCourse: map.features?.onlineCourse !== false,
      },
      businessHours: {
        open: map.business_hours?.open ?? "09:00",
        close: map.business_hours?.close ?? "22:00",
        slotMinutes: map.business_hours?.slotMinutes ?? 60,
      },
    })
  } catch (err) {
    console.error("public-params error:", err)
    return NextResponse.json({
      payMethods: ["銀行轉帳", "現金"],
      features: { onlineCourse: true },
      businessHours: { open: "09:00", close: "22:00", slotMinutes: 60 },
    })
  }
}
