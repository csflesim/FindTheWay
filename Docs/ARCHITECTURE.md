# 忙碌不迷路藝術工作坊 (Find the Way Art) — 專案架構文件

本文件記錄整套系統的入口架構、目錄結構與技術選型。

---

## 1. 系統入口總覽

| 入口 | 路徑 | 裝置 | 說明 |
|------|------|------|------|
| 品牌官網 | `/` | 桌面 / 手機 | 展示用品牌網站 |
| 學員專區 | `/m` | Mobile-first | 會員購券、報名、查訂單 |
| 教師專區 | `/m/teacher` | Mobile-first | 教師行事曆、點名、請假 |
| 管理後台 | `/sys-admin` | 桌面優先 | 課程、學員、財務全功能後台 |

---

## 2. 完整 Sitemap

### 品牌官網 `/`

```text
/                首頁（Hero + 服務摘要）
├── /about       關於我們（品牌願景、核心價值）
└── /service     服務項目（工作坊、委託、策展、流程）
```

### 學員專區 `/m`

```text
/m                       首頁（Banner 輪播廣告圖 + 課程分類 + 課程卡列表）
├── /m/login             登入 / 註冊
├── /m/courses           課程列表（分類篩選 + 大圖課程卡）
│   └── /m/courses/[id]  課程詳情（圖片、資訊卡、授課老師、介紹、重點、單堂直購報名）
├── /m/orders            訂單 & 課堂券（讀 localStorage、待確認訂單可取消）
├── /m/profile           我的（Profile card + 快速操作 + 學員列表含待審核 + 選單）
├── /m/settings          帳號設定（改名、密碼、通知 toggle、LINE 綁定）
├── /m/students          學員管理
│   ├── /m/students/[id] 學員詳情
│   └── /m/students/add  新增學員
└── /m/tickets
    ├── /m/tickets/buy      購買課堂券
    └── /m/tickets/transfer 轉讓課堂券（步驟式流程）
```

### 教師專區 `/m/teacher`

```text
/m/teacher                  行事曆（清單 / 日 / 週 / 月 四模式）
├── /m/teacher/login        教師登入
├── /m/teacher/attendance   點名（出席 / 缺席，缺席可選延期補課 / 不延期）
├── /m/teacher/availability 請假管理（不可出席時段列表 + 新增表單）
└── /m/teacher/profile      教師我的（本月統計 + 出席歷史）
```

### 管理後台 `/sys-admin`

```text
/sys-admin                           總覽 Dashboard（統計卡 + 最新訂單 + 即將開課）
├── /sys-admin/login                 後台登入
│
├── [人員管理]
│   ├── /sys-admin/accounts          帳號管理（會員帳號 + 關聯學生）
│   ├── /sys-admin/students          學員管理（含與帳號者關係欄位）
│   └── /sys-admin/teachers          教師管理（頭貼上傳、課表月曆 modal）
│
├── [課程管理]
│   ├── /sys-admin/units             單位管理
│   ├── /sys-admin/classrooms        教室管理
│   ├── /sys-admin/courses           課程管理（內部/外部、圖片、介紹、重點）
│   └── /sys-admin/roster            出席管理（出席/缺席/延期）
│
├── [經營管理]
│   ├── /sys-admin/tickets           商品管理（課堂券組合上下架）
│   ├── /sys-admin/orders            訂單管理（讀寫 localStorage、確認付款、取消、發起售後）
│   ├── /sys-admin/aftersales        售後管理（唯讀歷史列表，從訂單管理發起）
│   ├── /sys-admin/vouchers          卡券管理（讀 localStorage、含有效期限欄）
│   └── /sys-admin/finance           帳務管理（收入統計 + 交易明細 + 日期篩選）
│
├── [展示管理]
│   └── /sys-admin/display/mobile-banner  手機版廣告圖（排序、啟停用、上傳）
│
└── [系統管理]
    ├── /sys-admin/system/members    人員管理（後台帳號 + 角色）
    ├── /sys-admin/system/roles      角色管理（權限矩陣）
    └── /sys-admin/system/params     參數管理（上課時間 / 通知 / 付款 / 功能開關 / LINE登入 / LINE訊息 / SMTP）
```

---

## 3. 專案目錄結構

