/**
 * Inventory Investigator Service (Member 3 — Intelligence)
 *
 * On-demand stock discrepancy analysis.
 *
 * Given a recorded quantity and a physical count, this service:
 *  1. Computes the difference.
 *  2. Retrieves all StockMovement records for the product+location in the
 *     optional date range.
 *  3. Sums the traced movements and compares against the expected difference.
 *  4. Returns EXPLAINED / PARTIALLY_EXPLAINED / UNEXPLAINED.
 *
 * This service does NOT infer intent, fraud, theft, or misconduct.
 * It reports factual transaction analysis only.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { AppError } from '../../utils/AppError';

export interface InvestigationInput {
  productId: string;
  locationId?: string;
  warehouseId?: string;
  recordedQuantity: number;
  physicalQuantity: number;
  dateFrom?: string;
  dateTo?: string;
}

type InvestigationStatus = 'EXPLAINED' | 'PARTIALLY_EXPLAINED' | 'UNEXPLAINED' | 'NO_DISCREPANCY';

export async function runInvestigation(input: InvestigationInput) {
  // Validate product
  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product) throw new AppError('Product not found', 404);

  // Validate location if provided
  if (input.locationId) {
    const loc = await prisma.location.findUnique({ where: { id: input.locationId } });
    if (!loc) throw new AppError('Location not found', 404);
  }

  const difference = input.physicalQuantity - input.recordedQuantity;

  if (difference === 0) {
    return {
      status: 'NO_DISCREPANCY' as InvestigationStatus,
      product: { id: product.id, name: product.name, sku: product.sku },
      recordedQuantity: input.recordedQuantity,
      physicalQuantity: input.physicalQuantity,
      difference: 0,
      tracedQuantity: 0,
      unexplainedQuantity: 0,
      relatedMovements: [],
      relatedOperationSummary: {},
      explanation: 'Recorded and physical quantities match. No discrepancy to investigate.',
    };
  }

  // Build movement filter
  const where: Prisma.StockMovementWhereInput = { productId: input.productId };
  if (input.locationId) where.locationId = input.locationId;
  if (input.warehouseId) where.warehouseId = input.warehouseId;

  if (input.dateFrom || input.dateTo) {
    where.createdAt = {};
    if (input.dateFrom) where.createdAt.gte = new Date(input.dateFrom);
    if (input.dateTo) {
      const dt = new Date(input.dateTo);
      if (input.dateTo.length <= 10) dt.setDate(dt.getDate() + 1);
      where.createdAt.lt = dt;
    }
  }

  // Only retrieve movements whose sign matches the discrepancy direction
  // to avoid over-tracing (e.g. a net decrease should look at outgoing movements)
  if (difference < 0) {
    where.quantityChange = { lt: 0 };
  } else {
    where.quantityChange = { gt: 0 };
  }

  const movements = await prisma.stockMovement.findMany({
    where,
    include: { warehouse: true, location: true },
    orderBy: { createdAt: 'desc' },
  });

  const tracedQuantity = movements.reduce((sum, m) => sum + m.quantityChange, 0);
  const unexplainedQuantity = difference - tracedQuantity;

  // Summarise by operation type
  const relatedOperationSummary: Record<string, number> = {};
  for (const m of movements) {
    relatedOperationSummary[m.operationType] =
      (relatedOperationSummary[m.operationType] ?? 0) + m.quantityChange;
  }

  // Status determination
  let status: InvestigationStatus;
  if (unexplainedQuantity === 0) {
    status = 'EXPLAINED';
  } else if (Math.abs(unexplainedQuantity) < Math.abs(difference)) {
    status = 'PARTIALLY_EXPLAINED';
  } else {
    status = 'UNEXPLAINED';
  }

  const explanationParts: string[] = [
    `Expected discrepancy: ${difference > 0 ? '+' : ''}${difference} units.`,
    `Traced via ${movements.length} stock movement(s): ${tracedQuantity > 0 ? '+' : ''}${tracedQuantity} units.`,
  ];
  if (status === 'EXPLAINED') {
    explanationParts.push('All movements within the selected period account for the recorded discrepancy.');
  } else if (status === 'PARTIALLY_EXPLAINED') {
    explanationParts.push(
      `${unexplainedQuantity > 0 ? '+' : ''}${unexplainedQuantity} units could not be traced to movements in the selected period. ` +
        'This may be due to movements outside the date range or missing records.'
    );
  } else {
    explanationParts.push(
      'No movements were found that explain this discrepancy within the selected period and location.'
    );
  }

  return {
    status,
    product: { id: product.id, name: product.name, sku: product.sku },
    filters: {
      locationId: input.locationId ?? null,
      warehouseId: input.warehouseId ?? null,
      dateFrom: input.dateFrom ?? null,
      dateTo: input.dateTo ?? null,
    },
    recordedQuantity: input.recordedQuantity,
    physicalQuantity: input.physicalQuantity,
    difference,
    tracedQuantity,
    unexplainedQuantity,
    relatedOperationSummary,
    relatedMovements: movements.map((m) => ({
      id: m.id,
      operationType: m.operationType,
      reference: m.reference,
      quantityChange: m.quantityChange,
      quantityBefore: m.quantityBefore,
      quantityAfter: m.quantityAfter,
      locationId: m.locationId,
      locationName: m.location?.name ?? null,
      warehouseId: m.warehouseId,
      warehouseName: m.warehouse?.name ?? null,
      userEmail: m.userEmail,
      reason: m.reason,
      createdAt: m.createdAt,
    })),
    explanation: explanationParts.join(' '),
  };
}
