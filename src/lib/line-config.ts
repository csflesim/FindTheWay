import fs from "fs"
import path from "path"
import { encryptSecret, decryptSecret } from "@/lib/secret-crypto"

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

// ── Paths ─────────────────────────────────────────────────────

const LOGIN_PATH = path.join(process.cwd(), "data", "line-login-config.json")
const MSG_PATH   = path.join(process.cwd(), "data", "line-msg-config.json")

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// ── LINE Login Channel ────────────────────────────────────────

export function getLineLoginConfig(): LineLoginConfig {
  if (process.env.LINE_CHANNEL_ID) {
    return {
      channelId: process.env.LINE_CHANNEL_ID,
      channelSecret: process.env.LINE_CHANNEL_SECRET ?? "",
      liffId: process.env.LINE_LIFF_ID ?? "",
    }
  }
  try {
    const raw = JSON.parse(fs.readFileSync(LOGIN_PATH, "utf-8")) as LineLoginConfig
    return { ...raw, channelSecret: decryptSecret(raw.channelSecret) }
  } catch {
    return { channelId: "", channelSecret: "", liffId: "" }
  }
}

export function saveLineLoginConfig(config: LineLoginConfig): void {
  ensureDir(LOGIN_PATH)
  const stored = { ...config, channelSecret: encryptSecret(config.channelSecret) }
  fs.writeFileSync(LOGIN_PATH, JSON.stringify(stored, null, 2), "utf-8")
}

// ── LINE Messaging API Channel ────────────────────────────────

export function getLineMsgConfig(): LineMsgConfig {
  if (process.env.LINE_MSG_CHANNEL_ID) {
    return {
      channelId: process.env.LINE_MSG_CHANNEL_ID,
      channelSecret: process.env.LINE_MSG_CHANNEL_SECRET ?? "",
      accessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
    }
  }
  try {
    const raw = JSON.parse(fs.readFileSync(MSG_PATH, "utf-8")) as LineMsgConfig
    return {
      ...raw,
      channelSecret: decryptSecret(raw.channelSecret),
      accessToken: decryptSecret(raw.accessToken),
    }
  } catch {
    return { channelId: "", channelSecret: "", accessToken: "" }
  }
}

export function saveLineMsgConfig(config: LineMsgConfig): void {
  ensureDir(MSG_PATH)
  const stored = {
    ...config,
    channelSecret: encryptSecret(config.channelSecret),
    accessToken: encryptSecret(config.accessToken),
  }
  fs.writeFileSync(MSG_PATH, JSON.stringify(stored, null, 2), "utf-8")
}

// ── Backward compat (舊 getLineConfig 仍可呼叫) ───────────────

/** @deprecated 請改用 getLineLoginConfig() 或 getLineMsgConfig() */
export type LineConfig = LineLoginConfig & { accessToken: string }

/** @deprecated */
export function getLineConfig(): LineConfig {
  const login = getLineLoginConfig()
  const msg   = getLineMsgConfig()
  return { ...login, accessToken: msg.accessToken }
}

/** @deprecated */
export function saveLineConfig(config: LineConfig): void {
  saveLineLoginConfig({ channelId: config.channelId, channelSecret: config.channelSecret, liffId: config.liffId })
  saveLineMsgConfig({ channelId: config.channelId, channelSecret: config.channelSecret, accessToken: config.accessToken })
}
