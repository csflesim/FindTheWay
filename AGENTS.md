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
│   │   └── [id]/page.tsx           # 課程詳情（資訊、老師、介紹、單堂直購報名）
│   ├── orders/page.tsx             # 訂單紀錄（'use client'，讀 localStorage）
│   ├── profile/page.tsx            # 我的（學員清單、課堂券統計）
│   ├── settings/page.tsx           # 帳號設定（改名、密碼、通知、LINE）
│   ├── students/
│   │   ├── page.tsx                # 學員管理列表
│   │   ├── [id]/page.tsx           # 學員詳情
│   │   └── add/page.tsx            # 新增學員
│   ├── tickets/
│   │   ├── buy/page.tsx            # 購買課堂券（'use client'，寫 localStorage）
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
    ├── orders/page.tsx             # 訂單管理（讀寫 localStorage）
    ├── aftersales/page.tsx         # 售後管理（唯讀歷史，從訂單管理發起）
    ├── vouchers/page.tsx           # 卡券管理（讀 localStorage，含有效期限欄）
    ├── finance/page.tsx            # 帳務管理
    ├── display/
    │   └── mobile-banner/page.tsx  # 展示管理 — 手機版廣告圖（排序、啟停用）
    ├── system/
    │   ├── members/page.tsx        # 系統人員管理
    │   ├── roles/page.tsx          # 角色管理
    │   └── params/page.tsx         # 參數管理
    ├── _lib/
    │   ├── orders.tsx              # 型別、INITIAL_ORDERS、輔助函式、OrderDetail 元件
    │   └── aftersales.tsx          # AfterSalesPanel 共用元件
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

---

## localStorage 共用狀態一覽

| key | 格式 | 寫入方 | 讀取方 |
|-----|------|--------|--------|
| `ftw.orders.v1` | `Order[]` | `/m/courses/[id]`、`/m/tickets/buy`、`/m/orders`、`/sys-admin/orders` | 同左 + `/sys-admin/aftersales`、`/sys-admin/vouchers` |
| `ftw.students.v1` | `StudentRequest[]` | `/m/students/add` | `/m/profile`、`/sys-admin/students` |
| `ftw.params.v1` | `{ payMethods: string[], features: { onlineCourse: boolean } }` | `/sys-admin/system/params` | `/m/courses/[id]`、`/m/components/MobileNav` |

---

## 學員審核系統（localStorage `ftw.students.v1`）

### 型別

```ts
type StudentRequest = {
  id: string          // "REQ-001"
  name: string
  age: number
  relation: "子女" | "配偶" | "其他"   // 不含「本人」
  account: string     // 申請人帳號（目前固定 "賴大紫"）
  submittedAt: string // "YYYY/MM/DD HH:mm"
  status: "待審核" | "已核准" | "已拒絕"
}
```

### 流程

1. 前台 `/m/students/add`：關係選項僅 子女 / 配偶 / 其他（本人不可新增），送出寫入 `ftw.students.v1`，`status: "待審核"`
2. 前台 `/m/profile`：mount 時讀取，過濾 `status === "待審核"` 顯示橘色待審核卡片
3. 後台 `/sys-admin/students`：mount 時讀取，頂部顯示「待審核申請」區塊
   - 「核准」→ 新增至內部學員列表 + 寫回 `status: "已核准"`
   - 「拒絕」→ 寫回 `status: "已拒絕"`，從待審核消失

---

## 參數設定（localStorage `ftw.params.v1`）

```ts
// ftw.params.v1 完整結構
{
  payMethods: string[],          // 啟用的付款方式
  features: {
    onlineCourse: boolean        // 線上課程功能開關，default true
  }
}
```

### 付款設定

後台 `/sys-admin/system/params` → 付款設定：勾選啟用的付款方式，即時存入 `ftw.params.v1.payMethods`。  
前台 `/m/courses/[id]` 報名確認 modal mount 時讀取，fallback 為 `["銀行轉帳", "現金"]`。  
至少保留一項（最後一項無法取消勾選）。

### 功能開關

