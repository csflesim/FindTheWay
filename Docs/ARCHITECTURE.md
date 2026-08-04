# 忙碌不迷路藝術工作坊 (Find the Way) — 專案架構文件

> 技術規範與資料模型細節以根目錄 **AGENTS.md** 為準（AI 開發每次載入）。
> 本文件提供人類閱讀的入口導覽與系統關係圖。

技術棧：**Next.js App Router + Supabase**（Postgres / Auth / Storage / RLS）＋ Tailwind CSS，部署於 Vercel。
所有頁面直接讀寫 Supabase，無 mock 資料；schema 在 `supabase/schema.sql`。

---

## 1. 系統入口總覽

| 入口 | 路徑 | 裝置 | 身分 |
|------|------|------|------|
| 品牌官網 | `/` | 桌面 / 手機 | 公開 |
| 會員專區 | `/m` | Mobile-first | 公開瀏覽；個人頁需 LINE 登入 |
| 教師專區 | `/m/teacher` | Mobile-first | 教師（Email 密碼或 LINE） |
| 管理後台 | `/sys-admin` | 桌面優先 | staff / admin |

路由守門：`src/proxy.ts`（middleware）強制後台角色與會員個人頁登入；教師區由 `useTeacher` hook 守門。

---

## 2. Sitemap

### 品牌官網 `/`
```text
/            首頁
├── /about   關於我們
└── /service 服務項目
```

### 會員專區 `/m`
```text
/m                       首頁（banners 表輪播＋開課中課程）
├── /m/login             LINE 登入（OAuth → 自動建 profile）
├── /m/courses           課程列表（分類篩選）
│   └── /m/courses/[id]  課程詳情＋報名（單堂直購 / 課堂券扣抵 → orders）
├── /m/orders            訂單 & 課堂券餘額（RLS 限本人）
├── /m/profile           我的（真實頭貼/統計/名下學員）
├── /m/settings          帳號設定（改名、改密碼、LINE 綁定、登出）
├── /m/students          名下學員（「本人」為虛擬項）
│   ├── /m/students/[id] 學員詳情＋報名紀錄
│   └── /m/students/add  新增學員（→ 待審核）
├── /m/tickets/buy       購買課堂券（products 表）
├── /m/tickets/transfer  轉讓課堂券（經 server API 驗證）
└── /m/online-courses    線上課程目錄
    └── /[id]            課程詳情＋自製播放器（免費試看鎖定）
```

### 教師專區 `/m/teacher`
```text
/m/teacher               課表（清單/日/週/月，由 courses.schedule 推導；
│                          可排課時段來自後台「參數管理→上課時間」）
├── /m/teacher/login     教師登入（Email 密碼或 LINE，自動綁定教師檔）
├── /m/teacher/attendance 點名（近 7 天場次；出席自動核銷課堂券、改缺席退券）
├── /m/teacher/availability 請假時段（teacher_availability）
└── /m/teacher/profile   我的（真實統計＋點名紀錄＋登出）
```

### 管理後台 `/sys-admin`
```text
/sys-admin                    總覽（真統計：會員/學員/券/收入/即將開課）
├── login                     後台登入（帳號 admin 自動補網域）
├── accounts                  會員管理（auth 帳號 CRUD＋名下學員）
├── students                  學員管理（審核佇列、內部/外部、出席紀錄）
├── teachers                  教師管理（頭貼、課表、LINE 綁定、登入密碼開通）
├── units / classrooms        單位、教室（含課表月曆）
├── courses                   課堂管理（內部/外部、班表、圖片、點名）
├── online-courses            線上課程（小節、分類、推薦）
├── roster                    出席管理（course_attendance）
├── tickets                   商品管理（課堂券組合 products）
├── orders                    訂單管理（確認付款→發券/核銷扣抵/觸發工作流）
├── aftersales / vouchers     售後歷史、卡券總覽
├── finance                   帳務（全由訂單即時推導）
├── messages                  訊息管理（Flex/Email 設計器、直接發送、發送歷史）
├── line-workflows            訊息工作流（事件觸發＋測試觸發真實發送）
├── display/mobile-banner     手機版廣告圖（banners）
└── system/ members·roles·params  人員、角色（RLS 對照）、參數
```

---

## 3. 核心資料流

```text
會員報名/購券 ──▶ orders(待確認) ──▶ 後台確認付款 ──┬▶ 券包：發 tickets（含效期）
                                                  ├▶ 扣抵：核銷來源券 1 張
                                                  ├▶ 同步 courses.enrolled
                                                  └▶ 觸發工作流（LINE/Email 通知）
教師點名(出席) ──▶ course_attendance ──▶ 自動核銷該學員 1 張券（改缺席自動退回）
售後 ──▶ 收回票券(已失效) ＋ 訂單(已售後) ＋ after_sales 記錄
```

事件觸發引擎：`src/lib/workflow-engine.ts`；核銷 API：`/api/attendance/save`、`/api/orders/confirm`。

---

## 4. 設定與金鑰

系統設定存 `settings` 表（Vercel 唯讀檔案系統，不可寫檔）：
`pay_methods`、`features`、`business_hours`（上課時間）、`line_login`、`line_msg`、`smtp`。
敏感值以 AES-256-GCM 加密（env `SETTINGS_ENCRYPTION_KEY`）。
通知排程（課前提醒）待與 Cron 功能整併。

部署環境變數：Supabase 三把 key、`SETTINGS_ENCRYPTION_KEY`、`NEXT_PUBLIC_BASE_URL`。
