import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { getAnomalies } from './anomalyService';
import { AppError } from '../utils/AppError';

export type ActionStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type ActionPriority = 'CRITICAL' | 'NEEDS_REVIEW' | 'INFORMATION';

interface ActionCandidate {
  type: string;
  priority: ActionPriority;
  title: string;
  description: string;
  source: string;
  productId?: string | null;
  warehouseId?: string | null;
  locationId?: string | null;
  referenceId?: string | null;
  recommendedAction?: string | null;
  fingerprint: string;
}

async function upsertCandidate(candidate: ActionCandidate) {
  const dedupeKey = [candidate.source, candidate.type, candidate.productId ?? '-', candidate.warehouseId ?? '-', candidate.locationId ?? '-'].join(':');
  const existing = await prisma.intelligenceAction.findUnique({ where: { dedupeKey } });
  if (existing) {
    if (existing.status === 'RESOLVED' && existing.conditionFingerprint === candidate.fingerprint) return existing;
    return prisma.intelligenceAction.update({ where: { id: existing.id }, data: {
      priority: candidate.priority,
      title: candidate.title,
      description: candidate.description,
      referenceId: candidate.referenceId ?? null,
      recommendedAction: candidate.recommendedAction ?? null,
      conditionFingerprint: candidate.fingerprint,
      ...(existing.status === 'RESOLVED' ? { status: 'OPEN', resolvedAt: null } : {}),
    } });
  }
  try {
    return await prisma.intelligenceAction.create({ data: {
      type: candidate.type,
      priority: candidate.priority,
      title: candidate.title,
      description: candidate.description,
      source: candidate.source,
      status: 'OPEN',
      productId: candidate.productId ?? null,
      warehouseId: candidate.warehouseId ?? null,
      locationId: candidate.locationId ?? null,
      referenceId: candidate.referenceId ?? null,
      recommendedAction: candidate.recommendedAction ?? null,
      conditionFingerprint: candidate.fingerprint,
      dedupeKey,
    } });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
    const raced = await prisma.intelligenceAction.findUnique({ where: { dedupeKey } });
    if (!raced) throw error;
    if (raced.status === 'RESOLVED' && raced.conditionFingerprint === candidate.fingerprint) return raced;
    return prisma.intelligenceAction.update({ where: { id: raced.id }, data: { title: candidate.title, description: candidate.description, priority: candidate.priority, conditionFingerprint: candidate.fingerprint, ...(raced.status === 'RESOLVED' ? { status: 'OPEN', resolvedAt: null } : {}) } });
  }
}

