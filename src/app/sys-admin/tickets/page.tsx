import { Plus } from "lucide-react"

const packages = [
  { id: 1, name: "單堂試課券",  qty: 1,  price: 1200, transferable: false, active: true,  sold: 38 },
  { id: 2, name: "5堂精選包",   qty: 5,  price: 5500, transferable: false, active: true,  sold: 24 },
  { id: 3, name: "10堂體驗包",  qty: 10, price: 9800, transferable: true,  active: true,  sold: 61 },
  { id: 4, name: "20堂年繳包",  qty: 20, price: 18000, transferable: true, active: false, sold: 12 },
]

export default function TicketsPage() {
  return (
    <div className="p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] text-[#aaa] uppercase tracking-widest">Tickets</p>
          <h1 className="text-xl font-medium mt-0.5">課堂券組合</h1>
        </div>
        <button className="flex items-center gap-1.5 bg-black text-white text-sm px-4 py-2 rounded-lg">
          <Plus size={15} />新增組合
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {packages.map((pkg) => (
          <div key={pkg.id} className={`bg-white rounded-xl border p-5 ${pkg.active ? "border-[#f0f0f0]" : "border-[#f0f0f0] opacity-50"}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium">{pkg.name}</p>
                <p className="text-xs text-[#999] mt-0.5">{pkg.qty} 堂 / set</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                pkg.active ? "border-black text-black" : "border-[#ddd] text-[#aaa]"
              }`}>
                {pkg.active ? "上架中" : "已下架"}
              </span>
            </div>

            <p className="text-2xl font-light">NT$ {pkg.price.toLocaleString()}</p>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#f5f5f5]">
              <div className="flex gap-3 text-xs text-[#999]">
                <span>已售 {pkg.sold} 組</span>
                <span className={pkg.transferable ? "text-black" : ""}>
                  {pkg.transferable ? "可轉讓" : "不可轉讓"}
                </span>
              </div>
              <div className="flex gap-2">
                <button className="text-xs text-[#999] hover:text-black">編輯</button>
                <button className="text-xs text-[#999] hover:text-black">
                  {pkg.active ? "下架" : "上架"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
