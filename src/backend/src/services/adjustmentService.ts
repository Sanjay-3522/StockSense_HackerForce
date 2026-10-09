import { prisma } from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { writeLedger } from './ledgerService';

export interface CreateAdjustmentInput {
  reference: string;
  product_id: string;
  location_id: string;
  reason_id?: string | null;
  reason_name?: string | null;
  physical_qty: number;
  notes?: string | null;
  created_by?: string | null;
  user?: string;
}

/**
 * Creates an adjustment document and immediately confirms it, atomically:
 * reads the current recorded quantity, computes the difference, sets stock
 * to the physical count, and writes one ledger row — mirroring the SQL
 * `confirm_adjustment` function (including its "no adjustment needed" and
 * double-confirm guards). The previous frontend created the row via a plain
 * insert and then called the `confirm_adjustment` RPC as a second step; here
 * both happen in one request/transaction so the record can never be left in
 * a `draft` state referencing a physical count that was never applied.
 */
export async function createAndConfirmAdjustment(input: CreateAdjustmentInput) {
  return prisma.$transaction(
    async (tx) => {
      const stockRow = await tx.$queryRaw<{ quantity: number }[]>`
        SELECT quantity FROM stock
        WHERE product_id = ${input.product_id}::uuid AND location_id = ${input.location_id}::uuid
        FOR UPDATE
      `;
      const before = stockRow.length > 0 ? stockRow[0].quantity : 0;
      const after = input.physical_qty;
      const difference = after - before;

      if (difference === 0) {
        throw new AppError('Physical count equals recorded quantity — no adjustment needed', 400);
      }

      const product = await tx.product.findUnique({ where: { id: input.product_id } });
      if (!product) throw new AppError('Product not found', 404);

      const adjustment = await tx.adjustment.create({
        data: {
          reference: input.reference,
          productId: input.product_id,
          locationId: input.location_id,
          recordedQty: before,
          physicalQty: after,
          difference,
          reasonId: input.reason_id || null,
          reasonName: input.reason_name || null,
          notes: input.notes || null,
          createdBy: input.created_by || null,
          status: 'draft',
        },
      });

      if (stockRow.length > 0) {
        await tx.stock.update({
          where: { productId_locationId: { productId: input.product_id, locationId: input.location_id } },
          data: { quantity: after },
        });
      } else {
        await tx.stock.create({ data: { productId: input.product_id, locationId: input.location_id, quantity: after } });
      }

      await writeLedger(tx, {
        operationType: 'adjustment',
        reference: adjustment.reference,
        productId: input.product_id,
        sku: product.sku,
        quantityChange: difference,
        quantityBefore: before,
        quantityAfter: after,
        locationId: input.location_id,
        userEmail: input.user ?? input.created_by ?? null,
        reason: input.reason_name ?? null,
      });

      return tx.adjustment.update({
        where: { id: adjustment.id },
        data: {
          status: 'done',
          validatedBy: input.user ?? input.created_by ?? null,
          validatedAt: new Date(),
        },
        include: { product: true, location: true },
      });
    },
    { isolationLevel: 'Serializable' }
  );
}

export function listAdjustments() {
  return prisma.adjustment.findMany({
    include: { product: true, location: true },
    orderBy: { createdAt: 'desc' },
  });
}
