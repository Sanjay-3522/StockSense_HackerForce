import { prisma } from '../utils/prisma';
import { movementInclude, movementWhere } from './intelligenceQueries';
import { explainDifference, sumSignedMovements, summarizeMovements } from './intelligenceCalculations';
import { AppError } from '../utils/AppError';

export interface ExplanationInput {
  productId: string;
  warehouseId?: string;
  locationId?: string;
  from?: Date;
  to?: Date;
  reference?: string;
}

export async function explainStockChange(input: ExplanationInput) {
  const where = movementWhere({ ...input, reference: input.reference });
  const [product, movements, currentRows] = await Promise.all([
    prisma.product.findUnique({ where: { id: input.productId }, select: { id: true, name: true, sku: true, unit: true } }),
    prisma.stockMovement.findMany({ where, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 5000, include: movementInclude }),
    prisma.stock.aggregate({ where: { productId: input.productId, ...(input.locationId ? { locationId: input.locationId } : {}), ...(input.warehouseId ? { location: { warehouseId: input.warehouseId } } : {}) }, _sum: { quantity: true } }),
  ]);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
  const totals = summarizeMovements(movements);
  const { incoming, outgoing, net } = { incoming: totals.incoming, outgoing: totals.outgoing, net: totals.net };
  const openingByLocation = new Map<string, number>();
  for (const movement of movements) {
    const movementLocationId = movement.locationId ?? (movement.quantityChange < 0 ? movement.sourceLocationId : movement.destinationLocationId);
    if (movementLocationId && !openingByLocation.has(movementLocationId)) openingByLocation.set(movementLocationId, movement.quantityBefore);
  }
  const openingQuantity = movements.length && openingByLocation.size ? [...openingByLocation.values()].reduce((sum, quantity) => sum + quantity, 0) : movements.length ? movements[0].quantityBefore : null;
  const expectedClosingQuantity = openingQuantity === null ? null : openingQuantity + net;
  const currentQuantity = currentRows._sum.quantity ?? 0;
  const currentComparisonAvailable = !input.to || input.to.getTime() >= Date.now();
  const unresolvedQuantity = expectedClosingQuantity === null || !currentComparisonAvailable ? null : currentQuantity - expectedClosingQuantity;
  const state = movements.length === 0 ? 'NO_DATA' : !currentComparisonAvailable ? 'READY' : unresolvedQuantity === 0 ? 'READY' : unresolvedQuantity === null ? 'UNEXPLAINED' : 'PARTIALLY_EXPLAINED';
  return {
    state,
    product,
    filters: { warehouseId: input.warehouseId ?? null, locationId: input.locationId ?? null, from: input.from?.toISOString() ?? null, to: input.to?.toISOString() ?? null, reference: input.reference ?? null },
    openingQuantity,
    incomingQuantity: incoming,
    outgoingQuantity: outgoing,
    netMovement: net,
    expectedClosingQuantity,
    currentQuantity,
    currentComparisonAvailable,
    unresolvedQuantity,
    movements,
    explanation: movements.length ? `Ledger movements total a net change of ${net} ${product.unit}.` : 'No matching ledger movements were found for the selected scope.',
    comparisonNote: currentComparisonAvailable ? null : 'The selected range ends before the current time, so the present-day stock snapshot is not compared with the historical closing balance.',
    limitation: movements.length === 5000 ? 'Results reached the 5,000 movement analysis cap; narrow the date range for a complete explanation.' : null,
  };
}

export interface InvestigationInput {
  productId: string;
  warehouseId?: string;
  locationId?: string;
  recordedQuantity: number;
  physicalQuantity: number;
  from?: Date;
  to?: Date;
}

export async function investigateDiscrepancy(input: InvestigationInput) {
  const expectedDifference = input.physicalQuantity - input.recordedQuantity;
  const matchingLocation = input.locationId ? await prisma.location.findUnique({ where: { id: input.locationId }, select: { id: true, warehouseId: true } }) : null;
  if (input.locationId && !matchingLocation) throw new AppError('Location not found', 404, 'NOT_FOUND');
  if (matchingLocation && input.warehouseId && matchingLocation.warehouseId !== input.warehouseId) throw new AppError('Location does not belong to the requested warehouse', 400, 'VALIDATION_ERROR');
  const where = movementWhere({ productId: input.productId, locationId: input.locationId, warehouseId: input.warehouseId, from: input.from, to: input.to });
  const [product, movements] = await Promise.all([
    prisma.product.findUnique({ where: { id: input.productId }, select: { id: true, name: true, sku: true, unit: true } }),
    prisma.stockMovement.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 5000, include: movementInclude }),
  ]);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
  const traced = sumSignedMovements(expectedDifference, movements);
  const analysis = explainDifference(expectedDifference, traced);
  return {
    state: analysis.status,
    recordedQuantity: input.recordedQuantity,
    physicalQuantity: input.physicalQuantity,
    difference: expectedDifference,
    tracedQuantity: traced,
    unexplainedQuantity: analysis.unexplained,
    relatedMovements: movements,
    relatedOperations: [...new Map(movements.map((movement) => [movement.reference, { reference: movement.reference, operationType: movement.operationType, quantityChange: movement.quantityChange }])).values()],
    product,
    filters: { warehouseId: input.warehouseId ?? null, locationId: input.locationId ?? null, from: input.from?.toISOString() ?? null, to: input.to?.toISOString() ?? null },
    limitation: movements.length === 5000 ? 'Results reached the 5,000 movement analysis cap; narrow the date range for a complete trace.' : null,
    explanation: `The physical-to-recorded difference is ${expectedDifference}; ${traced} is supported by matching signed ledger movements.`,
  };
}
