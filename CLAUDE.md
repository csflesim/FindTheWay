@AGENTS.md

---

# 死規矩：禁止 N+1 查詢

## 絕對禁止

```ts
// ❌ 禁止 — 迴圈裡打 DB
const orders = await getOrders()
for (const order of orders) {
  order.student = await getStudent(order.studentId)   // N 次查詢
  order.tickets = await getTickets(order.id)          // N 次查詢
}
```

## 必須這樣做

### 1. Supabase：一次 JOIN 取全部
```ts
// ✅ 正確
const { data } = await supabase
  .from("orders")
  .select("*, student:students(*), tickets(*)")
```

### 2. 需要批次 ID 時用 IN（超過 500 筆必須分批）
```ts
// ✅ 正確 — 自動分批，避免 IN 超過 1000 條找不到資料
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}

async function batchFetch(ids: string[]) {
  const batches = chunk(ids, 500)
  const results = await Promise.all(
    batches.map(batch =>
      supabase.from("students").select("*").in("id", batch).then(r => r.data ?? [])
    )
  )
  return results.flat()
}

const ids = orders.map(o => o.studentId)
const students = await batchFetch(ids)
const map = Object.fromEntries(students.map(s => [s.id, s]))
const result = orders.map(o => ({ ...o, student: map[o.studentId] }))
```

> **規則**：`.in()` 的陣列超過 **500** 筆就必須用 `chunk` 分批並 `Promise.all` 合併。
> Supabase / PostgreSQL 對 IN 的長度沒有硬上限，但 URL 長度與 query planner 效率在 1000+ 條時明顯劣化，搜尋結果可能不完整。

### 3. 明細頁（`/[id]`）：一個 query 帶齊所有關聯
```ts
// ✅ 明細頁標準寫法
const { data: course } = await supabase
  .from("courses")
  .select(`
    *,
    teacher:teachers(*),
    roster:enrollments(*, student:students(*)),
    classroom:classrooms(*)
  `)
  .eq("id", id)
  .single()
```

## 檢核清單（寫任何資料查詢前必過）

- [ ] 有沒有在 `map` / `forEach` / `for...of` 裡呼叫 DB？→ **禁止**
- [ ] 明細頁有沒有分多個 `await` 分別查關聯？→ 改成單一 `select` with JOIN
- [ ] 列表頁有沒有每行各自查子資料？→ 改成 `.in()` 或 JOIN
- [ ] Server Component 裡有沒有 waterfall await？→ 改用 `Promise.all([])`

---

# 死規矩：Supabase + Vercel 地雷

## 1. 連線池——上線前必確認

```
# .env.production
# ❌ 禁止 — 直連 port 5432，serverless 會耗盡連線
DATABASE_URL=postgresql://...@db.xxx.supabase.co:5432/postgres

# ✅ 必須用 pooler port 6543（pgBouncer）
DATABASE_URL=postgresql://...@db.xxx.supabase.co:6543/postgres?pgbouncer=true
```

> Vercel 每個 request 都開新連線，5432 直連在高流量下必炸。
> Supabase Dashboard → Settings → Database → Connection pooling → 複製 **Transaction mode** 的 URL。

**上線前 checklist**
- [ ] `DATABASE_URL` 使用 port **6543**，帶 `?pgbouncer=true`
- [ ] Supabase Dashboard 有開啟 Connection Pooling

---

## 2. Server vs Client 用不同 Supabase client

```ts
// ✅ Server Component / Route Handler / Server Action
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookies: { getAll: async () => (await cookies()).getAll() } },
)

// ✅ Client Component（'use client'）
import { createBrowserClient } from "@supabase/ssr"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
```

> 混用會導致 session / cookie 拿不到，auth 靜默失效。
> **永遠不要**在 Server Component 裡 `import { createClient } from "@supabase/supabase-js"` 直接用。

---

## 3. RLS——上線前每張 table 必確認

```sql
-- 上線前每張 table 都要執行
ALTER TABLE students  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets   ENABLE ROW LEVEL SECURITY;
-- ... 所有 table

-- 範例 policy：只能讀自己的資料
CREATE POLICY "member_own" ON students
  FOR SELECT USING (auth.uid() = member_id);
```

**上線前 checklist**
- [ ] Supabase Dashboard → Table Editor → 每張 table 確認 RLS 為 **Enabled**
- [ ] 每張 table 至少有一條 policy，沒 policy = 沒人能存取

---

## 4. `cookies()` 在 Server Component 是 async（Next.js 15+）

```ts
// ❌ 禁止
const cookieStore = cookies()

// ✅ 必須 await
const cookieStore = await cookies()
```

> 忘記 `await` 不會報錯，只是靜默拿到空值，session 消失。

---

## 5. Vercel function timeout

```json
// vercel.json — 複雜查詢頁面需要設定
{
  "functions": {
    "src/app/api/**": { "maxDuration": 30 },
    "src/app/sys-admin/**": { "maxDuration": 30 }
  }
}
```

> Hobby plan 預設 10 秒，最高 60 秒。
> 報表、批次匯出等頁面沒設定會在 10 秒後回 504。

---

## 6. Storage bucket——圖片上傳後要能公開讀取

```sql
-- Supabase SQL Editor 執行
-- 讓 bucket 公開可讀（課程圖片、教師頭貼等）
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true);

-- 或在 Dashboard → Storage → Bucket → Make public
```

```ts
// 上傳後取 public URL
const { data } = supabase.storage.from("images").getPublicUrl(path)
// data.publicUrl 才是可直接放進 <img src> 的網址
```

> 預設 bucket 是私有的，上傳成功但 URL 回 403。
> 若需要私有（學員個人資料）改用 `createSignedUrl(path, 3600)`。

---

## 7. 時區——本系統全面對齊 UTC+8（台灣時間）

```ts
// ✅ 顯示時間統一用這個 helper
export function formatTW(date: Date | string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(date).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    hour12: false,
    ...opts,
  })
}

// 範例
formatTW(new Date())                          // "2025/6/10 14:32:05"
formatTW(row.created_at, { dateStyle: "short" }) // "2025/6/10"
```

```ts
// ✅ 寫入 DB 時存 UTC（Supabase 預設），不要手動加 8 小時
// ❌ 禁止
const now = new Date(Date.now() + 8 * 60 * 60 * 1000)  // 自己加 8 小時再存

// ✅ 正確：直接存，讓 DB 記 UTC，顯示時再用 formatTW 轉換
const now = new Date()
await supabase.from("logs").insert({ created_at: now.toISOString() })
```

> **規則**：DB 永遠存 UTC ISO string；前端 / Server Component 顯示時一律用 `formatTW()`，禁止自行加減時差。
