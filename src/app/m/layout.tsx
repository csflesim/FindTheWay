import type { Metadata } from "next"
import MobileNav from "./components/MobileNav"

export const metadata: Metadata = {
  title: "Find the Way | 會員專區",
  description: "忙碌不迷路藝術工作坊 — 學員管理與課程報名",
}

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <main className="pb-20 max-w-md mx-auto min-h-screen">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
