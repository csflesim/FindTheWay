const tickets = [
  { id: 1, name: "10堂體驗包", student: "小明", remaining: 7, total: 10, expiry: "2026-12-31", transferable: true },
  { id: 2, name: "單堂試課券", student: "小華", remaining: 1, total: 1, expiry: "2026-09-30", transferable: false },
]

const enrollments = [
  { id: 1, course: "基礎水彩入門", date: "2026-06-21 10:00", student: "小明", status: "已報名" },
  { id: 2, course: "兒童創意素描", date: "2026-06-15 14:00", student: "小華", status: "已完成" },
  { id: 3, course: "基礎水彩入門", date: "2026-06-07 10:00", student: "小明", status: "已完成" },
]

const orders = [
  { id: "ORD-0041", date: "2026-06-13", item: "10堂體驗包", amount: 9800, status: "已付款" },
  { id: "ORD-0039", date: "2026-06-10", item: "單堂試課券", amount: 1200, status: "已付款" },
  { id: "ORD-0038", date: "2026-06-09", item: "10堂體驗包", amount: 9800, status: "待確認" },
]

const orderStatusStyle: Record<string, string> = {
  "已付款": "bg-black text-white",
  "待確認": "bg-[#fff3cd] text-[#856404]",
  "已退款": "bg-[#f5f5f5] text-[#999]",
}

export default function OrdersPage() {
  return (
    <div>
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-[#ebebeb] px-5 py-4 z-10">
        <h1 className="text-base font-medium">訂單 & 課堂券</h1>
      </header>

      {/* 課堂券餘額 */}
      <div className="px-4 mt-5">
        <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-3">課堂券餘額</p>
        <div className="flex flex-col gap-3">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="bg-black text-white rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] text-white/50">{ticket.student}</p>
                  <p className="text-sm font-medium mt-0.5">{ticket.name}</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-light">{ticket.remaining}</span>
                  <span className="text-sm text-white/40"> / {ticket.total}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                <p className="text-[10px] text-white/40">到期：{ticket.expiry}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  ticket.transferable ? "border-white/30 text-white/60" : "border-white/10 text-white/30"
                }`}>
                  {ticket.transferable ? "可轉讓" : "不可轉讓"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 報名紀錄 */}
      <div className="px-4 mt-6">
        <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-3">報名紀錄</p>
        <div className="bg-white rounded-xl divide-y divide-[#f5f5f5] border border-[#f0f0f0]">
          {enrollments.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="text-sm font-medium">{r.course}</p>
                <p className="text-xs text-[#999] mt-0.5">{r.date} · {r.student}</p>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full ${
                r.status === "已報名" ? "bg-black text-white" : "bg-[#f5f5f5] text-[#999]"
              }`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 訂單記錄 */}
      <div className="px-4 mt-6">
        <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-3">訂單記錄</p>
        <div className="bg-white rounded-xl divide-y divide-[#f5f5f5] border border-[#f0f0f0]">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="text-sm font-medium">{o.item}</p>
                <p className="text-xs text-[#999] mt-0.5">{o.date} · <span className="font-mono">{o.id}</span></p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${orderStatusStyle[o.status]}`}>
                  {o.status}
                </span>
                <p className="text-xs font-medium">NT$ {o.amount.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-6" />
    </div>
  )
}
