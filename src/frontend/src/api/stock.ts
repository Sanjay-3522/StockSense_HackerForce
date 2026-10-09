import { apiFetchEnveloped } from "./client"
import type { Stock } from "../types"

export const listStock = (filters: { productId?: string; locationId?: string; warehouseId?: string } = {}) =>
  apiFetchEnveloped<Stock[]>("/stock", { query: filters })

export const getStockByProduct = (productId: string) =>
  apiFetchEnveloped<Stock[]>(`/stock/product/${productId}`)
