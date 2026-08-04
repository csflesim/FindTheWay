'use client'

import { ToastProvider } from "@/app/sys-admin/components/Toast"
import { ConfirmProvider } from "@/app/sys-admin/components/Confirm"
import WorkflowBuilder from "@/app/sys-admin/components/WorkflowBuilder"

const CONFIG = {
  variant: "general" as const,
  storageKey: "ftw.workflows.v1",
  title: "訊息工作流",
  badge: "Workflow",
  subtitle: "自動化觸發流程 — 拖曳節點、連線、測試執行",
}

export default function LineWorkflowsPage() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="p-4 md:p-6 w-full">
          <WorkflowBuilder config={CONFIG} />
        </div>
      </ConfirmProvider>
    </ToastProvider>
  )
}
