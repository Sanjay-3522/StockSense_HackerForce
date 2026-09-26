/**
 * Action Center Service (Member 3 — Intelligence)
 *
 * Manages IntelligenceAction records — the human-facing "what needs attention?" queue.
 *
 * Key design rules:
 *  - Action Center NEVER modifies inventory.
 *  - Actions are created by intelligence services (anomaly, reorder, etc.).
 *  - Deduplication: OPEN actions with the same (source + type + productId + warehouseId)
 *    are NOT duplicated. The existing OPEN record is reused/updated.
 *  - Status transitions allowed: OPEN → IN_PROGRESS → RESOLVED.
 *  - Reverse transitions (e.g. RESOLVED → OPEN) are blocked.
 *  - A new OPEN action may be created later if the condition genuinely recurs
 *    after the previous one was RESOLVED.
 */
import { ActionStatus, ActionPriority, ActionType, Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { AppError } from '../../utils/AppError';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateActionInput {
  type: ActionType;
  priority: ActionPriority;
  title: string;
  description: string;
  source: string;
  productId?: string | null;
  warehouseId?: string | null;
  locationId?: string | null;
  referenceId?: string | null;
  recommendedAction?: string | null;
}

export interface ListActionsFilters {
  status?: ActionStatus;
  priority?: ActionPriority;
  type?: ActionType;
  source?: string;
  warehouseId?: string;
  productId?: string;
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

export async function listActions(filters: ListActionsFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 50));
  const skip = (page - 1) * pageSize;

  const where: Prisma.IntelligenceActionWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.type) where.type = filters.type;
  if (filters.source) where.source = { contains: filters.source, mode: 'insensitive' };
  if (filters.warehouseId) where.warehouseId = filters.warehouseId;
  if (filters.productId) where.productId = filters.productId;
  if (filters.locationId) where.locationId = filters.locationId;
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const dt = new Date(filters.dateTo);
      if (filters.dateTo.length <= 10) dt.setDate(dt.getDate() + 1);
      where.createdAt.lt = dt;
    }
  }

  const [total, actions] = await Promise.all([
    prisma.intelligenceAction.count({ where }),
    prisma.intelligenceAction.findMany({
      where,
      include: { product: true, warehouse: true, location: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: pageSize,
    }),
  ]);

  return {
    data: actions,
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

export async function getAction(id: string) {
  const action = await prisma.intelligenceAction.findUnique({
    where: { id },
    include: { product: true, warehouse: true, location: true },
  });
  if (!action) throw new AppError('Action not found', 404);
  return action;
}

// ---------------------------------------------------------------------------
// Deduplication-aware upsert (used internally by intelligence services)
// ---------------------------------------------------------------------------

/**
 * Creates a new OPEN action only if there is no existing OPEN action with the
 * same (type, source, productId, warehouseId). If one exists, it is returned
 * as-is (no duplicate created). This keeps the action center clean even if
 * the anomaly/reorder service is called frequently.
 */
export async function upsertAction(input: CreateActionInput): Promise<{
  action: Awaited<ReturnType<typeof prisma.intelligenceAction.findFirst>>;
  created: boolean;
}> {
  // Deduplication key: type + source + productId + warehouseId + status=OPEN
  const existing = await prisma.intelligenceAction.findFirst({
    where: {
      type: input.type,
      source: input.source,
      productId: input.productId ?? null,
      warehouseId: input.warehouseId ?? null,
      status: 'OPEN',
    },
  });

  if (existing) {
    // Update the description/title in case the condition changed slightly
    const updated = await prisma.intelligenceAction.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority,
        recommendedAction: input.recommendedAction ?? undefined,
      },
    });
    return { action: updated, created: false };
  }

  const created = await prisma.intelligenceAction.create({
    data: {
      type: input.type,
      priority: input.priority,
      title: input.title,
      description: input.description,
      source: input.source,
      productId: input.productId ?? null,
      warehouseId: input.warehouseId ?? null,
      locationId: input.locationId ?? null,
      referenceId: input.referenceId ?? null,
      recommendedAction: input.recommendedAction ?? null,
      status: 'OPEN',
    },
  });
  return { action: created, created: true };
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: [], // cannot transition from resolved
};

