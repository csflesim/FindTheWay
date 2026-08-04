import { NextRequest, NextResponse } from "next/server"
import { requireStaff } from "@/lib/admin-guard"
import {
  getLineLoginConfig, saveLineLoginConfig,
  getLineMsgConfig, saveLineMsgConfig,
} from "@/lib/line-config"
import { getSmtpConfig, saveSmtpConfig } from "@/lib/smtp-config"
import { createAdminClient } from "@/lib/supabase/admin"

// 讀取已儲存的設定，供參數管理頁 prefill（僅後台人員）
export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const admin = createAdminClient()
  const [login, msg, smtp, settingsRes] = await Promise.all([
    getLineLoginConfig(),
    getLineMsgConfig(),
    getSmtpConfig(),
    admin.from("settings").select("key, value").in("key", ["pay_methods", "features"]),
  ])
  const settingsMap = Object.fromEntries((settingsRes.data ?? []).map(r => [r.key, r.value]))
  return NextResponse.json({
    pay_methods: Array.isArray(settingsMap.pay_methods) ? settingsMap.pay_methods : ["銀行轉帳", "現金"],
    features: settingsMap.features ?? { onlineCourse: true },
    line_channel_id:         login.channelId,
    line_channel_secret:     login.channelSecret,
    line_liff_id:            login.liffId,
    line_msg_channel_id:     msg.channelId,
    line_msg_channel_secret: msg.channelSecret,
    line_access_token:       msg.accessToken,
    smtp_host: smtp.host,
    smtp_port: smtp.port,
    smtp_user: smtp.user,
    smtp_pass: smtp.pass,
    smtp_from: smtp.from,
  })
}

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const body = await req.json()

  // 部分更新：付款方式 / 功能開關（參數頁 toggle 即時儲存）
  if (body.action === "settings") {
    const admin = createAdminClient()
    const rows: { key: string; value: unknown; updated_at: string }[] = []
    if (Array.isArray(body.pay_methods)) {
      rows.push({ key: "pay_methods", value: body.pay_methods, updated_at: new Date().toISOString() })
    }
    if (body.features && typeof body.features === "object") {
      rows.push({ key: "features", value: body.features, updated_at: new Date().toISOString() })
    }
    if (rows.length > 0) {
      const { error } = await admin.from("settings").upsert(rows)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  try {
    await Promise.all([
      saveLineLoginConfig({
        channelId:     body.line_channel_id     ?? "",
        channelSecret: body.line_channel_secret ?? "",
        liffId:        body.line_liff_id        ?? "",
      }),
      saveLineMsgConfig({
        channelId:     body.line_msg_channel_id     ?? "",
        channelSecret: body.line_msg_channel_secret ?? "",
        accessToken:   body.line_access_token       ?? "",
      }),
      saveSmtpConfig({
        host: body.smtp_host ?? "",
        port: body.smtp_port ?? "587",
        user: body.smtp_user ?? "",
        pass: body.smtp_pass ?? "",
        from: body.smtp_from ?? "",
      }),
    ])
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "儲存失敗" },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
