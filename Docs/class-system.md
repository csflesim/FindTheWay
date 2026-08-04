# 學員管理系統規劃文件

## 系統入口

| 入口 | 路徑 | 裝置 | 說明 |
|------|------|------|------|
| 展示網站 | `findtheway.com/` | 通用 | 品牌官網 |
| 學員專區 | `findtheway.com/m` | Mobile-first | 會員 / 學員管理 |
| 教師專區 | `findtheway.com/m/teacher` | Mobile-first | 教師行事曆與點名 |
| 管理後台 | `findtheway.com/sys-admin` | 桌面優先 | 全功能管理後台 |

---

## 帳號與身份架構

### 帳號類型

一個帳號的身份可以同時是**會員**與**學生**，並非互斥。

| 身份 | 說明 |
|------|------|
| 會員 (Member) | 主帳號持有人，可管理學生、購買課堂券 |
| 學生 (Student) | 實際上課的人，可掛在主帳號下，也可以是主帳號本人 |
| 教師 (Teacher) | 獨立帳號，登入 `/m/teacher` |
| 後台人員 (Admin) | 登入 `/sys-admin`，依角色決定存取範圍 |

### 一帳號多學生

類似 trip.com 旅客管理邏輯：

```
主帳號 (Member)
├── 本人（也可以是學生）
├── 學生 A
├── 學生 B
└── 學生 C
```

- 主帳號可代替任一名下學生購買課堂券、報名課程
- 學生本身不需要獨立帳號

---

## 課堂券系統

### 購買流程

```
購買課堂券組合 → 持有券包 → 進入指定課程報名 → 抵用課堂券 → 完成報名
```

> 購買券後**不等於**報名課程，還需要主動到每堂課程頁面報名並抵用。

### 課堂券組合欄位

| 欄位 | 說明 |
|------|------|
| 組合名稱 | 例：「10堂體驗包」、「單堂試課」 |
| 堂數 (quantity) | 一個 set 含多少堂 |
| 價格 | 組合售價 |
| 可轉讓 (transferable) | 是否允許轉讓給其他帳號下的學生 |
| 有效期限 | 從購買日起算幾個月，0 表示不過期 |
| 上架狀態 | 上架中 / 已下架 |

### 課堂券狀態

| 狀態 | 說明 |
|------|------|
| 未使用 | 購入後尚未抵用 |
| 已使用 | 已報名特定課程並扣除 |
| 已轉讓 | 轉讓給其他學生（僅限可轉讓券） |
| 已失效 | 售後作業收回（`voided: true`），紅底顯示 |
| 已過期 | 超過有效期限（`expiresAt` 早於今日） |

> 每張票券有獨立 `expiresAt`（YYYY/MM/DD），依購買組合的有效月數從確認付款日起算。

### 帳務結算邏輯

每張訂單金額會**平均分攤**至每張課堂券：

- **使用結算金額**：區間內已服務課堂對應的分攤金額總和
- **未使用餘額**：區間終點時，尚未服務的課堂券對應分攤金額

---

## 學員專區（`/m`）

底部固定導覽 **4–5 tab**：`首頁` | `實體課` | `線上課`（受功能開關控制）| `訂單` | `我的`  
`MobileNav` mount 時讀取 `ftw.params.v1.features.onlineCourse`，`false` 時隱藏「線上課」tab，變為 4 tab。

### `/m/login` 登入 / 註冊
- Tab 切換：登入 / 註冊
- 登入：Email + 密碼，或點「使用 LINE 登入」按鈕
- 註冊：姓名 + Email + 密碼 + 確認密碼，或點「使用 LINE 註冊」按鈕
- LINE 登入流程：`/api/auth/line` → LINE OAuth 授權（含 `bot_prompt=normal` 加好友彈窗）→ `/api/auth/line/callback` → 設定 session cookie → 導向 `/m`
- 錯誤時帶 `?error=` query 顯示提示訊息

### `/m` 首頁
- sticky header：品牌名稱 + 登入按鈕
- **Banner 輪播廣告圖**：自動 3.5 秒切換、點擊左右區域手動切換、圓點指示器、可設定連結
- 課程分類 tab 橫向滑動：全部 / 素描 / 水彩 / 油畫 / 兒童美術 / 親子
- 近期課程卡片列表（小頭貼堆疊 + 老師名稱 + 時間）

### `/m/courses` 實體課列表
- 頂部分類 tab 篩選
- 大圖課程卡（橫圖 `aspect-[3/1]`）：老師頭貼堆疊、年齡標籤、時間、剩餘名額、報名按鈕

