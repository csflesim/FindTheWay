import type { Metadata } from "next"
import TeacherNav from "./components/TeacherNav"
import { AvailabilityProvider } from "./context/AvailabilityProvider"

export const metadata: Metadata = {
  title: "Find the Way | 教師專區",
}

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <AvailabilityProvider>
      <div className="min-h-screen bg-[#fafaf9]">
        <main className="pb-20 max-w-md mx-auto min-h-screen">
          {children}
        </main>
        <TeacherNav />
      </div>
    </AvailabilityProvider>
  )
}
