import { prisma } from '../utils/prisma';
import { stockInclude, stockWhere, type InventoryFilters } from './intelligenceQueries';
import { averageDailyConsumption } from './intelligenceCalculations';

const HISTORY_DAYS = 90;
const MOVEMENT_CAP = 10000;

export interface ReorderFilters extends InventoryFilters {
  status?: 'REORDER_RECOMMENDED' | 'NOT_REQUIRED' | 'INSUFFICIENT_DATA';
}

// Reorder rules can be scoped to a specific location, a whole warehouse (any
// location within it), or globally to a product (see Member 1's
// ReorderRule model — locationId/warehouseId both null). Most specific
// match wins: location rule > warehouse rule > global rule.
function pickApplicableRule(
  rules: Array<{ id: string; productId: string; warehouseId: string | null; locationId: string | null; reorderPoint: number; reorderQuantity: number; maxStock: number | null; isActive: boolean }>,
  productId: string,
  warehouseId: string,
  locationId: string
) {
  const active = rules.filter((r) => r.isActive && r.productId === productId);
  return (
    active.find((r) => r.locationId === locationId) ??
    active.find((r) => r.warehouseId === warehouseId && r.locationId === null) ??
    active.find((r) => r.warehouseId === null && r.locationId === null) ??
    null
  );
}

export async function getReorderRecommendations(filters: ReorderFilters) {
  const since = new Date(Date.now() - HISTORY_DAYS * 86400000);
  const stocks = await prisma.stock.findMany({ where: stockWhere(filters), include: stockInclude, orderBy: [{ updatedAt: 'desc' }, { productId: 'asc' }] });
  const productIds = [...new Set(stocks.map((row) => row.productId))];
  const locationIds = [...new Set(stocks.map((row) => row.locationId))];

  const [movements, reorderRules] = await Promise.all([
    productIds.length && locationIds.length
      ? prisma.stockMovement.findMany({
          where: { productId: { in: productIds }, locationId: { in: locationIds }, operationType: 'delivery', quantityChange: { lt: 0 }, createdAt: { gte: since } },
          select: { id: true, productId: true, locationId: true, quantityChange: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: MOVEMENT_CAP,
        })
      : Promise.resolve([]),
    productIds.length
      ? prisma.reorderRule.findMany({ where: { productId: { in: productIds }, isActive: true } })
      : Promise.resolve([]),
  ]);

  const movementsByStock = new Map<string, typeof movements>();
  for (const movement of movements) {
    if (!movement.locationId) continue;
    const key = `${movement.productId}:${movement.locationId}`;
    const group = movementsByStock.get(key) ?? [];
    group.push(movement);
    movementsByStock.set(key, group);
  }

  const items = stocks
    .map((stock) => {
      const productMovements = movementsByStock.get(`${stock.productId}:${stock.locationId}`) ?? [];
      const avgDailyConsumption = productMovements.length ? averageDailyConsumption(productMovements, HISTORY_DAYS) : null;
      const estimatedDaysRemaining = avgDailyConsumption && avgDailyConsumption > 0 ? stock.quantity / avgDailyConsumption : null;

      const rule = pickApplicableRule(reorderRules, stock.productId, stock.location.warehouseId, stock.locationId);
      const reorderThreshold = rule?.reorderPoint ?? null;
      const suggestedReorderQuantity = rule?.reorderQuantity ?? null;

      const recommendationStatus: 'REORDER_RECOMMENDED' | 'NOT_REQUIRED' | 'INSUFFICIENT_DATA' =
        !rule ? 'INSUFFICIENT_DATA' : stock.quantity <= rule.reorderPoint ? 'REORDER_RECOMMENDED' : 'NOT_REQUIRED';

      const explanation = !rule
        ? 'No active ReorderRule is configured for this product at this scope (location, warehouse, or global). Configure one under /api/reorder-rules to enable a recommendation.'
        : recommendationStatus === 'REORDER_RECOMMENDED'
        ? `Current stock (${stock.quantity}) is at or below the configured reorder point (${rule.reorderPoint}).`
        : `Current stock (${stock.quantity}) is above the configured reorder point (${rule.reorderPoint}).`;

      return {
        product: stock.product,
        productId: stock.productId,
        sku: stock.product.sku,
        currentStock: stock.quantity,
        warehouse: stock.location.warehouse,
        warehouseId: stock.location.warehouseId,
        location: { id: stock.location.id, name: stock.location.name, code: stock.location.code },
        locationId: stock.locationId,
        averageDailyConsumption: avgDailyConsumption,
        consumptionSampleCount: productMovements.length,
        consumptionWindowDays: HISTORY_DAYS,
        estimatedDaysRemaining,
        reorderThreshold,
        suggestedReorderQuantity,
        reorderRuleId: rule?.id ?? null,
        maxStock: rule?.maxStock ?? null,
        recommendationStatus,
        explanation,
      };
    })
    .filter((item) => !filters.status || item.recommendationStatus === filters.status);

  return {
    state: stocks.length === 0 ? 'NO_DATA' : 'READY',
    items,
    calculation: {
      historyDays: HISTORY_DAYS,
      consumptionSource: 'negative delivery StockMovement rows (internal transfers are explicitly excluded — they are not customer demand)',
      formula: 'sum(abs(negative delivery quantityChange)) / 90 days',
      recommendationRule: 'currentStock <= ReorderRule.reorderPoint, using the most specific active rule (location > warehouse > global). No configured rule => INSUFFICIENT_DATA.',
    },
    dataLimitations: reorderRules.length === 0 ? ['No ReorderRule rows are configured yet for the products in scope; recommendations will be INSUFFICIENT_DATA until rules are created via /api/reorder-rules.'] : [],
  };
}
