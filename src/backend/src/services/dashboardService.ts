import { prisma } from "../utils/prismaClient";

// A stock record at or below this quantity (but above zero) is considered
// "low stock". Configurable since the right threshold varies by business;
// out-of-stock (quantity <= 0) is always tracked separately below.
const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD || 10);

export interface DashboardFilters {
  warehouseId?: string;
  locationId?: string;
  categoryId?: string;
}

/**
 * Aggregated summary for the authenticated dashboard shell.
 *
 * Of the official StockSense KPI set, only the ones calculable from
 * foundation data (Products, Stock, Warehouses, Locations, Categories) are
 * implemented here: total active products, total products currently in
 * stock, and low/out-of-stock counts. Pending Receipts, Pending Deliveries,
 * and Scheduled Internal Transfers depend on the operational modules owned
 * by the other backend and are intentionally left out rather than faked.
 *
 * Supports the Warehouse/Location and Product Category filters from the
 * official dashboard spec; Document Type and Status filters are operational
 * (receipts/deliveries) and are out of scope for the same reason.
 */
export const getDashboardSummary = async (filters: DashboardFilters = {}) => {
  const { warehouseId, locationId, categoryId } = filters;

  const stockWhere = {
    ...(locationId ? { locationId } : {}),
    ...(warehouseId ? { location: { warehouseId } } : {}),
    ...(categoryId ? { product: { categoryId } } : {}),
  };

  const [
    activeWarehouses,
    activeLocations,
    activeProducts,
    outOfStockRecords,
    lowStockRecords,
    inStockProductIds,
  ] = await Promise.all([
    prisma.warehouse.count({
      where: { isActive: true, ...(warehouseId ? { id: warehouseId } : {}) },
    }),
    prisma.location.count({
      where: {
        isActive: true,
        ...(warehouseId ? { warehouseId } : {}),
      },
    }),
    prisma.product.count({
      where: { isActive: true, ...(categoryId ? { categoryId } : {}) },
    }),
    prisma.stock.count({ where: { ...stockWhere, quantity: { lte: 0 } } }),
    prisma.stock.count({
      where: { ...stockWhere, quantity: { gt: 0, lte: LOW_STOCK_THRESHOLD } },
    }),
    prisma.stock.findMany({
      where: { ...stockWhere, quantity: { gt: 0 } },
      distinct: ["productId"],
      select: { productId: true },
    }),
  ]);

  const recentWarehouses = await prisma.warehouse.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, code: true, name: true, isActive: true },
  });

  return {
    counts: {
      activeWarehouses,
      activeLocations,
      activeProducts,
      totalProductsInStock: inStockProductIds.length,
      outOfStockRecords,
      lowStockRecords,
    },
    filtersApplied: { warehouseId, locationId, categoryId },
    recentWarehouses,
  };
};
