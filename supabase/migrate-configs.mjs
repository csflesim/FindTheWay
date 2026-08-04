// 一次性遷移：data/*.json 設定 → Supabase settings 表
// 用法：set -a && source .env.local && set +a && node supabase/migrate-configs.mjs
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
import fs from "fs"

const PREFIX = "enc:v1:", IV_LEN = 12, TAG_LEN = 16
const key = Buffer.from(process.env.SETTINGS_ENCRYPTION_KEY, "base64")

function dec(v) {
  if (!v || !v.startsWith(PREFIX)) return v ?? ""
  const p = Buffer.from(v.slice(PREFIX.length), "base64")
  const d = crypto.createDecipheriv("aes-256-gcm", key, p.subarray(0, IV_LEN))
  d.setAuthTag(p.subarray(IV_LEN, IV_LEN + TAG_LEN))
  return Buffer.concat([d.update(p.subarray(IV_LEN + TAG_LEN)), d.final()]).toString("utf-8")
}
function enc(plain) {
  if (!plain) return plain
  const iv = crypto.randomBytes(IV_LEN)
  const c = crypto.createCipheriv("aes-256-gcm", key, iv)
  const e = Buffer.concat([c.update(plain, "utf-8"), c.final()])
  return PREFIX + Buffer.concat([iv, c.getAuthTag(), e]).toString("base64")
}
function readJson(path) {
  try { return JSON.parse(fs.readFileSync(path, "utf-8")) } catch { return null }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const login = readJson("data/line-login-config.json")
const msg   = readJson("data/line-msg-config.json")
const smtp  = readJson("data/smtp-config.json")

const rows = []
if (login) rows.push({ key: "line_login", value: {
  channelId: login.channelId ?? "",
  channelSecret: enc(dec(login.channelSecret)),
  liffId: login.liffId ?? "",
}})
if (msg) rows.push({ key: "line_msg", value: {
  channelId: msg.channelId ?? "",
  channelSecret: enc(dec(msg.channelSecret)),
  accessToken: enc(dec(msg.accessToken)),
}})
if (smtp) rows.push({ key: "smtp", value: {
  host: smtp.host ?? "",
  port: smtp.port ?? "587",
  user: smtp.user ?? "",
  pass: enc(dec(smtp.pass)),
  from: smtp.from ?? "",
}})

if (rows.length === 0) {
  console.log("沒有本機設定檔可遷移")
  process.exit(0)
}

const { error } = await supabase.from("settings")
  .upsert(rows.map(r => ({ ...r, updated_at: new Date().toISOString() })))
if (error) { console.error("FAIL:", error.message); process.exit(1) }
console.log("已遷移:", rows.map(r => r.key).join(", "))
