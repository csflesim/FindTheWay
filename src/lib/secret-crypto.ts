import crypto from "crypto"

// ── 敏感設定加密（AES-256-GCM）──────────────────────────────
//
// 金鑰來自環境變數 SETTINGS_ENCRYPTION_KEY（base64，32 bytes）。
// 產生方式：openssl rand -base64 32
//
// 加密後格式："enc:v1:<base64(iv + authTag + ciphertext)>"
// decryptSecret 對非此格式的值直接原樣回傳（相容舊明文設定檔）。

const PREFIX = "enc:v1:"
const IV_LEN = 12
const TAG_LEN = 16

function getKey(): Buffer | null {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY
  if (!raw) return null
  const key = Buffer.from(raw, "base64")
  if (key.length !== 32) {
    throw new Error("SETTINGS_ENCRYPTION_KEY 必須是 32 bytes 的 base64 字串（openssl rand -base64 32）")
  }
  return key
}

export function encryptSecret(plain: string): string {
  if (!plain) return plain
  const key = getKey()
  if (!key) {
    console.warn("[secret-crypto] SETTINGS_ENCRYPTION_KEY 未設定，敏感設定將以明文儲存")
    return plain
  }
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, "utf-8"), cipher.final()])
  const payload = Buffer.concat([iv, cipher.getAuthTag(), encrypted])
  return PREFIX + payload.toString("base64")
}

export function decryptSecret(value: string): string {
  if (!value || !value.startsWith(PREFIX)) return value
  const key = getKey()
  if (!key) {
    throw new Error("設定值已加密，但 SETTINGS_ENCRYPTION_KEY 未設定，無法解密")
  }
  const payload = Buffer.from(value.slice(PREFIX.length), "base64")
  const iv = payload.subarray(0, IV_LEN)
  const tag = payload.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const encrypted = payload.subarray(IV_LEN + TAG_LEN)
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf-8")
}
