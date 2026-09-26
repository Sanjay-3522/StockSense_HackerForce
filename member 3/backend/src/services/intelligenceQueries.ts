import type { Prisma } from '@prisma/client';

export interface InventoryFilters {
  productId?: string;
  warehouseId?: string;
  locationId?: string;
  categoryId?: string;
  sku?: string;
}

export function stockWhere(filters: InventoryFilters): Prisma.StockWhereInput {
  const where: Prisma.StockWhereInput = {};
  if (filters.productId) where.productId = filters.productId;
  if (filters.locationId) where.locationId = filters.locationId;
  if (filters.categoryId || filters.sku) {
    where.product = {
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.sku ? { sku: { contains: filters.sku, mode: 'insensitive' } } : {}),
    };
  }
  if (filters.warehouseId) where.location = { warehouseId: filters.warehouseId };
  return where;
}

export interface MovementFilters extends InventoryFilters {
  operationType?: 'receipt' | 'delivery' | 'transfer' | 'adjustment';
  reference?: string;
  from?: Date;
  to?: Date;
  direction?: 'positive' | 'negative';
}

export function movementWhere(filters: MovementFilters): Prisma.StockMovementWhereInput {
  const clauses: Prisma.StockMovementWhereInput[] = [];
  if (filters.productId) clauses.push({ productId: filters.productId });
  if (filters.sku) clauses.push({ sku: { contains: filters.sku, mode: 'insensitive' } });
  if (filters.operationType) clauses.push({ operationType: filters.operationType });
  if (filters.reference) clauses.push({ reference: { contains: filters.reference, mode: 'insensitive' } });
  if (filters.from || filters.to) clauses.push({ createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } });
  if (filters.direction === 'positive') clauses.push({ quantityChange: { gt: 0 } });
  if (filters.direction === 'negative') clauses.push({ quantityChange: { lt: 0 } });
  if (filters.locationId) {
    clauses.push({ OR: [
      { operationType: { not: 'transfer' }, locationId: filters.locationId },
      { operationType: 'transfer', quantityChange: { lt: 0 }, sourceLocationId: filters.locationId },
      { operationType: 'transfer', quantityChange: { gt: 0 }, destinationLocationId: filters.locationId },
    ] });
  }
  if (filters.warehouseId) {
    clauses.push({
      OR: [
        { operationType: { not: 'transfer' }, OR: [{ warehouseId: filters.warehouseId }, { location: { is: { warehouseId: filters.warehouseId } } }] },
        { operationType: 'transfer', quantityChange: { lt: 0 }, sourceLocation: { is: { warehouseId: filters.warehouseId } } },
        { operationType: 'transfer', quantityChange: { gt: 0 }, destinationLocation: { is: { warehouseId: filters.warehouseId } } },
      ],
    });
  }
  if (filters.categoryId) clauses.push({ product: { categoryId: filters.categoryId } });
  return clauses.length ? { AND: clauses } : {};
}

export const movementInclude = {
  product: { select: { id: true, name: true, sku: true, unit: true, categoryId: true } },
  warehouse: { select: { id: true, name: true, code: true } },
  location: { select: { id: true, name: true, code: true, warehouseId: true, warehouse: { select: { id: true, name: true, code: true } } } },
  sourceLocation: { select: { id: true, name: true, code: true, warehouseId: true, warehouse: { select: { id: true, name: true, code: true } } } },
  destinationLocation: { select: { id: true, name: true, code: true, warehouseId: true, warehouse: { select: { id: true, name: true, code: true } } } },
} as const;

export const stockInclude = {
  product: { select: { id: true, name: true, sku: true, unit: true, categoryId: true, category: { select: { id: true, name: true } } } },
  location: { select: { id: true, name: true, code: true, warehouseId: true, warehouse: { select: { id: true, name: true, code: true } } } },
} as const;
