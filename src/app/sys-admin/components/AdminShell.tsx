'use client'

import { usePathname } from "next/navigation"
import AdminNav, { AdminHeader } from "./AdminNav"

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === "/sys-admin/login"

  if (isLogin) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-[#f6f7fb]">
      <AdminNav />
      <main className="flex-1 overflow-auto pt-12 lg:pt-0">
        <AdminHeader />
        {children}
      </main>
    </div>
  )
}