### `/m/courses/[id]` 實體課詳情
- 橫圖（`object-contain object-bottom`）+ 返回鍵
- 標題、分類、年齡標籤
- 雙欄資訊卡：課程資訊（時間/地點/名額）+ 授課老師（頭貼＋姓名，超過2人可橫捲）
- 課程介紹、課程重點（CheckCircle2 list）
- 固定底部：「單堂直購」價格 + **立即報名** 按鈕
- 點擊報名 → 底部 sheet 確認（課程摘要 + 付款說明 + 匯款帳號）
- 確認後寫入 `ftw.orders.v1` localStorage：`payStatus: "待確認"`, `notes: "單堂直購"`, `tickets: []`
- 成功畫面：查看訂單 / 繼續瀏覽課程

### `/m/online-courses` 線上課列表
- 搜尋欄 + 通知鈴鐺
- 分類 chip 橫向滑動（全部 / AI諮詢 / 直播營銷 / 創造力 / 實體零售）
- **免費課程**：大圖卡 `aspect-[3/1]`，評分星數、免費標籤
- **系列課**：列表行，縮圖 + 標題 + 節數 + 收費標籤

### `/m/online-courses/[id]` 線上課詳情 & 播放器
- 頂部影片播放器（YouTube IFrame API，`youtube-nocookie.com`）
  - `controls: 0` 隱藏所有 YouTube 原生控制項
  - 全透明點擊遮罩（z-10）阻擋所有 YouTube UI 互動
  - 自訂控制列（z-20）：◀10 · 暫停/播放 · ▶10 · 進度條 · 時間 · 速度（0.5x/1x/1.5x/2x）· 畫質 · 全螢幕
  - 暫停時黑底遮罩蓋住 YouTube 建議面板
  - 未播放前顯示後台設定的封面圖
  - Video ID 以 XOR+base64 編碼存於 `src/app/m/_lib/online-courses.ts`，`decVid()` 於 runtime 解碼
- 簡介 / 評價 tab
- 目錄：橫向卡片，免費可看 / 付費鎖定
- 推薦課程列表

### `/m/orders` 訂單 & 課堂券
- 課堂券餘額卡（黑底）：學生、組合名、剩餘 / 總堂數、可轉讓標籤
- 報名紀錄列表
- **訂單記錄**：從 `ftw.orders.v1` localStorage 讀取，過濾 `account === "賴大紫"`
  - 待確認訂單顯示「取消訂單」按鈕 → 底部 sheet 二次確認 → 更新 localStorage 為「已取消」

### `/m/profile` 我的
- Profile card（灰底）：頭像、帳號名、統計（課堂券餘額 / 學員數 / 完成課程）
- 快速操作 4 格：購買課堂券 / 管理學員 / 報名課程 / 出席紀錄
- 名下學員橫向卡片列表：
  - 已審核學員：頭像、姓名、年齡、剩餘券數，點擊進入學員詳情
  - **待審核學員**（`ftw.students.v1` 中 `status === "待審核"`）：橘色邊框卡片，顯示「待審核」badge，不可點擊
  - 名下學員統計數字包含待審核人數
- 功能選單：我的學員 / 購買課堂券 / 轉讓課堂券 / 帳號設定

### `/m/settings` 帳號設定
- 帳號資料：inline 姓名編輯、密碼修改（顯示/隱藏切換）
- 通知設定：toggle 開關（課程提醒 / 行政通知）
- LINE 綁定狀態列
- 登出（底部 sheet 二次確認）

### `/m/students` 學員管理
- 學員列表（含關係標籤：本人/子女/配偶/其他）
- `[id]`：學員詳情
- `add`：新增學員申請
  - 關係選項僅 子女 / 配偶 / 其他（本人已自動存在，不可重複新增）
  - 頂部橘色說明提示需審核
  - 送出寫入 `ftw.students.v1`，`status: "待審核"`
  - 成功畫面提示等待工作室審核

### `/m/tickets/buy` 購買課堂券
- 4 個組合選項（單堂試課 / 5堂精選 / 10堂體驗 / 20堂年繳），標示有效期與可轉讓
- 點擊「購買」→ 底部 sheet 確認（商品摘要 + 付款說明 + 匯款帳號）
- 確認後寫入 `ftw.orders.v1` localStorage：`payStatus: "待確認"`, `notes: "前台下單"`, `tickets: []`
- 成功畫面：查看訂單

### `/m/tickets/transfer` 轉讓課堂券
- 步驟式流程：選擇票券 → 數量（±）→ 選擇受讓人 → 確認 → 完成

---

## 教師專區（`/m/teacher`）

