import type { Metadata } from "next"
import TeacherShell from "./components/TeacherShell"
import { AvailabilityProvider } from "./context/AvailabilityProvider"

export const metadata: Metadata = {
  title: "Find the Way | 教師專區",
}

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <AvailabilityProvider>
      <TeacherShell>{children}</TeacherShell>
    </AvailabilityProvider>
  )
}
