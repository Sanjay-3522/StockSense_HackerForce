import { prisma } from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { upsertStock, writeLedger } from './ledgerService';

const includeRelations = {
  items: { include: { product: true } },
  warehouse: true,
  location: true,
} as const;

export function listReceipts() {
  return prisma.receipt.findMany({
    include: includeRelations,
    orderBy: { createdAt: 'desc' },
  });
}

export function getReceipt(id: string) {
  return prisma.receipt.findUnique({ where: { id }, include: includeRelations });
}

export interface CreateReceiptInput {
  reference: string;
  supplier_name?: string | null;
  warehouse_id: string;
  location_id: string;
  notes?: string | null;
  created_by?: string | null;
  /**
   * Initial status. Defaults to 'draft'. 'Create Receipt' (as opposed to
   * 'Save as Draft') passes 'waiting' — the next step in the existing
   * draft -> waiting -> ready -> done workflow that the Kanban already
   * treats as a plain, no-side-effect state (unlike delivery's waiting,
   * which represents a real Pick). 'done' can never be set here: reaching
   * Done requires the atomic /validate operation (stock + ledger), so it's
   * rejected even if a caller tries to pass it.
   */
  status?: 'draft' | 'waiting' | 'ready';
  items: { product_id: string; quantity: number }[];
}

const CREATABLE_STATUSES = ['draft', 'waiting', 'ready'] as const;

export async function createReceipt(input: CreateReceiptInput) {
  const status = input.status ?? 'draft';
  if (!CREATABLE_STATUSES.includes(status)) {
    throw new AppError(`Cannot create a receipt directly in status ${status}`, 400);
  }
  const receipt = await prisma.receipt.create({
    data: {
      reference: input.reference,
      supplierName: input.supplier_name || null,
      warehouseId: input.warehouse_id,
      locationId: input.location_id,
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
  return receipt;
}

export async function updateReceipt(id: string, data: Partial<CreateReceiptInput>) {
  return prisma.receipt.update({
    where: { id },
    data: {
      supplierName: data.supplier_name ?? undefined,
      warehouseId: data.warehouse_id ?? undefined,
      locationId: data.location_id ?? undefined,
      notes: data.notes ?? undefined,
    },
    include: includeRelations,
  });
}

/**
 * Validates a receipt: increases stock for every line item at the receipt's
 * location, writes one ledger row per item, and marks the receipt Done —
 * all inside a single serializable transaction. Mirrors the SQL
 * `validate_receipt` function, including its idempotency guard (a receipt
 * already `done` or `canceled` cannot be validated again, so double-clicks,
 * refreshes, or repeated requests never double-apply stock).
 */
export async function validateReceipt(receiptId: string, user?: string) {
  return prisma.$transaction(
    async (tx) => {
      const receipt = await tx.receipt.findUnique({
        where: { id: receiptId },
        include: { items: { include: { product: true } } },
      });

      if (!receipt) throw new AppError('Receipt not found', 404);
      if (receipt.status === 'done') {
        throw new AppError(`Receipt ${receipt.reference} is already validated`, 409);
      }
      if (receipt.status === 'canceled') {
        throw new AppError('Cannot validate a canceled receipt', 409);
      }
      if (!receipt.locationId) {
        throw new AppError('Receipt has no destination location', 400);
      }

      for (const item of receipt.items) {
        const { before, after } = await upsertStock(tx, item.productId, receipt.locationId, item.quantity);
        await writeLedger(tx, {
          operationType: 'receipt',
          reference: receipt.reference,
          productId: item.productId,
          sku: item.product.sku,
          quantityChange: item.quantity,
          quantityBefore: before,
          quantityAfter: after,
          warehouseId: receipt.warehouseId,
          locationId: receipt.locationId,
          userEmail: user ?? null,
          reason: receipt.notes,
        });
      }

      return tx.receipt.update({
        where: { id: receiptId },
        data: { status: 'done', validatedBy: user ?? null, validatedAt: new Date() },
        include: includeRelations,
      });
    },
    { isolationLevel: 'Serializable' }
  );
}

const KANBAN_STATUSES = ['draft', 'waiting', 'ready'] as const;

/**
 * Plain status update used by the Kanban board drag-and-drop (moving a card
 * between draft/waiting/ready columns). Does not touch stock or the ledger —
 * only `validate`/`cancel` do that. Mirrors the previous
 * `.update({status}).in('status', [draft, waiting, ready])` guard.
 */
export async function updateReceiptStatus(id: string, status: string) {
  if (!KANBAN_STATUSES.includes(status as (typeof KANBAN_STATUSES)[number])) {
    throw new AppError(`Cannot set receipt status to ${status} this way`, 400);
  }
  const receipt = await prisma.receipt.findUnique({ where: { id } });
  if (!receipt) throw new AppError('Receipt not found', 404);
  if (!KANBAN_STATUSES.includes(receipt.status as (typeof KANBAN_STATUSES)[number])) {
    throw new AppError(`Receipt cannot be moved from status ${receipt.status}`, 409);
  }
  return prisma.receipt.update({
    where: { id },
    data: { status: status as (typeof KANBAN_STATUSES)[number] },
    include: includeRelations,
  });
}

export async function cancelReceipt(id: string) {
  const receipt = await prisma.receipt.findUnique({ where: { id } });
  if (!receipt) throw new AppError('Receipt not found', 404);
  if (!['draft', 'waiting', 'ready'].includes(receipt.status)) {
    throw new AppError(`Receipt cannot be canceled from status ${receipt.status}`, 409);
  }
  return prisma.receipt.update({ where: { id }, data: { status: 'canceled' } });
}
