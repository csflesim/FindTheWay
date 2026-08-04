import fs from "fs"
import path from "path"
import { encryptSecret, decryptSecret } from "@/lib/secret-crypto"

const CONFIG_PATH = path.join(process.cwd(), "data", "smtp-config.json")

export type SmtpConfig = {
  host: string
  port: string
  user: string
  pass: string
  from: string
}

export function getSmtpConfig(): SmtpConfig {
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
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as SmtpConfig
    return { ...raw, pass: decryptSecret(raw.pass) }
  } catch {
    return { host: "", port: "587", user: "", pass: "", from: "" }
  }
}

export function saveSmtpConfig(config: SmtpConfig): void {
  const dir = path.dirname(CONFIG_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const stored = { ...config, pass: encryptSecret(config.pass) }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(stored, null, 2), "utf-8")
}
