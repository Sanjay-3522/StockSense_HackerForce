// Shared TypeScript types mirroring the backend Prisma models and API
// response shapes. Kept as plain interfaces — no client-side recalculation
// of anything the API already computes (differences, recommendations,
// anomaly thresholds, explanations, etc.).

export type UserRole = "INVENTORY_MANAGER" | "WAREHOUSE_STAFF"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface Category {
  id: string
  name: string
  description?: string | null
  createdAt: string
  updatedAt: string
}

export interface Warehouse {
  id: string
  code: string
  name: string
  address?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  locations?: Location[]
}

export interface Location {
  id: string
  warehouseId: string
  code: string
  name: string
  zone?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  warehouse?: Warehouse
  stocks?: Stock[]
}

export type UnitOfMeasure = string

export interface Product {
  id: string
  name: string
  sku: string
  description?: string | null
  categoryId: string
  unit: UnitOfMeasure
  barcode?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  category?: Category
  stocks?: Stock[]
}

export interface Stock {
  id: string
  productId: string
  locationId: string
  quantity: number
  updatedAt: string
  product?: { id: string; name: string; sku: string }
  location?: {
    id: string
    name: string
    code: string
    warehouseId: string
    warehouse?: Warehouse
  }
}

export interface AdjustmentReason {
  id: string
  name: string
  description?: string | null
}

export interface ReorderRule {
  id: string
  productId: string
  warehouseId?: string | null
  locationId?: string | null
  reorderPoint: number
  reorderQuantity: number
  maxStock?: number | null
  isActive: boolean
  product?: Product
  warehouse?: Warehouse | null
  location?: Location | null
}

export interface DashboardSummary {
  counts: {
    activeWarehouses: number
    activeLocations: number
    activeProducts: number
    totalProductsInStock: number
    outOfStockRecords: number
    lowStockRecords: number
  }
  filtersApplied: {
    warehouseId?: string
    locationId?: string
    categoryId?: string
  }
  recentWarehouses: Array<{
    id: string
    code: string
    name: string
    isActive: boolean
  }>
}

// ---- Operations ----

export type DocumentStatus = "draft" | "waiting" | "ready" | "done" | "canceled"

export interface ReceiptItem {
  id: string
  productId: string
  quantity: number
  product?: Product
}

export interface Receipt {
  id: string
  reference: string
  supplierName?: string | null
  warehouseId: string
  locationId: string
  notes?: string | null
  createdBy?: string | null
  status: DocumentStatus
  validatedBy?: string | null
  validatedAt?: string | null
  createdAt: string
  updatedAt: string
  items: ReceiptItem[]
  warehouse?: Warehouse
  location?: Location
}

export interface DeliveryItem {
  id: string
  productId: string
  requestedQty: number
  pickedQty: number
  packedQty: number
  product?: Product
}

export interface Delivery {
  id: string
  reference: string
  customerName?: string | null
  warehouseId: string
  locationId: string
  notes?: string | null
  createdBy?: string | null
  status: DocumentStatus
  validatedBy?: string | null
  validatedAt?: string | null
  createdAt: string
  updatedAt: string
  items: DeliveryItem[]
  warehouse?: Warehouse
  location?: Location
}

export interface TransferItem {
  id: string
  productId: string
  quantity: number
  product?: Product
}

export interface Transfer {
  id: string
  reference: string
  sourceLocationId: string
  destinationLocationId: string
  notes?: string | null
  createdBy?: string | null
  status: DocumentStatus
  validatedBy?: string | null
  validatedAt?: string | null
  createdAt: string
  updatedAt: string
  items: TransferItem[]
  sourceLocation?: Location
  destinationLocation?: Location
}

export interface Adjustment {
  id: string
  reference: string
  productId: string
  locationId: string
  recordedQty: number
  physicalQty: number
  difference: number
  reasonId?: string | null
  reasonName?: string | null
  notes?: string | null
  createdBy?: string | null
  status: "draft" | "done"
  validatedBy?: string | null
  validatedAt?: string | null
  createdAt: string
  product?: Product
  location?: Location
}

// ---- Intelligence ----

export type IntelligenceState =
  | "READY"
  | "NO_DATA"
  | "UNEXPLAINED"
  | "PARTIALLY_EXPLAINED"
  | "EXPLAINED"

export interface StockMovement {
  id: string
  operationType: "receipt" | "delivery" | "transfer" | "adjustment"
  reference: string
  productId: string
  sku: string
  quantityChange: number
  quantityBefore: number
  quantityAfter: number
  warehouseId?: string | null
  locationId?: string | null
  sourceLocationId?: string | null
  destinationLocationId?: string | null
  userEmail?: string | null
  reason?: string | null
  createdAt: string
  product?: { id: string; name: string; sku: string }
  warehouse?: Warehouse | null
  location?: Location | null
  sourceLocation?: Location | null
  destinationLocation?: Location | null
}

