export const WORKFLOW_STORE_KEY = "ftw.workflows.v1"

export interface SavedWorkflow {
  id: string
  name: string
  description?: string
  enabled?: boolean
  nodes: unknown[]
  edges: unknown[]
}

export function loadWorkflows(key: string = WORKFLOW_STORE_KEY): SavedWorkflow[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? (arr as SavedWorkflow[]) : []
  } catch {
    return []
  }
}

export function saveWorkflows(list: SavedWorkflow[], key: string = WORKFLOW_STORE_KEY): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(list))
  } catch {
    /* 無痕模式下忽略 */
  }
}
