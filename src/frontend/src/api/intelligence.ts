import { apiFetch } from "./client"
import type {
  ActionsResponse,
  AnomaliesResponse,
  IntelligenceAction,
  InventoryOverview,
  InvestigationResult,
  MovementsResponse,
  ReorderResponse,
  StockExplanation,
} from "../types"

export interface InventoryFilters {
  [key: string]: string | number | boolean | undefined | null
  productId?: string
  categoryId?: string
  sku?: string
  warehouseId?: string
  locationId?: string
}

export const getOverview = (filters: InventoryFilters = {}) =>
  apiFetch<InventoryOverview>("/intelligence/overview", { query: filters })

export interface MovementFilters extends InventoryFilters {
  from?: string
  to?: string
  reference?: string
  operationType?: string
}

export const getMovements = (filters: MovementFilters = {}, page = 1, limit = 20) =>
  apiFetch<MovementsResponse>("/intelligence/movements", { query: { ...filters, page, limit } })

export interface ExplanationQuery {
  [key: string]: string | number | boolean | undefined | null
  productId: string
  warehouseId?: string
  locationId?: string
  from?: string
  to?: string
  reference?: string
}

export const explainStockChange = (filters: ExplanationQuery) =>
  apiFetch<StockExplanation>("/intelligence/stock-explanation", { query: filters })

export interface InvestigationInput {
  productId: string
  warehouseId?: string
  locationId?: string
  recordedQuantity: number
  physicalQuantity: number
  from?: string
  to?: string
}

export const investigate = (data: InvestigationInput) =>
  apiFetch<InvestigationResult>("/intelligence/investigations", { method: "POST", body: data })

export interface AnomalyFilters extends MovementFilters {
  [key: string]: string | number | boolean | undefined | null
  severity?: string
  anomalyType?: string
}

export const getAnomalies = (filters: AnomalyFilters = {}) =>
  apiFetch<AnomaliesResponse>("/intelligence/anomalies", { query: filters })

export interface ReorderFilters extends InventoryFilters {
  [key: string]: string | number | boolean | undefined | null
  status?: string
}

export const getReorderRecommendations = (filters: ReorderFilters = {}) =>
  apiFetch<ReorderResponse>("/intelligence/reorder", { query: filters })

export interface ActionFilters {
  priority?: string
  status?: string
  type?: string
  source?: string
  warehouseId?: string
  productId?: string
  from?: string
  to?: string
}

export const listActions = (filters: ActionFilters = {}, page = 1, limit = 20) =>
  apiFetch<ActionsResponse>("/intelligence/actions", { query: { ...filters, page, limit } })

export const getAction = (id: string) => apiFetch<IntelligenceAction>(`/intelligence/actions/${id}`)

export const updateActionStatus = (id: string, status: "IN_PROGRESS") =>
  apiFetch<IntelligenceAction>(`/intelligence/actions/${id}`, { method: "PATCH", body: { status } })

export const resolveAction = (id: string) =>
  apiFetch<IntelligenceAction>(`/intelligence/actions/${id}/resolve`, { method: "POST" })
