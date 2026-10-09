import { apiFetch } from "./client"
import type { Receipt } from "../types"

export interface ReceiptInput {
  reference: string
  supplier_name?: string | null
  warehouse_id: string
  location_id: string
  notes?: string | null
  created_by?: string | null
  status?: "draft" | "waiting" | "ready"
  items: { product_id: string; quantity: number }[]
}

export const listReceipts = () => apiFetch<Receipt[]>("/receipts")
export const getReceipt = (id: string) => apiFetch<Receipt>(`/receipts/${id}`)
export const createReceipt = (data: ReceiptInput) =>
  apiFetch<Receipt>("/receipts", { method: "POST", body: data })
export const updateReceipt = (id: string, data: Partial<ReceiptInput>) =>
  apiFetch<Receipt>(`/receipts/${id}`, { method: "PATCH", body: data })
export const updateReceiptStatus = (id: string, status: string) =>
  apiFetch<Receipt>(`/receipts/${id}/status`, { method: "PATCH", body: { status } })
export const validateReceipt = (id: string) =>
  apiFetch<Receipt>(`/receipts/${id}/validate`, { method: "POST" })
export const cancelReceipt = (id: string) =>
  apiFetch<Receipt>(`/receipts/${id}/cancel`, { method: "POST" })
