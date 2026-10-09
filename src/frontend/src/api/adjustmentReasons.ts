import { apiFetchEnveloped } from "./client"
import type { AdjustmentReason } from "../types"

export interface ReasonInput {
  name: string
  description?: string
}

export const listAdjustmentReasons = () => apiFetchEnveloped<AdjustmentReason[]>("/adjustment-reasons")
export const getAdjustmentReason = (id: string) =>
  apiFetchEnveloped<AdjustmentReason>(`/adjustment-reasons/${id}`)
export const createAdjustmentReason = (data: ReasonInput) =>
  apiFetchEnveloped<AdjustmentReason>("/adjustment-reasons", { method: "POST", body: data })
export const updateAdjustmentReason = (id: string, data: Partial<ReasonInput>) =>
  apiFetchEnveloped<AdjustmentReason>(`/adjustment-reasons/${id}`, { method: "PUT", body: data })
export const deleteAdjustmentReason = (id: string) =>
  apiFetchEnveloped<AdjustmentReason>(`/adjustment-reasons/${id}`, { method: "DELETE" })
