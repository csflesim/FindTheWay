export function buildLineAuthUrl(channelId: string, redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: redirectUri,
    state,
    scope: "profile openid",
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
