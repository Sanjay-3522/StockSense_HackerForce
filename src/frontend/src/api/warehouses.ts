import { apiFetchEnveloped } from "./client"
import type { Warehouse } from "../types"

export interface WarehouseInput {
  code: string
  name: string
  address?: string
  isActive?: boolean
}

export const listWarehouses = (filters: { isActive?: boolean } = {}) =>
  apiFetchEnveloped<Warehouse[]>("/warehouses", { query: filters })

export const getWarehouse = (id: string) => apiFetchEnveloped<Warehouse>(`/warehouses/${id}`)

export const createWarehouse = (data: WarehouseInput) =>
  apiFetchEnveloped<Warehouse>("/warehouses", { method: "POST", body: data })

export const updateWarehouse = (id: string, data: Partial<WarehouseInput>) =>
  apiFetchEnveloped<Warehouse>(`/warehouses/${id}`, { method: "PUT", body: data })

export const deleteWarehouse = (id: string) =>
  apiFetchEnveloped<Warehouse>(`/warehouses/${id}`, { method: "DELETE" })
