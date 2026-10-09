import { apiFetchEnveloped } from "./client"
import type { Category } from "../types"

export interface CategoryInput {
  name: string
  description?: string
}

export const listCategories = () => apiFetchEnveloped<Category[]>("/categories")
export const getCategory = (id: string) => apiFetchEnveloped<Category>(`/categories/${id}`)
export const createCategory = (data: CategoryInput) =>
  apiFetchEnveloped<Category>("/categories", { method: "POST", body: data })
export const updateCategory = (id: string, data: Partial<CategoryInput>) =>
  apiFetchEnveloped<Category>(`/categories/${id}`, { method: "PUT", body: data })
export const deleteCategory = (id: string) =>
  apiFetchEnveloped<Category>(`/categories/${id}`, { method: "DELETE" })
