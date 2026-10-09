import { apiFetch } from "./client"
import type { Transfer } from "../types"

export interface TransferInput {
  reference: string
  source_location_id: string
  destination_location_id: string
  notes?: string | null
  created_by?: string | null
  status?: "draft" | "waiting" | "ready"
  items: { product_id: string; quantity: number }[]
}

export const listTransfers = () => apiFetch<Transfer[]>("/transfers")
export const getTransfer = (id: string) => apiFetch<Transfer>(`/transfers/${id}`)
export const createTransfer = (data: TransferInput) =>
  apiFetch<Transfer>("/transfers", { method: "POST", body: data })
export const updateTransfer = (id: string, data: Partial<TransferInput>) =>
  apiFetch<Transfer>(`/transfers/${id}`, { method: "PATCH", body: data })
export const updateTransferStatus = (id: string, status: string) =>
  apiFetch<Transfer>(`/transfers/${id}/status`, { method: "PATCH", body: { status } })
export const completeTransfer = (id: string) =>
  apiFetch<Transfer>(`/transfers/${id}/complete`, { method: "POST" })
export const cancelTransfer = (id: string) =>
  apiFetch<Transfer>(`/transfers/${id}/cancel`, { method: "POST" })
