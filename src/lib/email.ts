/**
 * Email 發信 SDK — 支援 Resend 或 SMTP (nodemailer)。
 * 由 EMAIL_PROVIDER 或 env 自動判定。
 * 永不拋出 — 失敗時回傳 { ok: false, error }。
 * ⚠️ 僅限伺服器端使用。
 */

import { Resend } from "resend"
import nodemailer from "nodemailer"
import { getSmtpConfig as loadSmtpConfig } from "@/lib/smtp-config"

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
}

export type SendEmailResult =
  | { ok: true; id: string; provider: "resend" | "smtp" }
  | { ok: false; error: string; provider: "resend" | "smtp" }

type SmtpRuntimeConfig = {
  host: string; port: number; secure: boolean
  user: string; pass: string; fromEmail: string
}

async function resolveSmtpConfig(): Promise<SmtpRuntimeConfig> {
  // 讀取後台儲存的 SMTP 設定（含密碼解密）；env vars 優先由 smtp-config 模組處理
  const cfg = await loadSmtpConfig()
  const port = Number(cfg.port || "587")
  // 寄件人：填純名稱（無 @）時自動組成 "名稱 <帳號>"，避免不合法 From 被判垃圾信
  const rawFrom = (cfg.from ?? "").trim()
  const account = cfg.user || "noreply@findtheway.app"
  const fromEmail = !rawFrom
    ? account
    : rawFrom.includes("@") ? rawFrom : `"${rawFrom}" <${account}>`
  return {
    host: cfg.host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    user: cfg.user,
    pass: cfg.pass,
    fromEmail,
  }
}

function pickProvider(smtp: SmtpRuntimeConfig): "resend" | "smtp" {
  if (process.env.EMAIL_PROVIDER === "smtp") return "smtp"
  if (process.env.RESEND_API_KEY) return "resend"
  if (smtp.host) return "smtp"
  return "resend"
}

function getResendConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY ?? "",
    fromEmail: process.env.RESEND_FROM_EMAIL ?? "noreply@findtheway.app",
  }
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const smtpCfg = await resolveSmtpConfig()
  const provider = pickProvider(smtpCfg)
  if (!params.html && !params.text) {
    return { ok: false, error: "html 與 text 至少需提供一項", provider }
  }
  try {
    return provider === "smtp" ? await sendViaSmtp(params, smtpCfg) : await sendViaResend(params)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), provider }
  }
}

async function sendViaResend(params: SendEmailParams): Promise<SendEmailResult> {
  const cfg = getResendConfig()
  const resend = new Resend(cfg.apiKey)
  const { data, error } = await resend.emails.send({
    from: params.from ?? cfg.fromEmail,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    replyTo: params.replyTo,
    cc: params.cc,
    bcc: params.bcc,
  } as Parameters<typeof resend.emails.send>[0])

  if (error) return { ok: false, error: error.message ?? String(error), provider: "resend" }
  if (!data?.id) return { ok: false, error: "Resend 未回傳 message id", provider: "resend" }
  return { ok: true, id: data.id, provider: "resend" }
}

async function sendViaSmtp(params: SendEmailParams, cfg: SmtpRuntimeConfig): Promise<SendEmailResult> {
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  })
  const info = await transporter.sendMail({
    from: params.from ?? cfg.fromEmail,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    replyTo: params.replyTo,
    cc: params.cc,
    bcc: params.bcc,
  })
  return { ok: true, id: info.messageId, provider: "smtp" }
}

/** 以 {{key}} 替換字串中的模板變數。 */
export function renderTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}
