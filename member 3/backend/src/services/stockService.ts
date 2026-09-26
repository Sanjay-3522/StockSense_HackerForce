import type { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';

type Tx = Prisma.TransactionClient;

/**
 * Applies `delta` to the stock row for (productId, locationId) inside the
 * given transaction, creating the row if needed. Throws if the resulting
 * quantity would go negative. Mirrors the SQL `_upsert_stock` function,
 * including its `SELECT ... FOR UPDATE` row lock so concurrent operations
 * against the same product+location serialize instead of racing.
 *
 * Returns { before, after }.
 */
export async function upsertStock(
  tx: Tx,
  productId: string,
  locationId: string,
  delta: number
): Promise<{ before: number; after: number }> {
  // Row-level lock equivalent to `FOR UPDATE`. Postgres-specific raw query
  // is required here because Prisma has no upsert-with-lock primitive.
  const locked = await tx.$queryRaw<{ quantity: number }[]>`
    SELECT quantity FROM stock
    WHERE product_id = ${productId}::uuid AND location_id = ${locationId}::uuid
    FOR UPDATE
  `;

  const before = locked.length > 0 ? locked[0].quantity : 0;
  const after = before + delta;

  if (after < 0) {
    throw new AppError(
      `Insufficient stock for product ${productId} at location ${locationId} (have ${before}, need ${-delta})`,
      409
    );
  }

  if (locked.length > 0) {
    await tx.stock.update({
      where: { productId_locationId: { productId, locationId } },
      data: { quantity: after },
    });
  } else {
    await tx.stock.create({ data: { productId, locationId, quantity: after } });
  }

  return { before, after };
}

export interface LedgerInput {
  operationType: 'receipt' | 'delivery' | 'transfer' | 'adjustment';
  reference: string;
  productId: string;
  sku: string;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  warehouseId?: string | null;
  locationId?: string | null;
  sourceLocationId?: string | null;
  destinationLocationId?: string | null;
  userEmail?: string | null;
  reason?: string | null;
}

/** Writes one immutable ledger row. Mirrors the SQL `_write_ledger` function. */
export async function writeLedger(tx: Tx, input: LedgerInput): Promise<void> {
  await tx.stockMovement.create({
    data: {
      operationType: input.operationType,
      reference: input.reference,
      productId: input.productId,
      sku: input.sku,
      quantityChange: input.quantityChange,
      quantityBefore: input.quantityBefore,
      quantityAfter: input.quantityAfter,
      warehouseId: input.warehouseId ?? null,
      locationId: input.locationId ?? null,
      sourceLocationId: input.sourceLocationId ?? null,
      destinationLocationId: input.destinationLocationId ?? null,
      userEmail: input.userEmail ?? null,
      reason: input.reason ?? null,
      operationStatus: 'done',
    },
  });
}
