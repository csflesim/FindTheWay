const tickets = [
  { id: 1, name: "10堂體驗包", student: "小明", remaining: 7, total: 10, expiry: "2026-12-31", transferable: true },
  { id: 2, name: "單堂試課券", student: "小華", remaining: 1, total: 1, expiry: "2026-09-30", transferable: false },
]

const records = [
  { id: 1, course: "基礎水彩入門", date: "2026-06-21 10:00", student: "小明", status: "已報名" },
  { id: 2, course: "兒童創意素描", date: "2026-06-15 14:00", student: "小華", status: "已完成" },
  { id: 3, course: "基礎水彩入門", date: "2026-06-07 10:00", student: "小明", status: "已完成" },
]

export default function OrdersPage() {
  return (
    <div>
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-[#ebebeb] px-5 py-4 z-10">
        <h1 className="text-base font-medium">訂單 & 課堂券</h1>
      </header>

      {/* Ticket section */}
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
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    ticket.transferable
                      ? "border-white/30 text-white/60"
                      : "border-white/10 text-white/30"
                  }`}
                >
                  {ticket.transferable ? "可轉讓" : "不可轉讓"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Records section */}
      <div className="px-4 mt-6">
        <p className="text-[10px] text-[#aaa] uppercase tracking-widest mb-3">報名紀錄</p>
        <div className="bg-white rounded-xl divide-y divide-[#f5f5f5] border border-[#f0f0f0]">
          {records.map((record) => (
            <div key={record.id} className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="text-sm font-medium">{record.course}</p>
                <p className="text-xs text-[#999] mt-0.5">
                  {record.date} · {record.student}
                </p>
              </div>
              <span
                className={`text-[11px] px-2.5 py-1 rounded-full ${
                  record.status === "已報名"
                    ? "bg-black text-white"
                    : "bg-[#f5f5f5] text-[#999]"
                }`}
              >
                {record.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-6" />
    </div>
  )
}