export interface InventoryOverview {
  state: "READY" | "NO_DATA"
  filters: Record<string, unknown>
  totals: {
    inventoryQuantity: number
    trackedStockRows: number
    products: number
    warehouses: number
    outOfStockProducts: number
    lowStockProducts: number
    lowStockState: "READY" | "NO_REORDER_RULES_CONFIGURED"
  }
  inventoryByWarehouse: Array<{ id: string; name: string; code: string; quantity: number }>
  inventoryByCategory: Array<{ id: string; name: string; quantity: number }>
  productsRequiringAttention: Array<{
    product: { id: string; name: string; sku: string }
    quantity: number
    location: unknown
    reason: string
  }>
  recentMovements: StockMovement[]
  notes: string[]
}

export interface Pagination {
  page: number
  limit: number
  total: number
  pageCount: number
}

export interface MovementsResponse {
  state: "READY" | "NO_DATA"
  items: StockMovement[]
  pagination: Pagination
}

export interface StockExplanation {
  state: IntelligenceState
  product: { id: string; name: string; sku: string; unit: string }
  filters: Record<string, unknown>
  openingQuantity: number | null
  incomingQuantity: number
  outgoingQuantity: number
  netMovement: number
  expectedClosingQuantity: number | null
  currentQuantity: number
  currentComparisonAvailable: boolean
  unresolvedQuantity: number | null
  movements: StockMovement[]
  explanation: string
  comparisonNote: string | null
  limitation: string | null
}

export interface InvestigationResult {
  state: "EXPLAINED" | "PARTIALLY_EXPLAINED" | "UNEXPLAINED"
  recordedQuantity: number
  physicalQuantity: number
  difference: number
  tracedQuantity: number
  unexplainedQuantity: number
  relatedMovements: StockMovement[]
  relatedOperations: Array<{ reference: string; operationType: string; quantityChange: number }>
  product: { id: string; name: string; sku: string; unit: string }
  filters: Record<string, unknown>
  limitation: string | null
  explanation: string
}

export type AnomalySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
export type AnomalyType =
  | "UNUSUALLY_LARGE_MOVEMENT"
  | "UNUSUAL_NEGATIVE_MOVEMENT"
  | "SUDDEN_MOVEMENT_SPIKE"
  | "REPEATED_DISCREPANCIES"

export interface Anomaly {
  id: string
  product: { id: string; name: string; sku: string }
  productId: string
  sku: string
  warehouse?: Warehouse | null
  location?: Location | null
  operation: { type: string; reference: string }
  timestamp: string
  observedMovement: number
  historicalBaseline: {
    sampleCount: number
    medianAbsoluteMovement: number
    medianAbsoluteDeviation: number
  }
  threshold: number
  deviation: number
  anomalyType: AnomalyType
  reason: string
  severity: AnomalySeverity
  supportingMovementIds: string[]
  warehouseId?: string | null
  locationId?: string | null
}

export interface AnomaliesResponse {
  items: Anomaly[]
}

export type ReorderRecommendationStatus =
  | "REORDER_RECOMMENDED"
  | "NOT_REQUIRED"
  | "INSUFFICIENT_DATA"

export interface ReorderRecommendation {
  product: Product
  productId: string
  sku: string
  currentStock: number
  warehouse: Warehouse
  warehouseId: string
  location: { id: string; name: string; code: string }
  locationId: string
  averageDailyConsumption: number | null
  consumptionSampleCount: number
  consumptionWindowDays: number
  estimatedDaysRemaining: number | null
  reorderThreshold: number | null
  suggestedReorderQuantity: number | null
  reorderRuleId: string | null
  maxStock: number | null
  recommendationStatus: ReorderRecommendationStatus
  explanation: string
}

export interface ReorderResponse {
  state: "READY" | "NO_DATA"
  items: ReorderRecommendation[]
  calculation: Record<string, string>
  dataLimitations: string[]
}

export type ActionPriority = "CRITICAL" | "NEEDS_REVIEW" | "INFORMATION"
export type ActionStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED"

export interface IntelligenceAction {
  id: string
  type: string
  priority: ActionPriority
  title: string
  description: string
  source: string
  status: ActionStatus
  productId?: string | null
  warehouseId?: string | null
  locationId?: string | null
  referenceId?: string | null
  recommendedAction?: string | null
  createdAt: string
  resolvedAt?: string | null
}

export interface ActionsResponse {
  state: "READY" | "NO_DATA"
  items: IntelligenceAction[]
  pagination: Pagination
}

export interface ApiErrorBody {
  success: false
  message: string
  code?: string
}
