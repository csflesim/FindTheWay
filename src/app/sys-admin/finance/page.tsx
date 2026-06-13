import { TrendingUp, TrendingDown } from "lucide-react"

const monthStats = [
  { label: "本月收入",   value: "NT$48,600", sub: "+8% 較上月",  up: true  },
  { label: "本月退款",   value: "NT$1,200",  sub: "-2% 較上月",  up: true  },
  { label: "淨收入",     value: "NT$47,400", sub: "+9% 較上月",  up: true  },
  { label: "待收款",     value: "NT$5,500",  sub: "1 筆待確認",  up: false },
]

const monthlyRevenue = [
  { month: "1月",  amount: 32400 },
  { month: "2月",  amount: 28800 },
  { month: "3月",  amount: 38500 },
  { month: "4月",  amount: 41200 },
  { month: "5月",  amount: 44900 },
  { month: "6月",  amount: 48600 },
]

const transactions = [
  { id: "ORD-0041", date: "06/13", type: "收入",  item: "10堂體驗包",  student: "陳小明家長",  amount:  9800, status: "已入帳" },
  { id: "ORD-0040", date: "06/12", type: "收入",  item: "單堂試課券",  student: "林美玲",      amount:  1200, status: "已入帳" },
  { id: "ORD-0039", date: "06/11", type: "收入",  item: "10堂體驗包",  student: "王大文家長",  amount:  9800, status: "已入帳" },
  { id: "ORD-0038", date: "06/10", type: "收入",  item: "5堂精選包",   student: "張志豪",      amount:  5500, status: "待確認" },
  { id: "ORD-0037", date: "06/09", type: "收入",  item: "10堂體驗包",  student: "吳雅婷",      amount:  9800, status: "已入帳" },
  { id: "ORD-0036", date: "06/08", type: "退款",  item: "20堂年繳包",  student: "劉建宏家長",  amount: -18000, status: "已退款" },
  { id: "ORD-0035", date: "06/07", type: "收入",  item: "5堂精選包",   student: "許小芸",      amount:  5500, status: "已入帳" },
  { id: "ORD-0034", date: "06/05", type: "收入",  item: "10堂體驗包",  student: "黃志明",      amount:  9800, status: "已入帳" },
]

const statusStyle: Record<string, string> = {
  "已入帳": "bg-black text-white",
  "待確認": "bg-[#fff3cd] text-[#856404]",
  "已退款": "bg-[#f5f5f5] text-[#999]",
}

const maxAmount = Math.max(...monthlyRevenue.map(m => m.amount))

export default function FinancePage() {
  return (
    <div className="p-4 md:p-6 w-full">
      <div className="mb-5">
        <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Finance</p>
        <h1 className="text-lg md:text-xl font-medium mt-0.5">帳務管理</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {monthStats.map(({ label, value, sub, up }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
            <p className="text-[11px] text-[#999] mb-2">{label}</p>
            <p className="text-lg md:text-xl font-medium leading-none">{value}</p>
            <div className={`flex items-center gap-1 mt-1.5 ${up ? "text-green-600" : "text-[#e08800]"}`}>
              {up
                ? <TrendingUp size={11} />
                : <TrendingDown size={11} />
              }
              <p className="text-[10px]">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-6 mb-6">
        {/* Revenue bar chart */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-5">
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-4">月收入趨勢</p>
          <div className="flex items-end gap-2 h-36">
            {monthlyRevenue.map((m) => {
              const pct = Math.round((m.amount / maxAmount) * 100)
              const isLatest = m.month === "6月"
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <p className="text-[10px] text-[#999]">
                    {(m.amount / 1000).toFixed(0)}k
                  </p>
                  <div className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${pct}%`,
                      backgroundColor: isLatest ? "#000" : "#e8e8e8",
                      minHeight: 4,
                    }}
                  />
                  <p className={`text-[10px] ${isLatest ? "font-medium" : "text-[#bbb]"}`}>{m.month}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Income breakdown */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-5">
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-4">本月來源</p>
          <div className="flex flex-col gap-3">
            {[
              { label: "單堂試課券", amount: 4800,  pct: 10 },
              { label: "5堂精選包",  amount: 11000, pct: 23 },
              { label: "10堂體驗包", amount: 29400, pct: 60 },
              { label: "20堂年繳包", amount: 3400,  pct: 7  },
            ].map(({ label, amount, pct }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-[#666]">{label}</p>
                  <p className="text-xs font-medium">NT$ {amount.toLocaleString()}</p>
                </div>
                <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                  <div className="h-full bg-black rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction list */}
      <div>
        <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-3">交易明細</p>

        {/* Desktop table */}
        <div className="hidden md:block bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
          <div className="grid grid-cols-[0.7fr_0.6fr_1.4fr_1.4fr_1fr_0.8fr_0.8fr] gap-4 px-5 py-3 border-b border-[#f5f5f5] text-[11px] text-[#aaa] uppercase tracking-widest">
            <span>日期</span><span>類型</span><span>項目</span><span>學員</span><span>金額</span><span>訂單</span><span>狀態</span>
          </div>
          <div className="divide-y divide-[#f5f5f5]">
            {transactions.map((t) => (
              <div key={t.id} className="grid grid-cols-[0.7fr_0.6fr_1.4fr_1.4fr_1fr_0.8fr_0.8fr] gap-4 items-center px-5 py-4">
                <p className="text-xs text-[#999]">{t.date}</p>
                <span className={`text-[11px] px-2 py-0.5 rounded-full w-fit ${
                  t.type === "收入" ? "bg-[#f0fdf4] text-green-700" : "bg-[#f5f5f5] text-[#999]"
                }`}>{t.type}</span>
                <p className="text-sm">{t.item}</p>
                <p className="text-sm text-[#666]">{t.student}</p>
                <p className={`text-sm font-medium ${t.amount < 0 ? "text-red-400" : ""}`}>
                  {t.amount < 0 ? "-" : ""}NT$ {Math.abs(t.amount).toLocaleString()}
                </p>
                <p className="text-xs text-[#aaa] font-mono">{t.id}</p>
                <span className={`text-[11px] px-2.5 py-1 rounded-full w-fit ${statusStyle[t.status]}`}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden flex flex-col gap-3">
          {transactions.map((t) => (
            <div key={t.id} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <p className="text-sm font-medium">{t.item}</p>
                  <p className="text-xs text-[#aaa] mt-0.5">{t.student} · {t.id}</p>
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full shrink-0 ${statusStyle[t.status]}`}>{t.status}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                    t.type === "收入" ? "bg-[#f0fdf4] text-green-700" : "bg-[#f5f5f5] text-[#999]"
                  }`}>{t.type}</span>
                  <p className="text-[10px] text-[#aaa]">{t.date}</p>
                </div>
                <p className={`text-sm font-medium ${t.amount < 0 ? "text-red-400" : ""}`}>
                  {t.amount < 0 ? "-" : ""}NT$ {Math.abs(t.amount).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