底部固定導覽 4 tab：`我的課程` | `點名` | `請假` | `我的`

共享狀態：`AvailabilityProvider`（React Context）掛在 teacher layout，
讓行事曆與請假頁共享「不可出席時段」，無需後端即可即時同步。

### `/m/teacher` 行事曆
- 4 種模式切換（Segmented Control）：清單 / 日 / 週 / 月
- **清單**：依時間序排列課程
- **日**：Studio A / B / C 欄位 + 時間格（09:00–22:00），課程黑底、請假斜線紋底
- **週**：7 日欄 + 時間格，可橫向滾動
- **月**：月曆格，課程黑色 chip，請假灰色 chip

### `/m/teacher/login` 教師登入
- Email + 密碼

### `/m/teacher/attendance` 點名
- 課程選擇器
- 出席 / 缺席 / 延期 三項統計
- 學生列表：出席 / 缺席 並排按鈕；缺席後展開「延期補課」/ 「不延期」子選項
- 儲存按鈕（缺席未選子選項時提示）

### `/m/teacher/availability` 請假管理
- 現有不可出席時段列表
- 底部 sheet 表單：日期 / 起訖時間 / 原因
- modal 層級 `z-[100]`，蓋過底部 nav（`z-50`）

### `/m/teacher/profile` 教師我的
- 黑底統計卡：本月課堂 / 課程種類 / 平均出席率
- 出席歷史列表

---

## 管理後台（`/sys-admin`）

左側黑底側欄（桌面 `w-52`），手機為 top bar + drawer overlay。
`系統管理` 為可展開群組，預設收合，進入子頁時自動展開。

### `/sys-admin/login` 後台登入
- Email + 密碼

### 側欄導覽（7 個可摺疊群組）

| 群組 | 項目 | 路徑 |
|------|------|------|
| — | 總覽 | `/sys-admin` |
| 人員管理 | 帳號管理 | `/sys-admin/accounts` |
| | 學員管理 | `/sys-admin/students` |
| | 教師管理 | `/sys-admin/teachers` |
| 課程管理 | 單位管理 | `/sys-admin/units` |
| | 教室管理 | `/sys-admin/classrooms` |
| | 課堂管理 | `/sys-admin/courses` |
| | 線上課程 | `/sys-admin/online-courses` |
| | 出席管理 | `/sys-admin/roster` |
| 經營管理 | 商品管理 | `/sys-admin/tickets` |
| | 訂單管理 | `/sys-admin/orders` |
| | 售後管理 | `/sys-admin/aftersales` |
| | 卡券管理 | `/sys-admin/vouchers` |
| | 帳務管理 | `/sys-admin/finance` |
| 訊息通知管理 | Line訊息管理 | `/sys-admin/line-messages` |
| | 訊息工作流 | `/sys-admin/line-workflows` |
| 展示管理 | 手機版廣告圖 | `/sys-admin/display/mobile-banner` |
| 系統管理 | 人員管理 | `/sys-admin/system/members` |
| | 角色管理 | `/sys-admin/system/roles` |
| | 參數管理 | `/sys-admin/system/params` |

### 頁面功能摘要

**總覽 Dashboard**
- 4 統計卡：本月課程 / 本月收入 / 活躍學員 / 課堂券在庫
- 最新訂單列表
- 即將開課列表（含報名進度條）

**帳號管理**
- 會員帳號列表：Email、電話、關聯學生、加入日期、狀態

**學員管理**
- **待審核申請**（`ftw.students.v1` 中 `status === "待審核"`）：若有待審核項目，顯示於內部學員表格上方
  - 顯示：姓名、年齡、關係、所屬帳號、申請時間
  - 「核准」→ 自動加入內部學員列表，寫回 `status: "已核准"`
  - 「拒絕」→ 寫回 `status: "已拒絕"`，從待審核區消失
- 學生列表：年齡、主帳號、**與帳號者關係**（本人/子女/配偶/其他）、課堂券餘額（紅標警示 0 堂）、報名課程、最後動態

**教師管理**
- 教師列表：**圓形頭貼**（可上傳 800×800 PNG）、專長、課程數、本月課堂、出席率進度條、狀態
- 每行「課表」按鈕 → 彈出行事曆 modal（月份導航、課程日期高亮、點日期看詳情、本月清單）
- 新增 / 編輯 drawer：頭貼上傳預覽（圓形）、姓名、專長、Email、電話、簡介、狀態

