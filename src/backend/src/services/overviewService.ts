import { prisma } from '../utils/prisma';
import { movementInclude, movementWhere, stockWhere, type InventoryFilters } from './intelligenceQueries';

export async function getOverview(filters: InventoryFilters) {
  const where = stockWhere(filters);

  const productWhere = {
    isActive: true,
    ...(filters.productId ? { id: filters.productId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.sku ? { sku: { contains: filters.sku, mode: 'insensitive' as const } } : {}),
  };

  const [products, warehouseCount, byLocation, recentMovements, reorderRules] = await Promise.all([
    // Start from Products and bring their Stock rows along (left-join
    // semantics via `include`) so a product with zero Stock rows — never
    // received, or fully depleted with the row removed — is still counted
    // as zero stock / out of stock, per Step 12's explicit requirement.
    prisma.product.findMany({
      where: productWhere,
      include: {
        category: { select: { id: true, name: true } },
        stocks: {
          where: filters.locationId || filters.warehouseId
            ? { ...(filters.locationId ? { locationId: filters.locationId } : {}), ...(filters.warehouseId ? { location: { warehouseId: filters.warehouseId } } : {}) }
            : undefined,
          include: { location: { select: { id: true, name: true, warehouseId: true, warehouse: { select: { id: true, name: true, code: true } } } } },
        },
        reorderRules: true,
      },
    }),
    prisma.warehouse.count({ where: { isActive: true, ...(filters.warehouseId ? { id: filters.warehouseId } : {}) } }),
    prisma.stock.groupBy({ by: ['locationId'], where, _sum: { quantity: true } }),
    prisma.stockMovement.findMany({ where: movementWhere({ ...filters }), orderBy: { createdAt: 'desc' }, take: 10, include: movementInclude }),
    prisma.reorderRule.findMany({ where: { isActive: true } }),
  ]);

  const locationIds = byLocation.map((row) => row.locationId);
  const locations = locationIds.length
    ? await prisma.location.findMany({ where: { id: { in: locationIds } }, select: { id: true, name: true, code: true, warehouseId: true, warehouse: { select: { id: true, name: true, code: true } } } })
    : [];
  const locationById = new Map(locations.map((location) => [location.id, location]));

  const warehouseTotals = new Map<string, { id: string; name: string; code: string; quantity: number }>();
  for (const row of byLocation) {
    const location = locationById.get(row.locationId);
    if (!location) continue;
    const current = warehouseTotals.get(location.warehouseId) ?? { id: location.warehouse.id, name: location.warehouse.name, code: location.warehouse.code, quantity: 0 };
    current.quantity += row._sum.quantity ?? 0;
    warehouseTotals.set(location.warehouseId, current);
  }

  const categoryTotals = new Map<string, { id: string; name: string; quantity: number }>();
  let inventoryQuantity = 0;
  let trackedStockRows = 0;
  let outOfStockProducts = 0;
  let lowStockProducts = 0;
  const productsRequiringAttention: Array<{ product: { id: string; name: string; sku: string }; quantity: number; location: unknown; reason: string }> = [];

  for (const product of products) {
    const totalForProduct = product.stocks.reduce((sum, s) => sum + s.quantity, 0);
    trackedStockRows += product.stocks.length;
    inventoryQuantity += totalForProduct;

    if (product.category) {
      const current = categoryTotals.get(product.category.id) ?? { id: product.category.id, name: product.category.name, quantity: 0 };
      current.quantity += totalForProduct;
      categoryTotals.set(product.category.id, current);
    }

    // A product with no Stock rows at all is out of stock — the missing
    // row is not a "no data" case, it is zero on-hand quantity.
    if (product.stocks.length === 0 || totalForProduct <= 0) {
      outOfStockProducts++;
      productsRequiringAttention.push({
        product: { id: product.id, name: product.name, sku: product.sku },
        quantity: totalForProduct,
        location: product.stocks[0]?.location ?? null,
        reason: product.stocks.length === 0 ? 'No stock has ever been recorded for this product.' : 'Recorded stock is zero or negative.',
      });
      continue;
    }

    // Low stock: any of the product's applicable ReorderRule scopes puts
    // its current (summed) stock at or below the configured reorder point.
    // Global rule (no warehouse/location) applies to the product's total;
    // a warehouse/location-scoped rule applies to that scope's own total.
    const globalRule = product.reorderRules.find((r) => r.isActive && !r.warehouseId && !r.locationId);
    let isLow = globalRule ? totalForProduct <= globalRule.reorderPoint : false;
    if (!isLow) {
      for (const stock of product.stocks) {
        const scoped = product.reorderRules.find(
          (r) => r.isActive && ((r.locationId && r.locationId === stock.locationId) || (r.warehouseId && !r.locationId && r.warehouseId === stock.location.warehouseId))
        );
        if (scoped && stock.quantity <= scoped.reorderPoint) {
          isLow = true;
          break;
        }
      }
    }
    if (isLow) {
      lowStockProducts++;
      productsRequiringAttention.push({
        product: { id: product.id, name: product.name, sku: product.sku },
        quantity: totalForProduct,
        location: product.stocks[0]?.location ?? null,
        reason: 'Stock is at or below its configured reorder point.',
      });
    }
  }

  return {
    state: products.length ? 'READY' : 'NO_DATA',
    filters,
    totals: {
      inventoryQuantity,
      trackedStockRows,
      products: products.length,
      warehouses: warehouseCount,
      outOfStockProducts,
      lowStockProducts,
      lowStockState: reorderRules.length === 0 ? 'NO_REORDER_RULES_CONFIGURED' : 'READY',
    },
    inventoryByWarehouse: [...warehouseTotals.values()],
    inventoryByCategory: [...categoryTotals.values()],
    productsRequiringAttention: productsRequiringAttention.slice(0, 100),
    recentMovements,
    notes: reorderRules.length === 0 ? ['Low-stock detection is active but no ReorderRule rows exist yet — create them via /api/reorder-rules to populate lowStockProducts.'] : [],
  };
}
