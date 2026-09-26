/**
 * Inventory Overview Service (Member 3 — Intelligence)
 *
 * Provides aggregate inventory intelligence across the whole system.
 * All values are read directly from the database — nothing is hard-coded.
 *
 * Low-stock threshold:   stock.quantity > 0 AND stock.quantity <= reorderPoint (if rule exists) OR <= 10 default
 * Out-of-stock threshold: stock.quantity = 0
 */
import { prisma } from '../../utils/prisma';

export interface OverviewFilters {
  warehouseId?: string;
  locationId?: string;
  productId?: string;
  categoryId?: string;
  sku?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildStockWhere(filters: OverviewFilters) {
  const where: Record<string, unknown> = {};
  if (filters.productId) where.productId = filters.productId;
  if (filters.locationId) where.locationId = filters.locationId;

  const productWhere: Record<string, unknown> = { isActive: true };
  if (filters.sku) productWhere.sku = filters.sku;
  if (filters.categoryId) productWhere.categoryId = filters.categoryId;
  where.product = productWhere;

  if (filters.warehouseId) {
    where.location = { warehouseId: filters.warehouseId };
  }

  return where;
}

// ---------------------------------------------------------------------------
// Main service function
// ---------------------------------------------------------------------------

export async function getInventoryOverview(filters: OverviewFilters = {}) {
  const stockWhere = buildStockWhere(filters);

  // 1. Fetch all matching stock rows with product + location+warehouse
  const stockRows = await prisma.stock.findMany({
    where: stockWhere,
    include: {
      product: { include: { category: true } },
      location: { include: { warehouse: true } },
    },
  });

  // 2. Fetch reorder rules (to determine low-stock threshold per product+warehouse)
  const reorderRules = await prisma.reorderRule.findMany({
    where: { isActive: true },
  });
  const reorderMap = new Map<string, number>();
  for (const rule of reorderRules) {
    const key = `${rule.productId}|${rule.warehouseId ?? '__'}`;
    reorderMap.set(key, rule.reorderPoint);
  }

  const DEFAULT_LOW_STOCK_THRESHOLD = 10;

  // 3. Aggregate totals
  let totalQuantity = 0;
  const productIds = new Set<string>();
  const warehouseIds = new Set<string>();
  const lowStockRows: typeof stockRows = [];
  const outOfStockRows: typeof stockRows = [];

  for (const row of stockRows) {
    totalQuantity += row.quantity;
    productIds.add(row.product.id);
    warehouseIds.add(row.location.warehouse.id);

    if (row.quantity === 0) {
      outOfStockRows.push(row);
    } else {
      const ruleKey = `${row.productId}|${row.location.warehouseId}`;
      const globalRuleKey = `${row.productId}|__`;
      const threshold =
        reorderMap.get(ruleKey) ??
        reorderMap.get(globalRuleKey) ??
        DEFAULT_LOW_STOCK_THRESHOLD;
      if (row.quantity <= threshold) {
        lowStockRows.push(row);
      }
    }
  }

  // 4. Inventory by warehouse
  const byWarehouseMap = new Map<
    string,
    { warehouseId: string; warehouseName: string; warehouseCode: string; totalQty: number; productCount: number }
  >();
  for (const row of stockRows) {
    const wh = row.location.warehouse;
    const entry = byWarehouseMap.get(wh.id) ?? {
      warehouseId: wh.id,
      warehouseName: wh.name,
      warehouseCode: wh.code,
      totalQty: 0,
      productCount: 0,
    };
    entry.totalQty += row.quantity;
    entry.productCount += 1;
    byWarehouseMap.set(wh.id, entry);
  }

  // 5. Inventory by category
  const byCategoryMap = new Map<
    string,
    { categoryId: string; categoryName: string; totalQty: number; productCount: number }
  >();
  for (const row of stockRows) {
    const cat = row.product.category;
    const catId = cat?.id ?? '__uncategorized__';
    const catName = cat?.name ?? 'Uncategorized';
    const entry = byCategoryMap.get(catId) ?? {
      categoryId: catId,
      categoryName: catName,
      totalQty: 0,
      productCount: 0,
    };
    entry.totalQty += row.quantity;
    entry.productCount += 1;
    byCategoryMap.set(catId, entry);
  }

  // 6. Recent movements (last 20)
  const movementWhere: Record<string, unknown> = {};
  if (filters.productId) movementWhere.productId = filters.productId;
  if (filters.warehouseId) movementWhere.warehouseId = filters.warehouseId;
  if (filters.locationId) movementWhere.locationId = filters.locationId;
  if (filters.sku) movementWhere.sku = filters.sku;

  const recentMovements = await prisma.stockMovement.findMany({
    where: movementWhere,
    include: { product: true, warehouse: true, location: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // 7. Products requiring attention (low + out-of-stock, deduped by productId)
  const attentionSet = new Set<string>();
  const productsRequiringAttention: {
    productId: string;
    sku: string;
    productName: string;
    reason: 'OUT_OF_STOCK' | 'LOW_STOCK';
    currentQty: number;
    warehouseId: string;
    warehouseName: string;
    locationId: string;
    locationName: string;
  }[] = [];

  for (const row of [...outOfStockRows, ...lowStockRows]) {
    const key = `${row.productId}|${row.locationId}`;
    if (attentionSet.has(key)) continue;
    attentionSet.add(key);
    productsRequiringAttention.push({
      productId: row.product.id,
      sku: row.product.sku,
      productName: row.product.name,
      reason: row.quantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
      currentQty: row.quantity,
      warehouseId: row.location.warehouse.id,
      warehouseName: row.location.warehouse.name,
      locationId: row.location.id,
      locationName: row.location.name,
    });
  }

  return {
    summary: {
      totalInventoryQuantity: totalQuantity,
      totalProducts: productIds.size,
      totalWarehouses: warehouseIds.size,
      lowStockCount: lowStockRows.length,
      outOfStockCount: outOfStockRows.length,
    },
    inventoryByWarehouse: Array.from(byWarehouseMap.values()),
    inventoryByCategory: Array.from(byCategoryMap.values()),
    productsRequiringAttention,
    recentMovements: recentMovements.map((m) => ({
      id: m.id,
      operationType: m.operationType,
      reference: m.reference,
      productId: m.productId,
      productName: m.product.name,
      sku: m.sku,
      quantityChange: m.quantityChange,
      quantityBefore: m.quantityBefore,
      quantityAfter: m.quantityAfter,
      warehouseId: m.warehouseId,
      warehouseName: m.warehouse?.name ?? null,
      locationId: m.locationId,
      locationName: m.location?.name ?? null,
      userEmail: m.userEmail,
      reason: m.reason,
      operationStatus: m.operationStatus,
      createdAt: m.createdAt,
    })),
  };
}
