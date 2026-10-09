import { prisma } from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { upsertStock, writeLedger } from './ledgerService';

const includeRelations = {
  items: { include: { product: true } },
  sourceLocation: { include: { warehouse: true } },
  destinationLocation: { include: { warehouse: true } },
} as const;

export function listTransfers() {
  return prisma.transfer.findMany({ include: includeRelations, orderBy: { createdAt: 'desc' } });
}

export function getTransfer(id: string) {
  return prisma.transfer.findUnique({ where: { id }, include: includeRelations });
}

export interface CreateTransferInput {
  reference: string;
  source_location_id: string;
  destination_location_id: string;
  notes?: string | null;
  created_by?: string | null;
  /**
   * Initial status. Defaults to 'draft'. 'Create Transfer' (as opposed to
   * 'Save as Draft') passes 'waiting' — the next step in the existing
   * draft -> waiting -> ready -> done workflow, which for transfers has no
   * associated real sub-operation (unlike a delivery's Pick/Pack). 'done'
   * can never be set here: reaching Done requires the atomic /complete
   * operation (source/destination stock + ledger), so it's rejected even
   * if a caller tries to pass it.
   */
  status?: 'draft' | 'waiting' | 'ready';
  items: { product_id: string; quantity: number }[];
}

const CREATABLE_STATUSES = ['draft', 'waiting', 'ready'] as const;

export async function createTransfer(input: CreateTransferInput) {
  if (input.source_location_id === input.destination_location_id) {
    throw new AppError('Source and destination locations must differ', 400);
  }
  for (const item of input.items) {
    if (item.quantity <= 0) throw new AppError('Quantity must be positive', 400);
  }
  const status = input.status ?? 'draft';
  if (!CREATABLE_STATUSES.includes(status)) {
    throw new AppError(`Cannot create a transfer directly in status ${status}`, 400);
  }

  return prisma.transfer.create({
    data: {
      reference: input.reference,
      sourceLocationId: input.source_location_id,
      destinationLocationId: input.destination_location_id,
      notes: input.notes || null,
      createdBy: input.created_by || null,
      status,
      items: {
        create: input.items.map((it) => ({
          productId: it.product_id,
          quantity: it.quantity,
        })),
      },
    },
    include: includeRelations,
  });
}

export async function updateTransfer(id: string, data: Partial<CreateTransferInput>) {
  return prisma.transfer.update({
    where: { id },
    data: {
      sourceLocationId: data.source_location_id ?? undefined,
      destinationLocationId: data.destination_location_id ?? undefined,
      notes: data.notes ?? undefined,
    },
    include: includeRelations,
  });
}

/**
 * Completes a transfer: decrements source stock, increments destination
 * stock, and writes two ledger rows per item (source -qty, destination
 * +qty), all atomically. Mirrors SQL `complete_transfer`, including the
 * "cannot transfer more than available source stock" check (enforced by
 * `upsertStock`'s negative-quantity guard) and the double-complete guard.
 */
export async function completeTransfer(transferId: string, user?: string) {
  return prisma.$transaction(
    async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { id: transferId },
        include: { items: { include: { product: true } } },
      });

      if (!transfer) throw new AppError('Transfer not found', 404);
      if (transfer.status === 'done') {
        throw new AppError(`Transfer ${transfer.reference} is already completed`, 409);
      }
      if (transfer.status === 'canceled') {
        throw new AppError('Cannot complete a canceled transfer', 409);
      }
      if (transfer.sourceLocationId === transfer.destinationLocationId) {
        throw new AppError('Source and destination locations must differ', 400);
      }

      for (const item of transfer.items) {
        const src = await upsertStock(tx, item.productId, transfer.sourceLocationId, -item.quantity);
        await writeLedger(tx, {
          operationType: 'transfer',
          reference: transfer.reference,
          productId: item.productId,
          sku: item.product.sku,
          quantityChange: -item.quantity,
          quantityBefore: src.before,
          quantityAfter: src.after,
          sourceLocationId: transfer.sourceLocationId,
          destinationLocationId: transfer.destinationLocationId,
          userEmail: user ?? null,
          reason: transfer.notes,
        });

        const dest = await upsertStock(tx, item.productId, transfer.destinationLocationId, item.quantity);
        await writeLedger(tx, {
          operationType: 'transfer',
          reference: transfer.reference,
          productId: item.productId,
          sku: item.product.sku,
          quantityChange: item.quantity,
          quantityBefore: dest.before,
          quantityAfter: dest.after,
          sourceLocationId: transfer.sourceLocationId,
          destinationLocationId: transfer.destinationLocationId,
          userEmail: user ?? null,
          reason: transfer.notes,
        });
      }

      return tx.transfer.update({
        where: { id: transferId },
        data: { status: 'done', validatedBy: user ?? null, validatedAt: new Date() },
        include: includeRelations,
      });
    },
    { isolationLevel: 'Serializable' }
  );
}

const KANBAN_STATUSES = ['draft', 'waiting', 'ready'] as const;

/** Plain status update for Kanban drag-and-drop. Does not touch stock/ledger. */
export async function updateTransferStatus(id: string, status: string) {
  if (!KANBAN_STATUSES.includes(status as (typeof KANBAN_STATUSES)[number])) {
    throw new AppError(`Cannot set transfer status to ${status} this way`, 400);
  }
  const transfer = await prisma.transfer.findUnique({ where: { id } });
  if (!transfer) throw new AppError('Transfer not found', 404);
  if (!KANBAN_STATUSES.includes(transfer.status as (typeof KANBAN_STATUSES)[number])) {
    throw new AppError(`Transfer cannot be moved from status ${transfer.status}`, 409);
  }
  return prisma.transfer.update({
    where: { id },
    data: { status: status as (typeof KANBAN_STATUSES)[number] },
    include: includeRelations,
  });
}

export async function cancelTransfer(id: string) {
  const transfer = await prisma.transfer.findUnique({ where: { id } });
  if (!transfer) throw new AppError('Transfer not found', 404);
  if (!['draft', 'waiting', 'ready'].includes(transfer.status)) {
    throw new AppError(`Transfer cannot be canceled from status ${transfer.status}`, 409);
  }
  return prisma.transfer.update({ where: { id }, data: { status: 'canceled' } });
}
