<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 忙碌不迷路藝術工作坊 — 專案說明

## 專案概述

Next.js App Router + **Supabase**（Postgres / Auth / Storage）正式系統，分三個區域：
公開網站、會員前台（`/m`）、教師專區（`/m/teacher`）、管理後台（`/sys-admin`）。
**已無 mock 資料**——所有頁面直接讀寫 Supabase；schema 見 `supabase/schema.sql`（可整份重跑，含 RLS 與 seed）。

## 身分與權限

- 單一 `profiles` 表（1:1 `auth.users`），`role`：`member` / `teacher` / `staff` / `admin`
- **會員**：LINE 純身份驗證 + Email 必綁。首次 LINE 登入不建帳號——身分暫存 HMAC 簽章 cookie（`src/lib/line-pending.ts`，30 分鐘），導向 `/m/bind-email` 輸入 Email + 驗證碼，通過後才 `createUser`（真實信箱、metadata 含 `line_user_id` 與 `registered_via: line`，trigger 自動建 profile）並簽入 session；之後 LINE 登入以 `profiles.line_user_id` 直查放行
- **教師**：獨立教師帳號（`teacher-<教師ID>@login.findtheway.app`，由後台教師管理建立/重設）。登入 `/m/teacher/login` 輸入 Email/電話 → 查 `teachers` 表 → 專屬帳號驗密碼；或 LINE（對照 `teachers.line_user_id`）。`/api/teacher/me` 只認 `role=teacher` 且 `teachers.profile_id` 綁定的帳號，不再自動綁定/升級
- **後台**：`/sys-admin/login`，帳號（自動補 `@findtheway.com`）/聯絡 Email/電話＋密碼，或 LINE；proxy（`src/proxy.ts`）強制 `/sys-admin/*` 需 `staff`/`admin`，`/m` 個人頁需 `member`
- **三端帳號分割**：會員/教師/後台人員是獨立的表與帳號，同一人可在三端各有身分（Email/電話/LINE ID 為聯絡資料可跨表重複）。統一登入 `/api/auth/portal-login`（portal + identifier + password → 查該端表 → 識別碼帳號驗密碼 → 驗 role 相符）；LINE 登入以 `?portal=member|teacher|staff` 分流，各端只查自己的表。三端登入後皆可綁/解綁 LINE（會員設定、教師個人資料、後台系統/個人設定），LINE ID 端內唯一（partial unique indexes）
- RLS：公開目錄（課程/老師/banner/商品/線上課）匿名可讀；會員只能讀寫自己的訂單/票券/學員；`is_staff()`（security definer）給後台全權
- 後台 API 一律經 `requireStaff()`（`src/lib/admin-guard.ts`）守門

## 資料表（`supabase/schema.sql`）

| 區塊 | 表 |
|------|-----|
| 人員 | `profiles`、`students`（含審核 status、內部/外部 types）、`teachers`、`teacher_availability`（請假） |
| 課程 | `units`（含 sub_units jsonb）、`classrooms`、`courses`（扁平模型：schedule 文字班表、types 內部/外部複選）、`course_teachers`、`course_attendance`（一課一日一筆，records jsonb） |
| 交易 | `products`（課堂券組合）、`orders`（order_no 自動 ORD-XXXX）、`tickets`（status 未使用/已使用/已失效 + transferred_to） |
| 內容 | `banners`、`online_courses` + `online_sections` |
| 訊息 | `message_templates`（設計內容存 email/line jsonb）、`workflows`（id 為前端字串、variant）、`message_logs` |
| 系統 | `settings`（key-value jsonb） |

**班表格式**：`courses.schedule` 為文字 `"每週六 10:00–12:00"` 或 `"2026/06/10 14:00–15:30"`；
`src/lib/schedule.ts` 負責展開成月曆事件（教師課表、教室課表、Dashboard 即將開課皆由此推導）。

## 交易流

**核心模型：訂單只管金流，券管上課資格（狀態機：未使用 ⇄ 待使用（綁課程＋日期）→ 已使用；已失效）。每張券 `history` jsonb 記完整歷程。**

1. 購券：前台下單（券包 / 課程單堂直購＝買該課程綁定的「單堂」商品 ×N 堂，`booking_dates` 記日期）→「待確認」→ 後台「確認付款」發 `tickets`（單堂直購發券後自動綁定 → 待使用；綁定前檢查各堂名額）
2. 報名：會員用「未使用」券綁定課程＋日期（`/api/member/book`，立即生效；檢查券種在 `courses.ticket_types`、未過期、名額）；取消上課（`/api/member/cancel-booking`，限期限內＝上課前 `products.cancel_hours` 小時；過期的待使用券鎖死只能出席）
3. 點名（`/api/attendance/{roster,save}`）：內部課名冊＝綁定該堂的券；出席／缺席 → 核銷（已使用）、延期 → 退回未使用解綁。外部課純點名不碰券
4. 轉讓：僅「未使用＋未過期＋商品 transferable」（`/api/member/transfer-tickets`）；換課＝取消上課＋重新報名
5. 售後：僅「未使用」可收回設「已失效」；後台可對券「人工延期／回復」（`/api/admin/ticket-action`）
6. 商品 `is_single`（單堂型別，堂數固定 1）；內部課程的 `ticket_types` 必含至少一個單堂商品（直購計價依據，課程 price 欄位退役）；`enrolled` ＝未來場次綁定中的券數（`syncCourseEnrollment`）
7. 帳務頁全由訂單即時推導（收入/退款/待收款/課券均攤結算）

