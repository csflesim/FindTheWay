import type { SupabaseClient } from "@supabase/supabase-js"

export const WORKFLOW_STORE_KEY = "ftw.workflows.v1"

export interface SavedWorkflow {
  id: string
  name: string
  description?: string
  enabled?: boolean
  nodes: unknown[]
  edges: unknown[]
}

/* ─── DB 版本（workflows 表） ─── */

export async function fetchWorkflowsDb(supabase: SupabaseClient, variant: string): Promise<SavedWorkflow[]> {
  const { data, error } = await supabase
    .from("workflows")
    .select("id, name, description, enabled, nodes, edges")
    .eq("variant", variant)
    .order("created_at")
  if (error) { console.error("載入工作流失敗:", error.message); return [] }
  return (data ?? []).map(r => ({
    id: r.id, name: r.name, description: r.description ?? undefined,
    enabled: r.enabled, nodes: r.nodes ?? [], edges: r.edges ?? [],
  }))
}

export async function upsertWorkflowsDb(supabase: SupabaseClient, variant: string, list: SavedWorkflow[]): Promise<void> {
  if (list.length === 0) return
  const { error } = await supabase.from("workflows").upsert(list.map(f => ({
    id: f.id, name: f.name, description: f.description ?? null,
    enabled: f.enabled !== false, variant,
    nodes: f.nodes, edges: f.edges,
  })))
  if (error) console.error("儲存工作流失敗:", error.message)
}

export async function deleteWorkflowDb(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("workflows").delete().eq("id", id)
  if (error) console.error("刪除工作流失敗:", error.message)
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
