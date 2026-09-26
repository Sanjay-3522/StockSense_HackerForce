/**
 * Smart Reorder Service (Member 3 — Intelligence)
 *
 * Recommendation-only service. Never places orders, never modifies stock.
 *
 * Algorithm (documented for full transparency):
 *
 *  1. For each product (or the requested product), find the current on-hand
 *     stock aggregated across all locations in the specified warehouse (or all
 *     warehouses if none specified).
 *
 *  2. Look up the active ReorderRule for the product+warehouse, if one exists.
 *     Fall back to a global rule (no warehouseId) if present.
 *
 *  3. Calculate average daily consumption over the last 30 days using
 *     negative StockMovement records (deliveries + transfers-out).
 *     Minimum 5 data points required; otherwise return INSUFFICIENT_DATA.
 *
 *  4. Pending receipts: sum of ReceiptItem quantities for receipts in
 *     draft/waiting/ready status (not yet validated).
 *
 *  5. Pending deliveries: sum of DeliveryItem requestedQty for deliveries
 *     in draft/waiting/ready status (not yet validated).
 *
 *  6. Effective stock = currentStock + pendingReceipts - pendingDeliveries.
 *
 *  7. Days remaining = effectiveStock / avgDailyConsumption (if > 0).
 *
 *  8. Recommendation:
 *       If effectiveStock <= reorderPoint → REORDER_RECOMMENDED
 *       Else                             → NOT_REQUIRED
 *       If no consumption history        → INSUFFICIENT_DATA
 *
 * Minimum history: 5 outgoing movements in the last 30 days.
 */
import { prisma } from '../../utils/prisma';

const CONSUMPTION_WINDOW_DAYS = 30;
const MIN_CONSUMPTION_POINTS = 5;

export type ReorderStatus = 'REORDER_RECOMMENDED' | 'NOT_REQUIRED' | 'INSUFFICIENT_DATA';

export interface ReorderRecommendation {
  productId: string;
  productName: string;
  sku: string;
  categoryId: string | null;
  categoryName: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
  currentStock: number;
  pendingReceiptQty: number;
  pendingDeliveryQty: number;
  effectiveStock: number;
  avgDailyConsumption: number | null;
  estimatedDaysRemaining: number | null;
  reorderPoint: number | null;
  suggestedReorderQty: number | null;
  recommendationStatus: ReorderStatus;
  explanation: string;
}

export interface ReorderFilters {
  productId?: string;
  warehouseId?: string;
  categoryId?: string;
  recommendationStatus?: ReorderStatus;
}

