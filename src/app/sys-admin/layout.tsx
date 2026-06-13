import type { Metadata } from "next"
import AdminNav from "./components/AdminNav"

export const metadata: Metadata = {
  title: "Find the Way | 管理後台",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f7f7f6]">
      <AdminNav />
      <main className="flex-1 overflow-auto pt-12 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
