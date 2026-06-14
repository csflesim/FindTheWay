<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 忙碌不迷路藝術工作坊 — 專案說明

## 專案概述

Next.js App Router 專案，分三個區域：公開網站、會員前台（`/m`）、管理後台（`/sys-admin`）。
所有資料目前為 mock，無真實 API。

## 目錄結構

```
src/app/
├── page.tsx                        # 公開首頁（landing）
├── about/page.tsx                  # 關於我們
├── service/page.tsx                # 服務介紹
│
├── m/                              # 會員前台
│   ├── page.tsx                    # 首頁（banner 輪播 + 課程列表）
│   ├── login/page.tsx              # 登入 / 註冊
│   ├── courses/
│   │   ├── page.tsx                # 課程列表（分類篩選）
│   │   └── [id]/page.tsx           # 課程詳情（資訊、老師、介紹、報名）
│   ├── orders/page.tsx             # 訂單紀錄
│   ├── profile/page.tsx            # 我的（學員清單、課堂券統計）
│   ├── settings/page.tsx           # 帳號設定（改名、密碼、通知、LINE）
│   ├── students/
│   │   ├── page.tsx                # 學員管理列表
│   │   ├── [id]/page.tsx           # 學員詳情
│   │   └── add/page.tsx            # 新增學員
│   ├── tickets/
│   │   ├── buy/page.tsx            # 購買課堂券
│   │   └── transfer/page.tsx       # 轉移課堂券（步驟式流程）
│   ├── teacher/                    # 教師子區域
│   │   ├── page.tsx                # 教師首頁
│   │   ├── login/page.tsx          # 教師登入
│   │   ├── profile/page.tsx        # 教師個人資料
│   │   ├── attendance/page.tsx     # 點名（出席 / 缺席＋延期選項）
│   │   └── availability/page.tsx   # 排班可用時間
│   └── _lib/
│       ├── courses.ts              # 課程 mock 資料（5 堂）
│       └── students.ts             # 學員 mock 資料（本人＋子女）
│
└── sys-admin/                      # 管理後台
    ├── page.tsx                    # 總覽 Dashboard
    ├── login/page.tsx              # 後台登入
    ├── accounts/page.tsx           # 帳號管理（人員管理）
    ├── students/page.tsx           # 學員管理（含關係欄位）
    ├── teachers/page.tsx           # 教師管理（頭貼、課表月曆）
    ├── units/page.tsx              # 單位管理
    ├── classrooms/page.tsx         # 教室管理
    ├── courses/page.tsx            # 課堂管理（內部／外部、圖片、介紹）
    ├── roster/page.tsx             # 出席管理（出席／缺席／延期）
    ├── tickets/page.tsx            # 商品管理（課堂券）
    ├── orders/page.tsx             # 訂單管理
    ├── vouchers/page.tsx           # 卡券管理
    ├── finance/page.tsx            # 帳務管理
    ├── display/
    │   └── mobile-banner/page.tsx  # 展示管理 — 手機版廣告圖（排序、啟停用）
    ├── system/
    │   ├── members/page.tsx        # 系統人員管理
    │   ├── roles/page.tsx          # 角色管理
    │   └── params/page.tsx         # 參數管理
    ├── _lib/
    │   └── orders.tsx              # 訂單 mock 資料（含課堂券餘額）
    └── components/
        ├── AdminNav.tsx            # 後台側邊欄（可摺疊群組）
        └── AdminShell.tsx          # 後台 layout shell
```

## Mock 資料 / 帳號

| 角色 | 名稱 | 帳號 | 頭貼 |
|------|------|------|------|
| 會員 | 賴大紫 | purple@findtheway.com | `/image/purple.jpg` |
| 教師／管理員 | 鄭明德 | mingdez@findtheway.com | `/image/mingdez.jpg` |

### 課程（5 堂，全部由小紫老師＋明德老師共同授課）

| id | 名稱 | 圖片前綴 |
|----|------|---------|
| 1 | 基礎水彩入門 | `watercolor` |
| 2 | 兒童創意素描 | `sketch` |
| 3 | 成人油畫工作坊 | `oilpainting` |
| 4 | 親子藝術探索 | `FamilyArt` |
| 5 | 水墨入門體驗 | `inkpainting` |

圖片命名規則：`{前綴}800x800.png`（方圖）、`{前綴}1200x400.png`（橫圖 3:1）

### 廣告 Banner（前台首頁輪播）

順序：`banner2.png` → `banner1.png` → 課程橫圖 × 3
管理入口：`/sys-admin/display/mobile-banner`

## 共用元件

- `src/app/m/components/MobileNav.tsx` — 前台底部 tab bar
- `src/app/m/teacher/components/TeacherShell.tsx` — 教師區域 shell
- `src/app/sys-admin/components/AdminNav.tsx` — 後台導覽（側邊欄＋手機漢堡）
- `src/app/sys-admin/components/AdminShell.tsx` — 後台 layout shell

## 慣例

- `'use client'` 所有互動元件都有
- async params 用 `use(params)` 解包（App Router 規範）
- 圖片一律 PNG（含文字的 banner 不用 JPG 壓縮）
- 老師頭貼對照表：`TEACHER_PHOTOS` 定義在各需要的頁面（`/m/page.tsx`、`/m/courses/page.tsx`、`/m/courses/[id]/page.tsx`）