export async function getReorderRecommendations(filters: ReorderFilters = {}): Promise<ReorderRecommendation[]> {
  const consumptionStart = new Date();
  consumptionStart.setDate(consumptionStart.getDate() - CONSUMPTION_WINDOW_DAYS);

  // 1. Fetch products to evaluate
  const productWhere: Record<string, unknown> = { isActive: true };
  if (filters.productId) productWhere.id = filters.productId;
  if (filters.categoryId) productWhere.categoryId = filters.categoryId;

  const products = await prisma.product.findMany({
    where: productWhere,
    include: { category: true },
    orderBy: { name: 'asc' },
  });

  // 2. Fetch all reorder rules upfront (for efficiency)
  const reorderRules = await prisma.reorderRule.findMany({ where: { isActive: true } });
  const ruleMap = new Map<string, { reorderPoint: number; reorderQty: number }>();
  for (const rule of reorderRules) {
    const key = `${rule.productId}|${rule.warehouseId ?? '__'}`;
    ruleMap.set(key, { reorderPoint: rule.reorderPoint, reorderQty: rule.reorderQty });
  }

  const recommendations: ReorderRecommendation[] = [];

  for (const product of products) {
    // 3. Aggregate current stock
    const stockWhere: Record<string, unknown> = { productId: product.id };
    if (filters.warehouseId) {
      stockWhere.location = { warehouseId: filters.warehouseId };
    }

    const stockRows = await prisma.stock.findMany({
      where: stockWhere,
      include: { location: { include: { warehouse: true } } },
    });

    const currentStock = stockRows.reduce((s, r) => s + r.quantity, 0);

    // Determine which warehouse(s) to report (first non-null or null if mixed)
    const warehouseIds = [...new Set(stockRows.map((r) => r.location.warehouse.id))];
    const warehouseId = filters.warehouseId ?? (warehouseIds.length === 1 ? warehouseIds[0] : null);
    const warehouseName =
      warehouseId !== null
        ? stockRows.find((r) => r.location.warehouse.id === warehouseId)?.location.warehouse.name ?? null
        : null;

    // 4. Find applicable reorder rule
    const ruleKey = `${product.id}|${warehouseId ?? '__'}`;
    const globalRuleKey = `${product.id}|__`;
    const rule = ruleMap.get(ruleKey) ?? ruleMap.get(globalRuleKey) ?? null;

    // 5. Historical consumption (negative movements = deliveries + transfers-out)
    const consumptionWhere: Record<string, unknown> = {
      productId: product.id,
      quantityChange: { lt: 0 },
      createdAt: { gte: consumptionStart },
    };
    if (filters.warehouseId) consumptionWhere.warehouseId = filters.warehouseId;

    const consumptionMovements = await prisma.stockMovement.findMany({
      where: consumptionWhere,
      select: { quantityChange: true, createdAt: true },
    });

    let avgDailyConsumption: number | null = null;
    if (consumptionMovements.length >= MIN_CONSUMPTION_POINTS) {
      const totalOut = consumptionMovements.reduce((s, m) => s + Math.abs(m.quantityChange), 0);
      avgDailyConsumption = parseFloat((totalOut / CONSUMPTION_WINDOW_DAYS).toFixed(2));
    }

    // 6. Pending receipts (not-yet-validated)
    const pendingReceiptsWhere: Record<string, unknown> = {
      receipt: { status: { in: ['draft', 'waiting', 'ready'] } },
      productId: product.id,
    };
    if (filters.warehouseId) {
      pendingReceiptsWhere.receipt = {
        ...pendingReceiptsWhere.receipt as object,
        warehouseId: filters.warehouseId,
      };
    }
    const pendingReceiptItems = await prisma.receiptItem.findMany({
      where: pendingReceiptsWhere,
      select: { quantity: true },
    });
    const pendingReceiptQty = pendingReceiptItems.reduce((s, i) => s + i.quantity, 0);

    // 7. Pending deliveries (not-yet-validated)
    const pendingDeliveriesWhere: Record<string, unknown> = {
      delivery: { status: { in: ['draft', 'waiting', 'ready'] } },
      productId: product.id,
    };
    if (filters.warehouseId) {
      pendingDeliveriesWhere.delivery = {
        ...pendingDeliveriesWhere.delivery as object,
        warehouseId: filters.warehouseId,
      };
    }
    const pendingDeliveryItems = await prisma.deliveryItem.findMany({
      where: pendingDeliveriesWhere,
      select: { requestedQty: true },
    });
    const pendingDeliveryQty = pendingDeliveryItems.reduce((s, i) => s + i.requestedQty, 0);

    // 8. Effective stock
    const effectiveStock = currentStock + pendingReceiptQty - pendingDeliveryQty;

    // 9. Estimated days remaining
    let estimatedDaysRemaining: number | null = null;
    if (avgDailyConsumption !== null && avgDailyConsumption > 0) {
      estimatedDaysRemaining = parseFloat((effectiveStock / avgDailyConsumption).toFixed(1));
    }

    // 10. Recommendation status
    let recommendationStatus: ReorderStatus;
    let explanation: string;

    if (avgDailyConsumption === null) {
      recommendationStatus = 'INSUFFICIENT_DATA';
      explanation = `Fewer than ${MIN_CONSUMPTION_POINTS} outgoing movements in the last ${CONSUMPTION_WINDOW_DAYS} days. Cannot calculate average consumption or estimate days remaining.`;
    } else if (rule !== null && effectiveStock <= rule.reorderPoint) {
      recommendationStatus = 'REORDER_RECOMMENDED';
      explanation =
        `Effective stock (${effectiveStock}) is at or below the reorder point (${rule.reorderPoint}). ` +
        `At an average daily consumption of ${avgDailyConsumption} units, approximately ${estimatedDaysRemaining} days of stock remain. ` +
        `Suggested reorder quantity: ${rule.reorderQty} units.`;
    } else if (rule === null && avgDailyConsumption > 0 && estimatedDaysRemaining !== null && estimatedDaysRemaining <= 7) {
      recommendationStatus = 'REORDER_RECOMMENDED';
      explanation =
        `No reorder rule configured, but effective stock (${effectiveStock}) covers only ~${estimatedDaysRemaining} days ` +
        `at current average consumption of ${avgDailyConsumption} units/day.`;
    } else {
      recommendationStatus = 'NOT_REQUIRED';
      explanation =
        rule !== null
          ? `Effective stock (${effectiveStock}) is above the reorder point (${rule.reorderPoint}). No reorder action required at this time.`
          : `Effective stock (${effectiveStock}) covers ~${estimatedDaysRemaining ?? '?'} days at current consumption. No reorder rule configured.`;
    }

    const rec: ReorderRecommendation = {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      categoryId: product.categoryId,
      categoryName: product.category?.name ?? null,
      warehouseId,
      warehouseName,
      currentStock,
      pendingReceiptQty,
      pendingDeliveryQty,
      effectiveStock,
      avgDailyConsumption,
      estimatedDaysRemaining,
      reorderPoint: rule?.reorderPoint ?? null,
      suggestedReorderQty: rule?.reorderQty ?? null,
      recommendationStatus,
      explanation,
    };

    // Apply recommendation status filter
    if (!filters.recommendationStatus || rec.recommendationStatus === filters.recommendationStatus) {
      recommendations.push(rec);
    }
  }

  return recommendations;
}
