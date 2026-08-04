export function maskSecret(value: string, head = 4, tail = 3): string {
  if (!value) return ""
  if (value.length <= head + tail) return "*".repeat(Math.max(value.length, 4))
  return `${value.slice(0, head)}${"*".repeat(7)}${value.slice(-tail)}`
}

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email
  const [local, domain] = email.split("@")
  if (local.length <= 2) return `${local[0] ?? ""}*@${domain}`
  return `${local.slice(0, 2)}${"*".repeat(2)}${local.slice(-1)}@${domain}`
}

export function maskLineId(id: string): string {
  if (!id) return ""
  if (id.length <= 6) return id
  return `${id.slice(0, 3)}***${id.slice(-3)}`
}

export function maskCard(last4: string): string {
  return `**** **** **** ${last4}`
}
