import { prisma } from '../utils/prisma';

// Member 2's original lookupService also re-exposed products/warehouses/
// locations/categories/adjustmentReasons — all already served by Member 1's
// foundation APIs (/api/products, /api/warehouses, /api/locations,
// /api/categories, /api/adjustment-reasons). Keeping both would duplicate
// equivalent APIs (forbidden by the merge rules), so only the operations-
// specific helper below — not covered anywhere else — survives here.

/** Returns the current on-hand quantity for a product at a location (0 if no row exists). */
export async function getStockQuantity(productId: string, locationId: string): Promise<number> {
  const row = await prisma.stock.findUnique({
    where: { productId_locationId: { productId, locationId } },
  });
  return row?.quantity ?? 0;
}
