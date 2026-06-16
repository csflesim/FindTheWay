import fs from "fs"
import path from "path"

const CONFIG_PATH = path.join(process.cwd(), "data", "line-config.json")

export type LineConfig = {
  channelId: string
  channelSecret: string
  accessToken: string
  liffId: string
}

export function getLineConfig(): LineConfig {
  if (process.env.LINE_CHANNEL_ID) {
    return {
      channelId: process.env.LINE_CHANNEL_ID,
      channelSecret: process.env.LINE_CHANNEL_SECRET ?? "",
      accessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
      liffId: process.env.LINE_LIFF_ID ?? "",
    }
  }
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8")
    return JSON.parse(raw) as LineConfig
  } catch {
    return { channelId: "", channelSecret: "", accessToken: "", liffId: "" }
  }
}

export function saveLineConfig(config: LineConfig): void {
  const dir = path.dirname(CONFIG_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8")
}
