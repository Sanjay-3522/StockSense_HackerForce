import { apiFetchEnveloped } from "./client"
import type { ReorderRule } from "../types"

export interface ReorderRuleInput {
  productId: string
  warehouseId?: string | null
  locationId?: string | null
  reorderPoint: number
  reorderQuantity: number
  maxStock?: number | null
  isActive?: boolean
}

export const listReorderRules = (
  filters: { productId?: string; warehouseId?: string; locationId?: string; isActive?: boolean } = {},
) => apiFetchEnveloped<ReorderRule[]>("/reorder-rules", { query: filters })

export const getReorderRule = (id: string) => apiFetchEnveloped<ReorderRule>(`/reorder-rules/${id}`)

export const createReorderRule = (data: ReorderRuleInput) =>
  apiFetchEnveloped<ReorderRule>("/reorder-rules", { method: "POST", body: data })

export const updateReorderRule = (id: string, data: Partial<ReorderRuleInput>) =>
  apiFetchEnveloped<ReorderRule>(`/reorder-rules/${id}`, { method: "PUT", body: data })

export const deleteReorderRule = (id: string) =>
  apiFetchEnveloped<ReorderRule>(`/reorder-rules/${id}`, { method: "DELETE" })
