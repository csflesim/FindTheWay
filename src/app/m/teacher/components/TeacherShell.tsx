'use client'

import { usePathname } from "next/navigation"
import TeacherNav from "./TeacherNav"

export default function TeacherShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === "/m/teacher/login"

  if (isLogin) {
    return <div className="min-h-screen bg-[#fafaf9]">{children}</div>
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <main className="pb-20 max-w-md mx-auto min-h-screen">
        {children}
      </main>
      <TeacherNav />
    </div>
  )
}