```text
Findtheway/
├── Docs/
│   ├── ARCHITECTURE.md      # 本文件
│   └── class-system.md      # 系統規劃與功能文件
├── src/
│   └── app/
│       ├── globals.css
│       ├── layout.tsx
│       ├── page.tsx                    # 品牌首頁
│       ├── about/page.tsx
│       ├── service/page.tsx
│       │
│       ├── m/                          # 學員專區
│       │   ├── layout.tsx              # 含 MobileNav（/m/teacher 路徑下自動隱藏）
│       │   ├── page.tsx                # 首頁（Banner 輪播 + 課程列表）
│       │   ├── login/page.tsx
│       │   ├── courses/
│       │   │   ├── page.tsx
│       │   │   └── [id]/page.tsx
│       │   ├── orders/page.tsx
│       │   ├── profile/page.tsx
│       │   ├── settings/page.tsx
│       │   ├── students/
│       │   │   ├── page.tsx
│       │   │   ├── [id]/page.tsx
│       │   │   └── add/page.tsx        # 送出申請→ftw.students.v1，需後台審核
│       │   ├── tickets/
│       │   │   ├── buy/page.tsx
│       │   │   └── transfer/page.tsx
│       │   ├── _lib/
│       │   │   ├── courses.ts          # 課程 mock（5 堂，含圖片路徑、desc、highlights）
│       │   │   └── students.ts         # 學員 mock（本人 3 券、賴小柏 7 券、賴小紫 1 券）
│       │   ├── components/
│       │   │   └── MobileNav.tsx
│       │   └── teacher/                # 教師專區
│       │       ├── layout.tsx          # 含 AvailabilityProvider + TeacherShell
│       │       ├── page.tsx            # 行事曆（清單/日/週/月）
│       │       ├── login/page.tsx
│       │       ├── attendance/page.tsx # 出席/缺席＋延期/不延期
│       │       ├── availability/page.tsx
│       │       ├── profile/page.tsx
│       │       └── components/
│       │           └── TeacherShell.tsx
│       │
│       └── sys-admin/                  # 管理後台
│           ├── layout.tsx              # Sidebar + main
│           ├── page.tsx                # Dashboard
│           ├── login/page.tsx
│           ├── accounts/page.tsx
│           ├── students/page.tsx       # 含與帳號者關係欄位
│           ├── teachers/page.tsx       # 含頭貼上傳、行事曆 modal
│           ├── units/page.tsx
│           ├── classrooms/page.tsx
│           ├── courses/page.tsx        # 含圖片上傳、課程介紹、課程重點
│           ├── tickets/page.tsx
│           ├── orders/page.tsx         # 讀寫 localStorage（ftw.orders.v1）
│           ├── aftersales/page.tsx     # 唯讀售後歷史
│           ├── vouchers/page.tsx       # 讀 localStorage，含有效期限欄
│           ├── finance/page.tsx
│           ├── roster/page.tsx         # 出席/缺席/延期
│           ├── display/
│           │   └── mobile-banner/page.tsx  # 手機版廣告圖管理
│           ├── system/
│           │   ├── members/page.tsx
│           │   ├── roles/page.tsx
│           │   └── params/page.tsx     # 上課時間/通知/付款/功能開關/LINE登入/LINE訊息/SMTP
│           ├── _lib/
│           │   ├── orders.tsx          # 型別定義、INITIAL_ORDERS、輔助函式、OrderDetail 元件
│           │   └── aftersales.tsx      # AfterSalesPanel 共用元件
│           └── components/
│               ├── AdminNav.tsx        # 響應式側欄（6 群組可摺疊，含售後管理）
│               └── AdminShell.tsx
└── public/
```

---

## 4. 技術選型

| 項目 | 選用 |
|------|------|
| 框架 | Next.js 16 App Router |
| 樣式 | Tailwind CSS v4（`@import "tailwindcss"` + `@theme`） |
| 圖示 | lucide-react v1.14 |
| 認證 / DB | Supabase（Auth + PostgreSQL） |
| 部署 | Vercel（`csflesim` 帳號） |
| Git | SSH alias `github-csflesim` → `~/.ssh/id_ed25519_csflesim` |

---

## 5. 設計規範

### 色系

| 用途 | 值 |
|------|----|
| 品牌主色 | `#000000` |
| 頁面背景 | `#fafaf9`（學員 / 後台）|
| 卡片背景 | `#ffffff` |
| 邊框 | `#f0f0f0` |
| 分隔線 | `#f5f5f5` |
| 次要文字 | `#999` |
| 輔助文字 | `#aaa`、`#bbb` |

### Layout 規則

- `/m`、`/m/teacher`：手機版，底部固定 nav（高度預留 `pb-20`）
- `/m/teacher` 路徑下，`/m` 的 `MobileNav` 會 return null，避免雙層 nav
- `/sys-admin`：桌面側欄（`w-52` 黑底），手機 top bar + drawer overlay
- 後台所有頁面容器使用 `w-full`，不設 max-width