後台 `/sys-admin/system/params` → 功能開關 → 線上課程 toggle，即時寫入 `ftw.params.v1.features.onlineCourse`。  
`MobileNav` mount 時讀取，`false` 時從底部 tab 過濾掉「線上課」，導覽列從 5 tab 縮為 4 tab。

### LINE 登入設定 / LINE 訊息設定 / Email 設定（SMTP）

點頁面頂部「儲存變更」後呼叫 `POST /api/admin/params`，分別寫入各自的 config 檔，**即時生效不需重啟**。

| 區塊 | 欄位 | 存入 |
|------|------|------|
| LINE 登入設定 | `line_channel_id`、`line_channel_secret`、`line_liff_id` | `data/line-login-config.json` |
| LINE 訊息設定 | `line_msg_channel_id`、`line_msg_channel_secret`、`line_access_token` | `data/line-msg-config.json` |
| Email 設定（SMTP）| `smtp_host`、`smtp_port`、`smtp_user`、`smtp_pass`、`smtp_from` | `data/smtp-config.json` |

env vars 優先級高於 config 檔（`LINE_CHANNEL_ID`、`LINE_MSG_CHANNEL_ID`、`SMTP_HOST` 等）。

**敏感欄位加密**：`channelSecret`、`accessToken`、`smtp_pass` 落地前由 `src/lib/secret-crypto.ts` 以 AES-256-GCM 加密（格式 `enc:v1:...`），金鑰在 env `SETTINGS_ENCRYPTION_KEY`（`openssl rand -base64 32`，本機與 Vercel 需同一把）。讀取時自動解密，舊明文檔案相容（passthrough）。

**LINE 登入加好友**：`buildLineAuthUrl()` 帶 `bot_prompt=normal`，授權後跳加好友對話框。需在 LINE Developers Console 將 Login Channel 的「Linked OA」設定連結 Official Account，否則參數被忽略。

---

## 訂單 / 課堂券系統（localStorage `ftw.orders.v1`）

### 讀寫頁面

前台（`/m`）與後台（`/sys-admin`）共用同一個 key。格式為 `Order[]` JSON。

| 頁面 | 讀 | 寫 |
|------|----|----|
| `/m/courses/[id]` | 讀取現有訂單計算下一個 ORD 號 | 新增「待確認」訂單（單堂直購） |
| `/m/tickets/buy` | 讀取現有訂單計算下一個 ORD 號 | 新增「待確認」訂單（課堂券包） |
| `/m/orders` | 過濾 `account === "賴大紫"` 顯示 | 更新訂單為「已取消」 |
| `/sys-admin/orders` | mount 時讀入；首次讀入若空則 seed INITIAL_ORDERS | 確認付款、取消、售後處理後寫回 |
| `/sys-admin/aftersales` | 過濾 `payStatus === "已售後"` 唯讀顯示 | — |
| `/sys-admin/vouchers` | 展開所有訂單的票券 | — |

---

### 核心型別（定義在 `sys-admin/_lib/orders.tsx`）

```ts
export type PayStatus = "已付款" | "待確認" | "已退款" | "已取消" | "已售後"

export type Ticket = {
  no: string          // e.g. "TK-0041-01"
  used: boolean
  voided?: boolean    // 售後收回時設為 true
  expiresAt?: string  // "YYYY/MM/DD"，依組合有效期計算
  transferredTo?: string
  usedByTransferee?: boolean
  changedAt?: string
  changedBy?: string
}

export type AfterSalesRecord = {
  refundAmount: number
  reclaimedTicketNos: string[]
  reason?: string
  processedAt?: string
}

export type Order = {
  id: string           // "ORD-XXXX"
  student: string
  account: string
  item: string         // 組合名稱，對應 PACKAGES
  qty: number
  amount: number
  date: string         // "MM/DD"
  payStatus: PayStatus
  payMethod?: string
  notes?: string
  tickets: Ticket[]
  afterSales?: AfterSalesRecord
}
```

### 票券輔助函式