**課堂管理（實體課）**
- 分內部課程 / 外部課程兩個區塊
- 桌面 grid table / 手機卡片雙版
- 欄位：課程、教師、時間、教室、報名進度條、狀態
- 編輯 drawer：課程類別（內部/外部可複選）、教師（多選）、時間、圖片（橫圖 3:1 + 方圖 1:1）、課程介紹（textarea）、課程重點（每行一項 textarea）、內部設定、外部設定

**線上課程管理**
- 課程列表：封面、標題、分類標籤、節數、評分、售價、上架狀態
- 新增 / 編輯 drawer：封面上傳、標題、副標、簡介、分類（多選）、類型（免費課程/系列課）、價格、排序、上架開關
- 單元（Section）管理：每堂含標題、影片網址（YouTube URL，存儲時編碼為 XOR+base64）、標籤、排序、免費預覽開關
- 推薦課程多選

**商品管理（課堂券組合）**
- 2 欄卡片：堂數、售價、已售數量、可轉讓標籤、上 / 下架操作

**訂單管理**
- 資料來源：`ftw.orders.v1` localStorage（首次讀入若空則 seed INITIAL_ORDERS）
- 桌面 table / 手機卡片；右上角「手動新增訂單」按鈕
- 付款狀態：`已付款` / `待確認` / `已退款` / `已取消` / `已售後`
- 點擊任一行 → 右側 `OrderDetail` 面板：
  - **待確認**：選擇付款方式 → 「確認付款」→ 二次確認（不可撤銷）→ 產生票券（依組合計算 expiresAt）；或「取消訂單」
  - **已付款**（有已消耗票券）：顯示「發起售後」按鈕，點擊開啟 AfterSalesPanel
  - **已售後**：顯示售後摘要（退款金額、收回票券數、原因、時間）
- 所有狀態變更即時寫回 localStorage

**售後管理**
- 入口：在訂單管理的 `OrderDetail` 中點「發起售後」按鈕
- `AfterSalesPanel`（右側抽屜）：
  - 勾選要收回的未使用票券（預設全選）；已消耗票券顯示為灰色不可勾
  - 退款金額欄位，預設建議值 = 原始金額 × 未使用堂數 / 總堂數
  - 選填退款原因
  - 二次確認後不可撤銷：收回票券設 `voided: true, changedBy: "售後收回"`；訂單改為「已售後」
- 售後管理頁（`/sys-admin/aftersales`）：唯讀歷史列表，只顯示已完成的「已售後」訂單，不在此頁發起

**卡券管理**
- 資料來源：`ftw.orders.v1` localStorage
- 桌面 8 欄 table / 手機卡片；狀態篩選 chip：全部 / 未使用 / 已使用 / 已失效 / 已轉讓
- 欄位：券號、學員、所屬訂單（可點開 OrderDetail）、課程組合、使用情況、**有效期限**、異動時間、異動人
- 票券狀態：`未使用` / `已使用` / `已失效`（售後收回，紅底）/ `已轉讓` / `已使用(受讓人)`
- 有效期限顯示：過期 → 紅色，30 天內到期 → 橘色，正常 → 灰色

**帳務管理**
- 右上角日期範圍篩選（本期 / 上期 快捷）
- 6 張統計卡，每張右上角 `?` tooltip 說明：
  - 收入 / 退款 / 淨收入 / 待收款 / 使用結算金額 / 未使用餘額
- 月收入長條圖（近 6 個月）
- 本月來源佔比
- 交易明細 table（含「新增交易明細」drawer：日期、類型、項目、學員、金額、狀態）

**出席管理**
- 日期篩選 tab
- 統計卡：出席 / 缺席 / 延期（移除「請假」）
- 依課程分組：每堂顯示出席統計 + 進度條 + 學生名單
- 缺席狀態分「延期補課」（橘底）/ 「不延期」（灰底）

**Line訊息管理**
- 發送對象：全體推播 / 指定用戶（填 LINE User ID）
- 訊息類型：文字 / 圖片（公開 HTTPS URL）
- 發送後即呼叫 `POST /api/line/send`（Messaging API push / broadcast）
- 發送紀錄列表：目標、內容、時間、成功/失敗狀態

**訊息工作流**
- 觸發式自動化 LINE 訊息規則列表
- 觸發事件：課程報名成功 / 訂單付款完成 / 課前提醒 / 課堂券即將到期 / 會員長期未登入
- 延遲發送設定（分鐘 / 小時 / 天，0 = 立即）
- 訊息模板支援 `{{課程名稱}}`、`{{上課日期}}`、`{{教室}}` 等變數佔位
- 每條工作流可獨立啟用 / 停用
- 新增 / 編輯 / 刪除 drawer

