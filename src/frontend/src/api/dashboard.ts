import { apiFetchEnveloped } from "./client"
import type { DashboardSummary } from "../types"

export const getDashboard = (filters: { warehouseId?: string; locationId?: string; categoryId?: string } = {}) =>
  apiFetchEnveloped<DashboardSummary>("/dashboard", { query: filters })