共用訂單邏輯在 `src/app/sys-admin/_lib/orders.tsx`（`ORDER_SELECT` 單一 JOIN 查詢、`orderFromRow`、`issueTickets`、`OrderDetail`）。

## 設定與金鑰

- 所有系統設定存 `settings` 表（Vercel serverless 檔案系統唯讀，**不可寫檔**）
- 敏感值（LINE channel secret / access token、SMTP 密碼）以 AES-256-GCM 加密入庫（`src/lib/secret-crypto.ts`，金鑰 env `SETTINGS_ENCRYPTION_KEY`，格式 `enc:v1:...`）
- env vars 優先於 DB 設定（`LINE_CHANNEL_ID`、`SMTP_HOST` 等）
- `settings` keys：`pay_methods`、`features`（前台經 `/api/public-params` 讀取）、`line_login`、`line_msg`、`smtp`
- 讀寫入口：`src/lib/line-config.ts`、`src/lib/smtp-config.ts`（皆 async）、`/api/admin/params`（GET prefill / POST 儲存；`action: "settings"` 為付款方式/功能開關即時儲存）

## LINE / Email

- LINE Login callback：`/api/auth/line/callback`；`?next=` 指定登入後導向；`?mode=whoami` 只取 LINE User ID 不動 session（工作流測試用）
- 推播：`/api/line/send`（staff only，自動寫 `message_logs`）；webhook：`/api/line/webhook`（簽章驗證）
- Email：`src/lib/email.ts`（Resend 或 SMTP，SMTP 設定含解密來自 settings）；`/api/email/send`（staff only，自動記 log）
- 訊息管理設計器模板 → `message_templates.email/line` jsonb；`src/lib/msg-templates.ts` 可把 LineFlex 結構轉成真正的 Flex Message JSON（工作流真實發送用）

## 重要共用模組

| 檔案 | 用途 |
|------|------|
| `src/lib/supabase/{client,server,admin,proxy}.ts` | Supabase clients（browser / SSR / service-role / middleware） |
| `src/lib/upload.ts` | dataURL → Storage `images` bucket → public URL |
| `src/lib/schedule.ts` | 班表文字展開月曆事件 |
| `src/app/m/_lib/coursesDb.ts` | 前台課程查詢/映射 |
| `src/app/m/_lib/studentsDb.ts` | 會員學員 + 票券餘額計算（「本人」為虛擬項） |
| `src/app/m/teacher/_lib/{useTeacher,teacherData}.ts` | 教師身分 hook、教師課程/場次展開 |
| `src/lib/onlineCoursesDb.ts` | 線上課程查詢 + YouTube ID 解析 |
| `src/lib/workflowStore.ts` / `msg-templates.ts` | 工作流 / 模板 DB 存取 |

## API Routes

| Route | 用途 |
|-------|------|
| `/api/auth/line`（+ `/callback`） | LINE OAuth（next / whoami 模式） |
| `/api/teacher/me` | 教師身分解析與自動綁定 |
| `/api/admin/params` | 系統設定 GET/POST（staff） |
| `/api/admin/members` | 會員/系統人員 CRUD（staff；`?scope=staff`） |
| `/api/member/transfer-tickets` | 課堂券轉讓（會員，伺服器端驗證） |
| `/api/line/send`、`/api/line/webhook`、`/api/email/send` | 訊息發送與接收 |
| `/api/public-params` | 前台公開參數（付款方式/功能開關） |

## 慣例

- `'use client'` 所有互動頁；async params 用 `use(params)` 解包
- 查詢一律單一 JOIN（PostgREST 巢狀 select），禁止迴圈打 DB（見 CLAUDE.md 死規矩）
- `maybeSingle()` 取代 `single()`；每個查詢檢查 `error`
- 圖片一律上傳 Storage `images` bucket（`uploadImage`），路徑或 public URL 皆可存
- 時間：DB 存 UTC，顯示轉台灣時間
- 管理員帳號：`admin`（`admin@findtheway.com`）；正式上線前更換密碼

## 部署（Vercel）

必要環境變數：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、
`SETTINGS_ENCRYPTION_KEY`（與本機同一把）、`NEXT_PUBLIC_BASE_URL`（LINE callback 用）。
LINE Developers Console 需登記正式站 callback / webhook URL。
