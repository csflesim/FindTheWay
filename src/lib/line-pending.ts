import crypto from "crypto"

/**
 * LINE 首次登入的「暫存身分」：不建帳號，把 LINE 身分放進 HMAC 簽章 cookie，
 * Email 驗證碼通過後才正式建立帳號。僅伺服器端使用。
 */

const SECRET = process.env.SETTINGS_ENCRYPTION_KEY ?? "line-pending-dev-secret"

export const PENDING_COOKIE = "line_pending"
export const CODE_COOKIE = "line_email_code"

export type LinePending = {
  lineUserId: string
  name: string
  avatar: string
  exp: number
}

export type EmailCodeState = {
  email: string
  hash: string
  expires: number
  sentAt: number
  exp: number
}

function hmac(data: string): string {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url")
}

export function signToken(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${body}.${hmac(body)}`
}

export function verifyToken<T extends { exp?: number }>(token: string | undefined): T | null {
  if (!token) return null
  const [body, sig] = token.split(".")
  if (!body || !sig) return null
  const expect = hmac(body)
  const a = Buffer.from(expect)
  const b = Buffer.from(sig)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const obj = JSON.parse(Buffer.from(body, "base64url").toString()) as T
    if (obj.exp && Date.now() > obj.exp) return null
    return obj
  } catch {
    return null
  }
}
