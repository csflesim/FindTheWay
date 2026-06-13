import { Search } from "lucide-react"

const orders = [
  { id: "ORD-0041", student: "陳小明家長", email: "chen@email.com",   item: "10堂體驗包", amount: 9800,  date: "2026-06-13", status: "已付款" },
  { id: "ORD-0040", student: "林美玲",     email: "lin@email.com",    item: "單堂試課券", amount: 1200,  date: "2026-06-12", status: "已付款" },
  { id: "ORD-0039", student: "王大文家長", email: "wang@email.com",   item: "10堂體驗包", amount: 9800,  date: "2026-06-11", status: "已付款" },
  { id: "ORD-0038", student: "張志豪",     email: "chang@email.com",  item: "5堂精選包",  amount: 5500,  date: "2026-06-10", status: "待確認" },
  { id: "ORD-0037", student: "吳雅婷",     email: "wu@email.com",     item: "10堂體驗包", amount: 9800,  date: "2026-06-09", status: "已付款" },
  { id: "ORD-0036", student: "劉建宏家長", email: "liu@email.com",    item: "20堂年繳包", amount: 18000, date: "2026-06-08", status: "已退款" },
]

const statusStyle: Record<string, string> = {
  "已付款": "bg-black text-white",
  "待確認": "bg-[#fff3cd] text-[#856404]",
  "已退款": "bg-[#f5f5f5] text-[#999]",
}

export default function OrdersPage() {
  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Orders</p>
        <h1 className="text-xl font-medium mt-0.5">訂單管理</h1>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
        <input placeholder="搜尋訂單 / 學員 / Email…"
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0f0f0] rounded-xl outline-none focus:border-black" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_1.5fr_1.5fr_1fr_1fr_0.8fr] gap-4 px-5 py-3 border-b border-[#f5f5f5] text-[11px] text-[#aaa] uppercase tracking-widest">
          <span>訂單</span><span>學員</span><span>組合</span><span>金額</span><span>日期</span><span>狀態</span>
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {orders.map((o) => (
            <div key={o.id} className="px-5 py-4 md:grid md:grid-cols-[1fr_1.5fr_1.5fr_1fr_1fr_0.8fr] md:gap-4 md:items-center flex flex-wrap gap-2">
              <p className="text-xs text-[#999] font-mono">{o.id}</p>
              <div>
                <p className="text-sm font-medium">{o.student}</p>
                <p className="text-xs text-[#aaa]">{o.email}</p>
              </div>
              <p className="text-sm text-[#666]">{o.item}</p>
              <p className="text-sm font-medium">NT$ {o.amount.toLocaleString()}</p>
              <p className="text-xs text-[#999]">{o.date.slice(5).replace("-", "/")}</p>
              <span className={`text-[11px] px-2.5 py-1 rounded-full w-fit ${statusStyle[o.status]}`}>
                {o.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
