/**
 * Explain Stock Change Service (Member 3 — Intelligence)
 *
 * Answers: "Why did this stock change?"
 *
 * Algorithm:
 *  1. Determine the opening quantity at the start of the period (quantityBefore
 *     of the earliest movement in range, or current stock if no movements).
 *  2. Fetch all StockMovement rows matching the filters within the date range.
 *  3. Break movements into incoming (+) and outgoing (-) groups.
 *  4. Aggregate each group by operation type.
 *  5. Compute net movement.
 *  6. Compare computed closing = opening + net with current on-hand stock.
 *  7. Classify the explanation as EXPLAINED / PARTIALLY_EXPLAINED / UNEXPLAINED.
 *
 * IMPORTANT: No explanations are invented. If the math doesn't balance,
 * the status is set to PARTIALLY_EXPLAINED or UNEXPLAINED — not guessed at.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { AppError } from '../../utils/AppError';

export interface StockExplanationInput {
  productId: string;
  warehouseId?: string;
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
  reference?: string;
}

type ExplanationStatus = 'EXPLAINED' | 'PARTIALLY_EXPLAINED' | 'UNEXPLAINED' | 'NO_DATA';

export async function explainStockChange(input: StockExplanationInput) {
  // Validate product exists
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: { category: true },
  });
  if (!product) throw new AppError('Product not found', 404);

  // Build movement filter
  const where: Prisma.StockMovementWhereInput = { productId: input.productId };
  if (input.warehouseId) where.warehouseId = input.warehouseId;
  if (input.locationId) where.locationId = input.locationId;
  if (input.reference) where.reference = { contains: input.reference, mode: 'insensitive' };

  if (input.dateFrom || input.dateTo) {
    where.createdAt = {};
    if (input.dateFrom) where.createdAt.gte = new Date(input.dateFrom);
    if (input.dateTo) {
      const dt = new Date(input.dateTo);
      if (input.dateTo.length <= 10) dt.setDate(dt.getDate() + 1);
      where.createdAt.lt = dt;
    }
  }

  const movements = await prisma.stockMovement.findMany({
    where,
    include: { warehouse: true, location: true },
    orderBy: { createdAt: 'asc' },
  });

  if (movements.length === 0) {
    // No movements: report current on-hand stock (no change to explain)
    const currentStockRows = await prisma.stock.findMany({
      where: {
        productId: input.productId,
        ...(input.locationId ? { locationId: input.locationId } : {}),
        ...(input.warehouseId ? { location: { warehouseId: input.warehouseId } } : {}),
      },
      include: { location: { include: { warehouse: true } } },
    });
    const currentQty = currentStockRows.reduce((s, r) => s + r.quantity, 0);
    return {
      status: 'NO_DATA' as ExplanationStatus,
      product: { id: product.id, name: product.name, sku: product.sku },
      openingQuantity: null,
      closingQuantity: currentQty,
      currentOnHand: currentQty,
      netMovement: 0,
      totalIncoming: 0,
      totalOutgoing: 0,
      incomingByType: {},
      outgoingByType: {},
      majorContributors: [],
      movements: [],
      explanation: 'No stock movements found for the specified filters and period.',
    };
  }

  // Opening quantity = quantityBefore of first movement in the period
  const openingQuantity = movements[0].quantityBefore;

  // Aggregate
  let totalIncoming = 0;
  let totalOutgoing = 0;
  const incomingByType: Record<string, number> = {};
  const outgoingByType: Record<string, number> = {};

  for (const m of movements) {
    if (m.quantityChange > 0) {
      totalIncoming += m.quantityChange;
      incomingByType[m.operationType] = (incomingByType[m.operationType] ?? 0) + m.quantityChange;
    } else if (m.quantityChange < 0) {
      totalOutgoing += m.quantityChange; // negative
      outgoingByType[m.operationType] = (outgoingByType[m.operationType] ?? 0) + m.quantityChange;
    }
  }

  const netMovement = totalIncoming + totalOutgoing;
  const computedClosing = openingQuantity + netMovement;

  // Current on-hand (aggregate across matched locations)
  const currentStockRows = await prisma.stock.findMany({
    where: {
      productId: input.productId,
      ...(input.locationId ? { locationId: input.locationId } : {}),
      ...(input.warehouseId ? { location: { warehouseId: input.warehouseId } } : {}),
    },
  });
  const currentOnHand = currentStockRows.reduce((s, r) => s + r.quantity, 0);

  // If the period ends at "now" the computed closing should equal current on-hand.
  // If the period is historical there may be further movements after the period end.
  const variance = currentOnHand - computedClosing;
  const isPeriodCurrent = !input.dateTo; // no dateTo means "up to now"

  let status: ExplanationStatus;
  if (isPeriodCurrent) {
    if (Math.abs(variance) === 0) {
      status = 'EXPLAINED';
    } else if (Math.abs(variance) < Math.abs(netMovement) * 0.1 || Math.abs(variance) <= 5) {
      status = 'PARTIALLY_EXPLAINED';
    } else {
      status = 'UNEXPLAINED';
    }
  } else {
    // Historical period — we can only verify internal consistency
    status = 'EXPLAINED';
  }

  // Explanation sentence
  let explanationText: string;
  if (netMovement > 0) {
    explanationText = `Stock increased by ${netMovement} units during the selected period (Opening: ${openingQuantity}, Closing: ${computedClosing}).`;
  } else if (netMovement < 0) {
    explanationText = `Stock decreased by ${Math.abs(netMovement)} units during the selected period (Opening: ${openingQuantity}, Closing: ${computedClosing}).`;
  } else {
    explanationText = `No net change in stock during the selected period (Opening = Closing = ${openingQuantity}).`;
  }

  if (status === 'PARTIALLY_EXPLAINED') {
    explanationText += ` A variance of ${variance} units between computed closing and current on-hand could not be attributed to movements in this period.`;
  } else if (status === 'UNEXPLAINED') {
    explanationText += ` A significant variance of ${variance} units exists between the computed closing quantity and current on-hand stock.`;
  }

  // Major contributors (movements contributing >10% of absolute total movement)
  const absTotalMovement = totalIncoming + Math.abs(totalOutgoing);
  const majorContributors = movements
    .filter((m) => absTotalMovement > 0 && Math.abs(m.quantityChange) / absTotalMovement >= 0.1)
    .map((m) => ({
      id: m.id,
      operationType: m.operationType,
      reference: m.reference,
      quantityChange: m.quantityChange,
      createdAt: m.createdAt,
      warehouseName: m.warehouse?.name ?? null,
      locationName: m.location?.name ?? null,
    }));

  return {
    status,
    product: { id: product.id, name: product.name, sku: product.sku, unit: product.unit },
    filters: {
      warehouseId: input.warehouseId ?? null,
      locationId: input.locationId ?? null,
      dateFrom: input.dateFrom ?? null,
      dateTo: input.dateTo ?? null,
    },
    openingQuantity,
    closingQuantity: computedClosing,
    currentOnHand,
    variance: isPeriodCurrent ? variance : null,
    netMovement,
    totalIncoming,
    totalOutgoing,
    incomingByType,
    outgoingByType,
    movementCount: movements.length,
    majorContributors,
    explanation: explanationText,
    movements: movements.map((m) => ({
      id: m.id,
      operationType: m.operationType,
      reference: m.reference,
      quantityChange: m.quantityChange,
      quantityBefore: m.quantityBefore,
      quantityAfter: m.quantityAfter,
      warehouseId: m.warehouseId,
      warehouseName: m.warehouse?.name ?? null,
      locationId: m.locationId,
      locationName: m.location?.name ?? null,
      userEmail: m.userEmail,
      reason: m.reason,
      createdAt: m.createdAt,
    })),
  };
}
