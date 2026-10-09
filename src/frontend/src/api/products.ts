import { apiFetchEnveloped } from "./client"
import type { Product } from "../types"

export interface ProductInput {
  name: string
  sku: string
  description?: string
  categoryId: string
  unit: string
  barcode?: string
  initialStock?: number
  initialStockLocationId?: string
  isActive?: boolean
}

export const listProducts = (filters: { search?: string; categoryId?: string; isActive?: boolean } = {}) =>
  apiFetchEnveloped<Product[]>("/products", { query: filters })

export const getProduct = (id: string) => apiFetchEnveloped<Product>(`/products/${id}`)

export const createProduct = (data: ProductInput) =>
  apiFetchEnveloped<Product>("/products", { method: "POST", body: data })

export const updateProduct = (id: string, data: Partial<ProductInput>) =>
  apiFetchEnveloped<Product>(`/products/${id}`, { method: "PUT", body: data })

export const deleteProduct = (id: string) =>
  apiFetchEnveloped<Product>(`/products/${id}`, { method: "DELETE" })
