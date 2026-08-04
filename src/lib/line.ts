import crypto from "node:crypto"
import { getLineMsgConfig } from "./line-config"

// ── LINE Login OAuth helpers ──────────────────────────────────

export function buildLineAuthUrl(channelId: string, redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: redirectUri,
    state,
    scope: "profile openid",
    bot_prompt: "normal",   // 授權後顯示加好友對話框（需 Login Channel 已連結 Official Account）
  })
  return `https://access.line.me/oauth2/v2.1/authorize?${p}`
}

export async function exchangeLineToken(
  code: string,
  channelId: string,
  channelSecret: string,
  redirectUri: string,
) {
  const res = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  })
  return res.json()
}

export async function getLineProfile(accessToken: string) {
  const res = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.json()
}

// ── Messaging API types ───────────────────────────────────────

export type LineMessage =
  | { type: "text"; text: string }
  | { type: "flex"; altText: string; contents: FlexBubble | FlexCarousel }

export interface FlexBubble {
  type: "bubble"
  header?: FlexBox
  hero?: Record<string, unknown>
  body?: FlexBox
  footer?: FlexBox
  styles?: Record<string, unknown>
}
export interface FlexCarousel {
  type: "carousel"
  contents: FlexBubble[]
}
export interface FlexBox {
  type: "box"
  layout: "vertical" | "horizontal" | "baseline"
  contents: Record<string, unknown>[]
  [key: string]: unknown
}

export type PushResult = { ok: true } | { ok: false; status: number; error: string }

// ── Typed push (auto-reads config) ───────────────────────────

export async function pushMessage(
  to: string,
  messages: LineMessage | LineMessage[],
): Promise<PushResult> {
  const cfg = await getLineMsgConfig()
  try {
    if (!to) return { ok: false, status: 0, error: "缺少接收者 userId" }
    const list = Array.isArray(messages) ? messages : [messages]
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.accessToken}`,
      },
      body: JSON.stringify({ to, messages: list }),
    })
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, status: res.status, error: body || res.statusText }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) }
  }
}

export function pushText(to: string, text: string): Promise<PushResult> {
  return pushMessage(to, { type: "text", text })
}

export function pushFlex(
  to: string,
  altText: string,
  contents: FlexBubble | FlexCarousel,
): Promise<PushResult> {
  return pushMessage(to, { type: "flex", altText, contents })
}

export async function broadcastMessage(messages: LineMessage | LineMessage[]): Promise<PushResult> {
  const cfg = await getLineMsgConfig()
  try {
    const list = Array.isArray(messages) ? messages : [messages]
    const res = await fetch("https://api.line.me/v2/bot/message/broadcast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.accessToken}`,
      },
      body: JSON.stringify({ messages: list }),
    })
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, status: res.status, error: body || res.statusText }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── Webhook HMAC verification ─────────────────────────────────

export async function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string | null | undefined,
): Promise<boolean> {
  const cfg = await getLineMsgConfig()
  if (!signature) return false
  const expected = crypto
    .createHmac("sha256", cfg.channelSecret)
    .update(rawBody)
    .digest("base64")
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// ── Legacy wrappers (kept for backward compat) ────────────────

export async function pushLineMessage(accessToken: string, to: string, messages: object[]) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ to, messages }),
  })
  return res.json()
}

export async function broadcastLineMessage(accessToken: string, messages: object[]) {
  const res = await fetch("https://api.line.me/v2/bot/message/broadcast", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ messages }),
  })
  return res.json()
}

export async function getLineBotFollowers(accessToken: string): Promise<string[]> {
  const res = await fetch("https://api.line.me/v2/bot/followers/ids", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  return data.userIds ?? []
}
