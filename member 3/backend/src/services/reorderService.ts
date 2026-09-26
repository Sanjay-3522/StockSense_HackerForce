import { prisma } from '../utils/prisma';
import { stockInclude, stockWhere, type InventoryFilters } from './intelligenceQueries';
import { averageDailyConsumption } from './intelligenceCalculations';

const HISTORY_DAYS = 90;
const MOVEMENT_CAP = 10000;

export interface ReorderFilters extends InventoryFilters {
  status?: 'REORDER_RECOMMENDED' | 'NOT_REQUIRED' | 'INSUFFICIENT_DATA';
}

export async function getReorderRecommendations(filters: ReorderFilters) {
  const since = new Date(Date.now() - HISTORY_DAYS * 86400000);
  const stocks = await prisma.stock.findMany({ where: stockWhere(filters), include: stockInclude, orderBy: [{ updatedAt: 'desc' }, { productId: 'asc' }] });
  const productIds = [...new Set(stocks.map((row) => row.productId))];
  const locationIds = [...new Set(stocks.map((row) => row.locationId))];
  const movements = productIds.length && locationIds.length ? await prisma.stockMovement.findMany({
    where: { productId: { in: productIds }, locationId: { in: locationIds }, operationType: 'delivery', quantityChange: { lt: 0 }, createdAt: { gte: since } },
    select: { id: true, productId: true, locationId: true, quantityChange: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: MOVEMENT_CAP,
  }) : [];
  const movementsByStock = new Map<string, typeof movements>();
  for (const movement of movements) {
    if (!movement.locationId) continue;
    const key = `${movement.productId}:${movement.locationId}`;
    const group = movementsByStock.get(key) ?? [];
    group.push(movement);
    movementsByStock.set(key, group);
  }
  const items = stocks.map((stock) => {
    const productMovements = movementsByStock.get(`${stock.productId}:${stock.locationId}`) ?? [];
    const averageDailyConsumption = productMovements.length ? averageDailyConsumptionForWindow(productMovements, HISTORY_DAYS) : null;
    const estimatedDaysRemaining = averageDailyConsumption && averageDailyConsumption > 0 ? stock.quantity / averageDailyConsumption : null;
    const reorderThreshold = null;
    const suggestedReorderQuantity = null;
    const recommendationStatus = 'INSUFFICIENT_DATA' as const;
    return {
      product: stock.product,
      productId: stock.productId,
      sku: stock.product.sku,
      currentStock: stock.quantity,
      warehouse: stock.location.warehouse,
      warehouseId: stock.location.warehouseId,
      location: { id: stock.location.id, name: stock.location.name, code: stock.location.code },
      locationId: stock.locationId,
      averageDailyConsumption,
      consumptionSampleCount: productMovements.length,
      consumptionWindowDays: HISTORY_DAYS,
      estimatedDaysRemaining,
      reorderThreshold,
      suggestedReorderQuantity,
      recommendationStatus,
      explanation: 'No ReorderRule model is present in this archive. A threshold and target quantity cannot be derived safely, so no reorder is recommended.',
    };
  }).filter((item) => !filters.status || item.recommendationStatus === filters.status);
  return {
    state: stocks.length === 0 ? 'NO_DATA' : 'INSUFFICIENT_DATA',
    items,
    calculation: { historyDays: HISTORY_DAYS, consumptionSource: 'negative delivery StockMovement rows', formula: 'sum(abs(negative delivery quantityChange)) / 90 days', recommendationRule: 'A recommendation requires a configured ReorderRule threshold and quantity; neither is present in this project archive.' },
    dataLimitations: ['ReorderRule is not defined in the Prisma schema. Threshold, target quantity, committed stock, and pending operations are unavailable.'],
  };
}

function averageDailyConsumptionForWindow(rows: Array<{ quantityChange: number; createdAt: Date }>, days: number) {
  return averageDailyConsumption(rows, days);
}
