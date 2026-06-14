import type { Metadata } from "next"
import AdminShell from "./components/AdminShell"

export const metadata: Metadata = {
  title: "Find the Way | 管理後台",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
