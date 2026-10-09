import { apiFetch } from "./client"
import type { Adjustment } from "../types"

export interface AdjustmentInput {
  reference: string
  product_id: string
  location_id: string
  reason_id?: string | null
  reason_name?: string | null
  physical_qty: number
  notes?: string | null
  created_by?: string | null
}

export const listAdjustments = () => apiFetch<Adjustment[]>("/adjustments")
export const createAdjustment = (data: AdjustmentInput) =>
  apiFetch<Adjustment>("/adjustments", { method: "POST", body: data })
