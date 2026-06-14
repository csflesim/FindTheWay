import Link from "next/link"
import { ArrowLeft, CheckCircle2 } from "lucide-react"

const packages = [
  {
    id: 1, name: "單堂試課券", qty: 1, price: 1200,
    desc: "適合初次體驗，單堂自由安排",
    highlights: ["任選課程", "有效期 3 個月"],
    popular: false,
  },
  {
    id: 2, name: "5堂精選包", qty: 5, price: 5500,
    desc: "適合短期體驗，彈性使用",
    highlights: ["任選課程", "有效期 6 個月"],
    popular: false,
  },
  {
    id: 3, name: "10堂體驗包", qty: 10, price: 9800,
    desc: "最受歡迎，可轉讓給家人",
    highlights: ["任選課程", "有效期 12 個月", "可轉讓"],
    popular: true,
  },
  {
    id: 4, name: "20堂年繳包", qty: 20, price: 18000,
    desc: "最超值選擇，適合長期學習",
    highlights: ["任選課程", "有效期 12 個月", "可轉讓"],
    popular: false,
  },
]

export default function BuyTicketsPage() {
  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="bg-white border-b border-[#ebebeb] px-5 py-4 flex items-center gap-3">
        <Link href="/m/profile" className="p-1 -ml-1 text-[#999] hover:text-black">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-base font-medium">購買課堂券</h1>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {packages.map(pkg => (
          <div
            key={pkg.id}
            className={`bg-white rounded-2xl border p-5 relative ${
              pkg.popular ? "border-black" : "border-[#f0f0f0]"
            }`}
          >
            {pkg.popular && (
              <span className="absolute -top-2.5 left-5 text-[10px] bg-black text-white px-2.5 py-0.5 rounded-full">
                最受歡迎
              </span>
            )}
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium">{pkg.name}</p>
                <p className="text-xs text-[#aaa] mt-0.5">{pkg.desc}</p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-lg font-medium">NT$ {pkg.price.toLocaleString()}</p>
                <p className="text-[10px] text-[#aaa]">{pkg.qty} 堂</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 mb-4">
              {pkg.highlights.map(h => (
                <div key={h} className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-[#aaa] shrink-0" />
                  <p className="text-xs text-[#666]">{h}</p>
                </div>
              ))}
            </div>
            <Link
              href="/m/login"
              className={`block w-full py-2.5 text-sm text-center rounded-xl transition-colors ${
                pkg.popular
                  ? "bg-black text-white hover:bg-[#222]"
                  : "border border-[#e8e8e8] text-black hover:border-black"
              }`}
            >
              購買
            </Link>
          </div>
        ))}
      </div>

      <div className="h-6" />
    </div>
  )
}
