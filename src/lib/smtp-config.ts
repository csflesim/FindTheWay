import { createAdminClient } from "@/lib/supabase/admin"
import { encryptSecret, decryptSecret } from "@/lib/secret-crypto"

// SMTP 設定存於 Supabase settings 表（Vercel serverless 檔案系統唯讀）。
// 密碼以 AES-256-GCM 加密後入庫；env vars（SMTP_HOST 等）優先於 DB 設定。

export type SmtpConfig = {
  host: string
  port: string
  user: string
  pass: string
  from: string
}

export async function getSmtpConfig(): Promise<SmtpConfig> {
  if (process.env.SMTP_HOST) {
    return {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ?? "587",
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
      from: process.env.SMTP_FROM ?? "",
    }
  }
  try {
    const admin = createAdminClient()
    const { data } = await admin.from("settings").select("value").eq("key", "smtp").maybeSingle()
    const v = (data?.value as Record<string, string>) ?? {}
    return {
      host: v.host ?? "",
      port: v.port ?? "587",
      user: v.user ?? "",
      pass: decryptSecret(v.pass ?? ""),
      from: v.from ?? "",
    }
  } catch {
    return { host: "", port: "587", user: "", pass: "", from: "" }
  }
}

export async function saveSmtpConfig(config: SmtpConfig): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from("settings").upsert({
    key: "smtp",
    value: {
      host: config.host,
      port: config.port,
      user: config.user,
      pass: encryptSecret(config.pass),
      from: config.from,
    },
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(`儲存 SMTP 設定失敗：${error.message}`)
}
