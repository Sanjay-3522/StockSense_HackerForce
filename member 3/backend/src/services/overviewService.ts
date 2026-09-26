import { prisma } from '../utils/prisma';
import { movementInclude, movementWhere, stockWhere, type InventoryFilters } from './intelligenceQueries';

export async function getOverview(filters: InventoryFilters) {
  const where = stockWhere(filters);
  const [inventory, productCount, warehouseCount, byLocation, byProduct, recentMovements, zeroStock] = await Promise.all([
    prisma.stock.aggregate({ where, _sum: { quantity: true }, _count: { _all: true } }),
    prisma.product.count({ where: { isActive: true, ...(filters.productId ? { id: filters.productId } : {}), ...(filters.categoryId ? { categoryId: filters.categoryId } : {}), ...(filters.sku ? { sku: { contains: filters.sku, mode: 'insensitive' as const } } : {}) } }),
    prisma.warehouse.count({ where: { isActive: true, ...(filters.warehouseId ? { id: filters.warehouseId } : {}) } }),
    prisma.stock.groupBy({ by: ['locationId'], where, _sum: { quantity: true } }),
    prisma.stock.groupBy({ by: ['productId'], where, _sum: { quantity: true } }),
    prisma.stockMovement.findMany({ where: movementWhere({ ...filters }), orderBy: { createdAt: 'desc' }, take: 10, include: movementInclude }),
    prisma.stock.findMany({ where: { ...where, quantity: { lte: 0 } }, take: 100, include: { product: { select: { id: true, name: true, sku: true } }, location: { select: { id: true, name: true, warehouse: { select: { id: true, name: true } } } } }, orderBy: { updatedAt: 'desc' } }),
  ]);

  const locationIds = byLocation.map((row) => row.locationId);
  const locations = locationIds.length ? await prisma.location.findMany({ where: { id: { in: locationIds } }, select: { id: true, name: true, code: true, warehouseId: true, warehouse: { select: { id: true, name: true, code: true } } } }) : [];
  const locationById = new Map(locations.map((location) => [location.id, location]));
  const productIds = byProduct.map((row) => row.productId);
  const products = productIds.length ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, sku: true, categoryId: true, category: { select: { id: true, name: true } } } }) : [];
  const productById = new Map(products.map((product) => [product.id, product]));

  const warehouseTotals = new Map<string, { id: string; name: string; code: string; quantity: number }>();
  for (const row of byLocation) {
    const location = locationById.get(row.locationId);
    if (!location) continue;
    const current = warehouseTotals.get(location.warehouseId) ?? { id: location.warehouse.id, name: location.warehouse.name, code: location.warehouse.code, quantity: 0 };
    current.quantity += row._sum.quantity ?? 0;
    warehouseTotals.set(location.warehouseId, current);
  }
  const categoryTotals = new Map<string, { id: string; name: string; quantity: number }>();
  for (const row of byProduct) {
    const product = productById.get(row.productId);
    if (!product?.category) continue;
    const current = categoryTotals.get(product.category.id) ?? { id: product.category.id, name: product.category.name, quantity: 0 };
    current.quantity += row._sum.quantity ?? 0;
    categoryTotals.set(product.category.id, current);
  }

  return {
    state: inventory._count._all ? 'READY' : 'NO_DATA',
    filters,
    totals: {
      inventoryQuantity: inventory._sum.quantity ?? 0,
      trackedStockRows: inventory._count._all,
      products: productCount,
      warehouses: warehouseCount,
      outOfStockProducts: byProduct.filter((row) => (row._sum.quantity ?? 0) <= 0).length,
      lowStockProducts: null,
      lowStockState: 'INSUFFICIENT_DATA',
    },
    inventoryByWarehouse: [...warehouseTotals.values()],
    inventoryByCategory: [...categoryTotals.values()],
    productsRequiringAttention: zeroStock.map((row) => ({
      product: row.product,
      quantity: row.quantity,
      location: row.location,
      reason: 'Recorded stock is zero or negative.',
    })),
    recentMovements,
    notes: ['Low-stock status is unavailable because this archive contains no ReorderRule model or threshold fields.'],
  };
}
