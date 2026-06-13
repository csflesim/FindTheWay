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
/m               首頁（Banner + 課程分類 + 課程卡列表）
├── /m/courses   課程列表（分類篩選 + 大圖課程卡）
├── /m/orders    訂單 & 課堂券（黑底餘額卡 + 報名紀錄）
└── /m/profile   我的（Profile card + 快速操作 + 學生列表 + 選單）
```

### 教師專區 `/m/teacher`

```text
/m/teacher               行事曆（清單 / 日 / 週 / 月 四模式）
├── /m/teacher/attendance  點名（選課程 + 學生狀態切換）
├── /m/teacher/availability 請假管理（不可出席時段列表 + 新增表單）
└── /m/teacher/profile     教師我的（本月統計 + 出席歷史）
```

### 管理後台 `/sys-admin`

```text
/sys-admin                總覽 Dashboard（統計卡 + 最新訂單 + 即將開課）
├── /sys-admin/accounts   帳號管理（會員帳號 + 關聯學生）
├── /sys-admin/students   學員管理（學生列表 + 課堂券餘額）
├── /sys-admin/teachers   教師管理（教師列表 + 行事曆 modal）
├── /sys-admin/courses    課程管理（課程列表 + 報名進度）
├── /sys-admin/tickets    商品管理（課堂券組合上下架）
├── /sys-admin/orders     訂單管理（訂單列表 + 狀態）
├── /sys-admin/finance    帳務管理（收入統計 + 交易明細 + 日期篩選）
├── /sys-admin/roster     出席管理（依課程分組出席名單）
└── /sys-admin/system     系統管理（可展開群組）
    ├── /sys-admin/system/members  人員管理（後台帳號 + 角色）
    ├── /sys-admin/system/roles    角色管理（權限矩陣）
    └── /sys-admin/system/params   參數管理（分組可編輯參數）
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
│       │   ├── page.tsx
│       │   ├── courses/page.tsx
│       │   ├── orders/page.tsx
│       │   ├── profile/page.tsx
│       │   ├── components/
│       │   │   └── MobileNav.tsx
│       │   └── teacher/                # 教師專區
│       │       ├── layout.tsx          # 含 AvailabilityProvider + TeacherNav
│       │       ├── page.tsx            # 行事曆（清單/日/週/月）
│       │       ├── attendance/page.tsx
│       │       ├── availability/page.tsx
│       │       ├── profile/page.tsx
│       │       ├── components/
│       │       │   └── TeacherNav.tsx
│       │       └── context/
│       │           └── AvailabilityProvider.tsx
│       │
│       └── sys-admin/                  # 管理後台
│           ├── layout.tsx              # Sidebar + main
│           ├── page.tsx                # Dashboard
│           ├── accounts/page.tsx
│           ├── students/page.tsx
│           ├── teachers/page.tsx       # 含行事曆 modal（client component）
│           ├── courses/page.tsx
│           ├── tickets/page.tsx
│           ├── orders/page.tsx
│           ├── finance/page.tsx        # 含日期篩選（client component）
│           ├── roster/page.tsx
│           ├── system/
│           │   ├── members/page.tsx
│           │   ├── roles/page.tsx
│           │   └── params/page.tsx
│           └── components/
│               └── AdminNav.tsx        # 響應式側欄 + 系統管理可展開群組
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
