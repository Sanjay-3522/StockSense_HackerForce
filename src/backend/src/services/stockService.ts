import { prisma } from "../utils/prismaClient";

interface StockFilters {
  productId?: string;
  locationId?: string;
  warehouseId?: string;
}

export const listStock = (filters: StockFilters) =>
  prisma.stock.findMany({
    where: {
      ...(filters.productId ? { productId: filters.productId } : {}),
      ...(filters.locationId ? { locationId: filters.locationId } : {}),
      ...(filters.warehouseId ? { location: { warehouseId: filters.warehouseId } } : {}),
    },
    include: {
      product: { select: { id: true, name: true, sku: true } },
      location: { select: { id: true, name: true, code: true, warehouseId: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

export const getStockByProduct = (productId: string) =>
  prisma.stock.findMany({
    where: { productId },
    include: { location: { include: { warehouse: true } } },
  });