/** Refresh deterministic signals from actual records; this never changes stock or places orders. */
export async function refreshActions() {
  const anomalies = await getAnomalies({});
  for (const anomaly of anomalies.items) {
    const item = anomaly as Record<string, unknown>;
    const operation = item.operation as { reference?: string } | undefined;
    const product = item.product as { name?: string; sku?: string } | undefined;
    const location = item.location as { name?: string } | null | undefined;
    const severity = String(item.severity);
    await upsertCandidate({
      type: String(item.anomalyType),
      priority: severity === 'CRITICAL' ? 'CRITICAL' : 'NEEDS_REVIEW',
      title: `${String(item.anomalyType).replace(/_/g, ' ')}: ${product?.name ?? item.sku ?? 'Inventory item'}`,
      description: String(item.reason),
      source: 'ANOMALY_DETECTION',
      productId: typeof item.productId === 'string' ? item.productId : null,
      warehouseId: typeof item.warehouseId === 'string' ? item.warehouseId : null,
      locationId: typeof item.locationId === 'string' ? item.locationId : null,
      referenceId: operation?.reference ?? null,
      recommendedAction: 'Review the supporting movement records and confirm whether the activity is expected.',
      fingerprint: String(item.id),
    });
  }

  const emptyRows = await prisma.stock.findMany({
    where: { quantity: { lte: 0 } },
    select: { productId: true, quantity: true, updatedAt: true, product: { select: { name: true, sku: true } }, locationId: true, location: { select: { name: true, warehouseId: true, warehouse: { select: { name: true } } } } },
    take: 1000,
    orderBy: { updatedAt: 'desc' },
  });
  const stockProductIds = [...new Set(emptyRows.map((row) => row.productId))];
  const stockLocationIds = [...new Set(emptyRows.map((row) => row.locationId))];
  const latestStockMovements = stockProductIds.length && stockLocationIds.length ? await prisma.stockMovement.findMany({
    where: { productId: { in: stockProductIds }, OR: [{ locationId: { in: stockLocationIds } }, { sourceLocationId: { in: stockLocationIds } }, { destinationLocationId: { in: stockLocationIds } }] },
    select: { id: true, productId: true, locationId: true, sourceLocationId: true, destinationLocationId: true, quantityChange: true, reference: true, createdAt: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 10000,
  }) : [];
  const latestByStock = new Map<string, (typeof latestStockMovements)[number]>();
  for (const movement of latestStockMovements) {
    const movementLocationId = movement.locationId ?? (movement.quantityChange < 0 ? movement.sourceLocationId : movement.destinationLocationId);
    if (movementLocationId && !latestByStock.has(`${movement.productId}:${movementLocationId}`)) latestByStock.set(`${movement.productId}:${movementLocationId}`, movement);
  }
  for (const row of emptyRows) {
    const lastMovement = latestByStock.get(`${row.productId}:${row.locationId}`);
    await upsertCandidate({
      type: 'OUT_OF_STOCK',
      priority: 'NEEDS_REVIEW',
      title: `Out of stock: ${row.product.name} at ${row.location.name}`,
      description: `Recorded stock is ${row.quantity}. This signal is based on the current Stock row.`,
      source: 'INVENTORY_CONDITION',
      productId: row.productId,
      warehouseId: row.location.warehouseId,
      locationId: row.locationId,
      referenceId: lastMovement?.reference ?? null,
      recommendedAction: 'Review stock availability and the latest movement history.',
      fingerprint: `${row.quantity}:${lastMovement?.id ?? row.updatedAt.toISOString()}`,
    });
  }
  return { generatedFromAnomalies: anomalies.items.length, outOfStockConditions: emptyRows.length };
}

export interface ActionFilters {
  priority?: string;
  status?: string;
  type?: string;
  source?: string;
  warehouseId?: string;
  productId?: string;
  from?: Date;
  to?: Date;
}

export async function listActions(filters: ActionFilters, page: number, limit: number) {
  const refreshed = await refreshActions();
  const where: Prisma.IntelligenceActionWhereInput = {
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
    ...(filters.productId ? { productId: filters.productId } : {}),
    ...(filters.from || filters.to ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } } : {}),
  };
  const priorityOrder = filters.priority ? [filters.priority] : ['CRITICAL', 'NEEDS_REVIEW', 'INFORMATION'];
  const [counts, total] = await Promise.all([
    prisma.intelligenceAction.groupBy({ by: ['priority'], where, _count: { _all: true } }),
    prisma.intelligenceAction.count({ where }),
  ]);
  let offset = (page - 1) * limit;
  let remaining = limit;
  const selected: Array<Promise<Awaited<ReturnType<typeof prisma.intelligenceAction.findMany>>>> = [];
  for (const priority of priorityOrder) {
    const count = counts.find((row) => row.priority === priority)?._count._all ?? 0;
    if (offset >= count) { offset -= count; continue; }
    const take = Math.min(count - offset, remaining);
    if (take > 0) selected.push(prisma.intelligenceAction.findMany({ where: { ...where, priority }, orderBy: { createdAt: 'desc' }, skip: offset, take }));
    remaining -= take;
    offset = 0;
    if (remaining <= 0) break;
  }
  const items = (await Promise.all(selected)).flat();
  return { state: total ? 'READY' : 'NO_DATA', items, pagination: { page, limit, total, pageCount: Math.ceil(total / limit) }, refresh: refreshed };
}

export async function getAction(id: string) {
  const action = await prisma.intelligenceAction.findUnique({ where: { id } });
  if (!action) throw new AppError('Action not found', 404, 'NOT_FOUND');
  return action;
}

export async function setActionInProgress(id: string) {
  const action = await getAction(id);
  if (action.status === 'IN_PROGRESS') return action;
  if (action.status !== 'OPEN') throw new AppError('Only OPEN actions can move to IN_PROGRESS', 409, 'INVALID_STATUS_TRANSITION');
  return prisma.intelligenceAction.update({ where: { id }, data: { status: 'IN_PROGRESS' } });
}

export async function resolveAction(id: string) {
  const action = await getAction(id);
  if (action.status === 'RESOLVED') return action;
  return prisma.intelligenceAction.update({ where: { id }, data: { status: 'RESOLVED', resolvedAt: new Date() } });
}