```ts
// 判斷票券是否已失效（售後收回）——相容舊 localStorage 資料
function isVoided(t: Ticket): boolean {
  return !!t.voided || t.changedBy === "售後收回"
}

// 判斷票券是否已消耗（不可再使用）
export function ticketConsumed(t: Ticket): boolean {
  return !!t.voided || t.changedBy === "售後收回" || t.used || (!!t.transferredTo && !!t.usedByTransferee)
}
```

> **注意**：舊版資料用 `changedBy === "售後收回"` 標記收回，新版改用 `voided: true`。
> 所有判斷必須同時檢查兩者，否則舊資料會顯示「已使用」而非「已失效」。

### 課堂券組合（PACKAGES）

定義在 `sys-admin/orders/page.tsx`，共用於確認付款與手動新增：

| 名稱 | 堂數 | 售價 | 有效月數 |
|------|------|------|---------|
| 單堂試課券 | 1  | 1,200 | 3  |
| 5堂精選包  | 5  | 5,500 | 6  |
| 10堂體驗包 | 10 | 9,800 | 12 |
| 20堂年繳包 | 20 | 18,000 | 12 |

```ts
function calcExpiry(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`
}
```

確認付款時會根據組合的 `validityMonths` 算出 `expiresAt`，傳入 `makeTickets` 第 6 個參數。

### 報名 / 購買入口

會員有兩條報名路徑，最終都產生同樣格式的 `Order`，流向後台訂單管理：

| 路徑 | 入口 | `item` 值 | `qty` | `notes` | `tickets` |
|------|------|-----------|-------|---------|-----------|
| 單堂直購 | `/m/courses/[id]` → 立即報名 | 課程名稱（e.g. `"基礎水彩入門"`） | 1 | `"單堂直購"` | `[]` |
| 課堂券包 | `/m/tickets/buy` → 確認購買 | 組合名稱（e.g. `"10堂體驗包"`） | 組合堂數 | `"前台下單"` | `[]` |

兩者 `payStatus` 均為 `"待確認"`，後台確認付款時：
- **課堂券包**：比對 PACKAGES 取得 `validityMonths`，呼叫 `makeTickets` 產生票券並設 `expiresAt`
- **單堂直購**：`item` 不在 PACKAGES 內 → `expiresAt` 為 undefined，`tickets` 維持 `[]`，不產生卡券

> 因此卡券管理（`/sys-admin/vouchers`）只會出現券包訂單的票券，單堂直購訂單不會有票券。

### 售後流程

1. 管理員在訂單管理點擊訂單 → `OrderDetail`
2. 若訂單為「已付款」且有已消耗票券 → footer 顯示「發起售後」按鈕
3. 點擊後關閉 `OrderDetail`，開啟 `AfterSalesPanel`（來自 `_lib/aftersales.tsx`）
4. 選擇要收回的未使用票券、填入退款金額（建議值自動計算）、選填原因
5. 確認後不可撤銷：被選票券設 `voided: true, changedBy: "售後收回"`；訂單 `payStatus → "已售後"`；寫入 `afterSales` 記錄
6. 售後管理頁（`/sys-admin/aftersales`）為純歷史列表，只顯示已完成的「已售後」訂單，不在此頁發起

### INITIAL_ORDERS（ORD-0036 ～ ORD-0042）

| 訂單 | 學員 | 組合 | 狀態 | expiresAt |
|------|------|------|------|-----------|
| ORD-0042 | 林小雅 | 5堂精選包  | 待確認 | — |
| ORD-0041 | 鄭小德 | 10堂體驗包 | 已付款 | 2027/06/13 |
| ORD-0040 | 賴大紫 | 5堂精選包  | 已付款 | 2026/12/12 |
| ORD-0039 | 鄭小明 | 單堂試課券 | 已付款 | 2026/09/10 |
| ORD-0038 | 賴小紫 | 10堂體驗包 | 已付款 | 2027/06/09 |
| ORD-0037 | 鄭小德 | 10堂體驗包 | 已付款 | 2027/06/05 |
| ORD-0036 | 賴小柏 | 10堂體驗包 | 已付款 | 2027/06/01 |