**手機版廣告圖**（展示管理）
- 廣告清單：3:1 預覽圖、順序編號、上下移動按鈕、啟用/停用切換
- 新增 / 編輯 drawer：圖片上傳（`aspect-[3/1]` 預覽）、標題、點擊連結、狀態
- 刪除功能
- 前台首頁輪播由此管理（`BANNERS` 陣列同步更新）

**人員管理**
- 後台帳號列表：姓名、Email、角色標籤、最後登入、狀態

**角色管理**
- 桌面：角色 × 功能 權限矩陣（`✓` / `—`）
- 手機：黑底 / 灰底權限標籤卡片
- 內建角色：超級管理員 / 課務管理員 / 財務管理員

**參數管理**
- 分組卡片（上課時間 / 通知設定 / 付款設定 / 功能開關 / LINE 登入設定 / LINE 訊息設定 / Email 設定）
- 每列右側可直接 inline 編輯
- **付款設定**：checkbox 多選，即時寫入 `ftw.params.v1.payMethods`，前台報名 modal 讀取
- **功能開關**：線上課程 toggle，即時寫入 `ftw.params.v1.features.onlineCourse`，控制前台底部 nav 顯示
- **LINE 登入設定**：`line_channel_id`、`line_channel_secret`、`line_liff_id`（Login Channel）
- **LINE 訊息設定**：`line_msg_channel_id`、`line_msg_channel_secret`、`line_access_token`（Messaging API）
- **Email 設定（SMTP）**：`smtp_host`、`smtp_port`、`smtp_user`、`smtp_pass`、`smtp_from`
- 點「儲存變更」呼叫 `POST /api/admin/params`，寫入 `data/line-config.json`，**即時生效不需重啟**
- 環境變數（`LINE_CHANNEL_ID` 等）優先級高於 config 檔

---

## UI 設計規範

### 色系

| 用途 | 值 |
|------|----|
| 品牌主 / 強調 | `#000000` |
| 頁面背景 | `#fafaf9` |
| 卡片背景 | `#ffffff` |
| 卡片邊框 | `#f0f0f0` |
| 分隔線 | `#f5f5f5` |
| 次要文字 | `#999` |
| 輔助文字 | `#aaa`、`#bbb` |
| 警示（待確認） | `#fff3cd` / `#856404` |
| 危險（缺席 / 退款） | `text-red-400` |
| LINE 品牌色 | `#06C755` |

### 響應式策略

- **學員 / 教師**：純 mobile，底部 nav `h-16`，內容 `pb-20`
- **後台**：桌面側欄 (`lg:flex`)，手機 top bar (`h-12`) + drawer
- 後台 table：`hidden md:block`（桌面）+ `md:hidden`（手機卡片）雙版並存
- 所有後台頁面容器：`w-full`，不限制最大寬度

---

## 技術方向

- **路由**：Next.js App Router，`/m` 與 `/sys-admin` 各自獨立 layout
- **共享狀態**：React Context（`AvailabilityProvider`）掛在 teacher layout
- **認證**：
  - Email + 密碼（Supabase Auth）
  - LINE OAuth Login：`/api/auth/line` → LINE 授權頁 → `/api/auth/line/callback` → `ftw_session` HttpOnly cookie（30天）
- **LINE 整合**：
  - `src/lib/line-config.ts`：分為兩組設定
    - `getLineLoginConfig()` / `saveLineLoginConfig()` → `data/line-login-config.json`（Login Channel）
    - `getLineMsgConfig()` / `saveLineMsgConfig()` → `data/line-msg-config.json`（Messaging API Channel）
    - env vars 優先（`LINE_CHANNEL_ID`、`LINE_MSG_CHANNEL_ID` 等）
  - `src/lib/smtp-config.ts`：`getSmtpConfig()` / `saveSmtpConfig()` → `data/smtp-config.json`（env `SMTP_HOST` 優先）
  - `src/lib/line.ts`：OAuth token 交換、profile 取得；push/broadcast/webhook 使用 `getLineMsgConfig()`
  - API routes：`/api/auth/line`、`/api/auth/line/callback`、`/api/line/send`、`/api/admin/params`
  - LINE 登入授權 URL 帶 `bot_prompt=normal`：授權完成後顯示加好友對話框（需 Login Channel 已連結 Official Account）
- **影片保護**：YouTube Video ID 以 XOR+base64 編碼存於 `_lib/online-courses.ts`（`decVid()` 解碼）；`controls:0` + 全透明遮罩阻擋 YouTube UI
- **資料庫**：Supabase PostgreSQL（需擴充 schema）
- **金流**：待定（綠界 / Stripe）
- **部署**：Vercel，`csflesim` 帳號