export async function updateAction(
  id: string,
  data: { status?: ActionStatus; priority?: ActionPriority; recommendedAction?: string }
) {
  const action = await prisma.intelligenceAction.findUnique({ where: { id } });
  if (!action) throw new AppError('Action not found', 404);

  if (data.status && data.status !== action.status) {
    const allowed = ALLOWED_TRANSITIONS[action.status];
    if (!allowed.includes(data.status)) {
      throw new AppError(
        `Cannot transition action from ${action.status} to ${data.status}. ` +
          `Allowed transitions from ${action.status}: ${allowed.join(', ') || 'none'}`,
        400
      );
    }
  }

  return prisma.intelligenceAction.update({
    where: { id },
    data: {
      status: data.status ?? undefined,
      priority: data.priority ?? undefined,
      recommendedAction: data.recommendedAction ?? undefined,
    },
    include: { product: true, warehouse: true, location: true },
  });
}

export async function resolveAction(id: string) {
  const action = await prisma.intelligenceAction.findUnique({ where: { id } });
  if (!action) throw new AppError('Action not found', 404);
  if (action.status === 'RESOLVED') {
    throw new AppError('Action is already resolved', 409);
  }

  return prisma.intelligenceAction.update({
    where: { id },
    data: { status: 'RESOLVED', resolvedAt: new Date() },
    include: { product: true, warehouse: true, location: true },
  });
}

// ---------------------------------------------------------------------------
// Batch action generation (called on-demand from the API to sync current state)
// ---------------------------------------------------------------------------

/**
 * Syncs action center with current intelligence state:
 *  1. Smart Reorder → generates REORDER_RECOMMENDED actions.
 *  2. Low/out-of-stock → generates LOW_STOCK / OUT_OF_STOCK actions.
 *
 * Anomaly actions should be created from the anomaly endpoint separately
 * to avoid running heavy computation on every action list refresh.
 */
export async function syncActionsFromCurrentState(): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  // 1. Reorder recommendations
  const { getReorderRecommendations } = await import('./reorderService');
  const recos = await getReorderRecommendations();
  for (const reco of recos) {
    if (reco.recommendationStatus !== 'REORDER_RECOMMENDED') continue;
    const result = await upsertAction({
      type: 'REORDER_RECOMMENDED',
      priority: reco.estimatedDaysRemaining !== null && reco.estimatedDaysRemaining <= 3
        ? 'CRITICAL'
        : 'NEEDS_REVIEW',
      title: `Reorder recommended: ${reco.productName} (${reco.sku})`,
      description: reco.explanation,
      source: 'SmartReorder',
      productId: reco.productId,
      warehouseId: reco.warehouseId,
      recommendedAction: `Place a purchase order for ${reco.suggestedReorderQty ?? 'required'} units of ${reco.productName}.`,
    });
    if (result.created) created++;
    else updated++;
  }

  // 2. Out-of-stock
  const outOfStockStock = await prisma.stock.findMany({
    where: { quantity: 0 },
    include: {
      product: true,
      location: { include: { warehouse: true } },
    },
  });
  for (const row of outOfStockStock) {
    const result = await upsertAction({
      type: 'OUT_OF_STOCK',
      priority: 'CRITICAL',
      title: `Out of stock: ${row.product.name} (${row.product.sku})`,
      description: `${row.product.name} has zero stock at ${row.location.name} in ${row.location.warehouse.name}.`,
      source: 'InventoryOverview',
      productId: row.productId,
      warehouseId: row.location.warehouseId,
      locationId: row.locationId,
      recommendedAction: `Initiate a receipt or internal transfer to replenish ${row.product.name} at ${row.location.name}.`,
    });
    if (result.created) created++;
    else updated++;
  }

  return { created, updated };
}
