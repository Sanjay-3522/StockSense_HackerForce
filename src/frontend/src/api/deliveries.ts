import { apiFetch } from "./client"
import type { Delivery } from "../types"

export interface DeliveryInput {
  reference: string
  customer_name?: string | null
  warehouse_id: string
  location_id: string
  notes?: string | null
  created_by?: string | null
  items: { product_id: string; requested_qty: number }[]
}

export const listDeliveries = () => apiFetch<Delivery[]>("/deliveries")
export const getDelivery = (id: string) => apiFetch<Delivery>(`/deliveries/${id}`)
export const createDelivery = (data: DeliveryInput) =>
  apiFetch<Delivery>("/deliveries", { method: "POST", body: data })
export const updateDelivery = (id: string, data: Partial<DeliveryInput>) =>
  apiFetch<Delivery>(`/deliveries/${id}`, { method: "PATCH", body: data })
export const updateDeliveryStatus = (id: string, status: string) =>
  apiFetch<Delivery>(`/deliveries/${id}/status`, { method: "PATCH", body: { status } })
export const pickDelivery = (id: string) => apiFetch<Delivery>(`/deliveries/${id}/pick`, { method: "POST" })
export const packDelivery = (id: string) => apiFetch<Delivery>(`/deliveries/${id}/pack`, { method: "POST" })
export const validateDelivery = (id: string) =>
  apiFetch<Delivery>(`/deliveries/${id}/validate`, { method: "POST" })
export const cancelDelivery = (id: string) =>
  apiFetch<Delivery>(`/deliveries/${id}/cancel`, { method: "POST" })
