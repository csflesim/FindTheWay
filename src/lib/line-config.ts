import { createAdminClient } from "@/lib/supabase/admin"
import { encryptSecret, decryptSecret } from "@/lib/secret-crypto"

// LINE 設定存於 Supabase settings 表（Vercel serverless 檔案系統唯讀，不能寫檔）。
// 敏感欄位以 AES-256-GCM 加密後入庫；env vars 優先於 DB 設定。

// ── Types ─────────────────────────────────────────────────────

export type LineLoginConfig = {
  channelId: string
  channelSecret: string
  liffId: string
}

export type LineMsgConfig = {
  channelId: string
  channelSecret: string
  accessToken: string
}

// ── settings 表存取 ───────────────────────────────────────────

async function readSetting(key: string): Promise<Record<string, string>> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.from("settings").select("value").eq("key", key).maybeSingle()
    return (data?.value as Record<string, string>) ?? {}
  } catch {
    return {}
  }
}

async function writeSetting(key: string, value: Record<string, string>): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() })
  if (error) throw new Error(`儲存設定失敗（${key}）：${error.message}`)
}

// ── LINE Login Channel ────────────────────────────────────────

export async function getLineLoginConfig(): Promise<LineLoginConfig> {
  if (process.env.LINE_CHANNEL_ID) {
    return {
      channelId: process.env.LINE_CHANNEL_ID,
      channelSecret: process.env.LINE_CHANNEL_SECRET ?? "",
      liffId: process.env.LINE_LIFF_ID ?? "",
    }
  }
  const v = await readSetting("line_login")
  return {
    channelId: v.channelId ?? "",
    channelSecret: decryptSecret(v.channelSecret ?? ""),
    liffId: v.liffId ?? "",
  }
}

export async function saveLineLoginConfig(config: LineLoginConfig): Promise<void> {
  await writeSetting("line_login", {
    channelId: config.channelId,
    channelSecret: encryptSecret(config.channelSecret),
    liffId: config.liffId,
  })
}

// ── LINE Messaging API Channel ────────────────────────────────

export async function getLineMsgConfig(): Promise<LineMsgConfig> {
  if (process.env.LINE_MSG_CHANNEL_ID) {
    return {
      channelId: process.env.LINE_MSG_CHANNEL_ID,
      channelSecret: process.env.LINE_MSG_CHANNEL_SECRET ?? "",
      accessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
    }
  }
  const v = await readSetting("line_msg")
  return {
    channelId: v.channelId ?? "",
    channelSecret: decryptSecret(v.channelSecret ?? ""),
    accessToken: decryptSecret(v.accessToken ?? ""),
  }
}

export async function saveLineMsgConfig(config: LineMsgConfig): Promise<void> {
  await writeSetting("line_msg", {
    channelId: config.channelId,
    channelSecret: encryptSecret(config.channelSecret),
    accessToken: encryptSecret(config.accessToken),
  })
}
