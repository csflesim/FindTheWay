import { TrendingUp, Users, BookOpen, Ticket } from "lucide-react"

const stats = [
  { label: "本月課程",   value: "12",  sub: "+2 較上月",  icon: BookOpen,    up: true  },
  { label: "本月收入",   value: "NT$48,600", sub: "+8% 較上月", icon: TrendingUp, up: true  },
  { label: "活躍學員",   value: "63",  sub: "+5 較上月",  icon: Users,       up: true  },
  { label: "課堂券在庫", value: "142", sub: "-12 本週",   icon: Ticket,      up: false },
]

const recentOrders = [
  { id: "ORD-0041", student: "鄭大德", item: "10堂體驗包", amount: 9800, date: "06/13", status: "已付款" },
  { id: "ORD-0040", student: "賴大紫", item: "5堂精選包",  amount: 5500, date: "06/12", status: "已付款" },
  { id: "ORD-0039", student: "鄭大德", item: "單堂試課券", amount: 1200, date: "06/10", status: "已付款" },
  { id: "ORD-0038", student: "賴大紫", item: "10堂體驗包", amount: 9800, date: "06/09", status: "待確認" },
]

const upcomingCourses = [
  { title: "兒童創意素描",  date: "06/14 週六", time: "14:00–15:30", enrolled: 4, capacity: 8  },
  { title: "親子藝術探索",  date: "06/15 週日", time: "14:00–15:30", enrolled: 3, capacity: 8  },
  { title: "基礎水彩入門",  date: "06/20 週六", time: "10:00–12:00", enrolled: 4, capacity: 8  },
]

const statusStyle: Record<string, string> = {
  "已付款": "bg-black text-white",
  "待確認": "bg-[#f5f5f5] text-[#999]",
}

export default function AdminDashboard() {
  return (
    <div className="p-6 w-full">
      <div className="mb-6">
        <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Dashboard</p>
        <h1 className="text-xl font-medium mt-0.5">總覽</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {stats.map(({ label, value, sub, icon: Icon, up }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-[#999]">{label}</span>
              <Icon size={15} className="text-[#ccc]" strokeWidth={1.5} />
            </div>
            <p className="text-xl font-medium leading-none">{value}</p>
            <p className={`text-[10px] mt-1.5 ${up ? "text-green-600" : "text-red-400"}`}>{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-3">最新訂單</p>
          <div className="bg-white rounded-xl border border-[#f0f0f0] divide-y divide-[#f5f5f5]">
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{o.student}</p>
                  <p className="text-xs text-[#999] mt-0.5">{o.id} · {o.item} · {o.date}</p>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <p className="text-sm font-medium">NT$ {o.amount.toLocaleString()}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full mt-0.5 inline-block ${statusStyle[o.status]}`}>
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming courses */}
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest mb-3">即將開課</p>
          <div className="bg-white rounded-xl border border-[#f0f0f0] divide-y divide-[#f5f5f5]">
            {upcomingCourses.map((c) => {
              const pct = Math.round((c.enrolled / c.capacity) * 100)
              return (
                <div key={c.title} className="px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-[#999] mt-0.5">{c.date} · {c.time}</p>
                    </div>
                    <span className="text-xs text-[#999] shrink-0 ml-2">{c.enrolled}/{c.capacity}</span>
                  </div>
                  <div className="mt-2 h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
                    <div className="h-full bg-black rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
