import { prisma } from '../utils/prisma';

export function listProducts() {
  return prisma.product.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
}

export function listWarehouses() {
  return prisma.warehouse.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
}

export function listLocations() {
  return prisma.location.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
}

export function listCategories() {
  return prisma.productCategory.findMany({ orderBy: { name: 'asc' } });
}

export function listAdjustmentReasons() {
  return prisma.adjustmentReason.findMany({ orderBy: { name: 'asc' } });
}

/** Returns the current on-hand quantity for a product at a location (0 if no row exists). */
export async function getStockQuantity(productId: string, locationId: string): Promise<number> {
  const row = await prisma.stock.findUnique({
    where: { productId_locationId: { productId, locationId } },
  });
  return row?.quantity ?? 0;
}
