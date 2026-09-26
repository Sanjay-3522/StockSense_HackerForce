/**
 * Move History Service (Member 3 — Intelligence)
 *
 * Paginated, filtered access to the StockMovement ledger.
 * Uses Prisma filtering/pagination — never loads the entire table.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';

export interface MovementFilters {
  productId?: string;
  sku?: string;
  warehouseId?: string;
  locationId?: string;
  operationType?: 'receipt' | 'delivery' | 'transfer' | 'adjustment';
  dateFrom?: string;   // ISO date string
  dateTo?: string;     // ISO date string
  direction?: 'positive' | 'negative'; // filter by quantityChange sign
  reference?: string;
  page?: number;
  pageSize?: number;
}

export async function listMovements(filters: MovementFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 50));
  const skip = (page - 1) * pageSize;

  // Build Prisma where clause
  const where: Prisma.StockMovementWhereInput = {};

  if (filters.productId) where.productId = filters.productId;
  if (filters.sku) where.sku = { contains: filters.sku, mode: 'insensitive' };
  if (filters.warehouseId) where.warehouseId = filters.warehouseId;
  if (filters.locationId) where.locationId = filters.locationId;
  if (filters.operationType) where.operationType = filters.operationType;
  if (filters.reference) where.reference = { contains: filters.reference, mode: 'insensitive' };

  // Date range
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      // Make dateTo inclusive by adding 1 day if only date (no time) given
      const dt = new Date(filters.dateTo);
      if (filters.dateTo.length <= 10) dt.setDate(dt.getDate() + 1);
      where.createdAt.lt = dt;
    }
  }

  // Direction filter
  if (filters.direction === 'positive') {
    where.quantityChange = { gt: 0 };
  } else if (filters.direction === 'negative') {
    where.quantityChange = { lt: 0 };
  }

  const [total, rows] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      include: {
        product: true,
        warehouse: true,
        location: true,
        sourceLocation: true,
        destinationLocation: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ]);

  const movements = rows.map((m) => ({
    id: m.id,
    operationType: m.operationType,
    reference: m.reference,
    productId: m.productId,
    productName: m.product.name,
    sku: m.sku,
    quantityChange: m.quantityChange,
    quantityBefore: m.quantityBefore,
    quantityAfter: m.quantityAfter,
    warehouseId: m.warehouseId,
    warehouseName: m.warehouse?.name ?? null,
    locationId: m.locationId,
    locationName: m.location?.name ?? null,
    sourceLocationId: m.sourceLocationId,
    sourceLocationName: m.sourceLocation?.name ?? null,
    destinationLocationId: m.destinationLocationId,
    destinationLocationName: m.destinationLocation?.name ?? null,
    userEmail: m.userEmail,
    reason: m.reason,
    operationStatus: m.operationStatus,
    createdAt: m.createdAt,
  }));

  return {
    data: movements,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: page * pageSize < total,
      hasPreviousPage: page > 1,
    },
  };
}
