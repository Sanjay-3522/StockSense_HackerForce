import { prisma } from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { upsertStock, writeLedger } from './ledgerService';

const includeRelations = {
  items: { include: { product: true } },
  warehouse: true,
  location: true,
} as const;

export function listDeliveries() {
  return prisma.delivery.findMany({ include: includeRelations, orderBy: { createdAt: 'desc' } });
}

export function getDelivery(id: string) {
  return prisma.delivery.findUnique({ where: { id }, include: includeRelations });
}

export interface CreateDeliveryInput {
  reference: string;
  customer_name?: string | null;
  warehouse_id: string;
  location_id: string;
  notes?: string | null;
  created_by?: string | null;
  items: { product_id: string; requested_qty: number }[];
}

/**
 * Always creates in 'draft'. Unlike Receipt/Transfer, a delivery has no
 * non-draft status reachable without a real sub-operation: 'waiting' means
 * "picked" (picked_qty set via /pick) and 'ready' means "packed" (via
 * /pack). Setting status straight to 'waiting' or 'ready' at creation time
 * would misrepresent those quantities exactly like the earlier Kanban bug
 * did, so 'Create Delivery' intentionally behaves the same as 'Save as
 * Draft' here — Pick must remain a real, explicit operation.
 */
export async function createDelivery(input: CreateDeliveryInput) {
  return prisma.delivery.create({
    data: {
      reference: input.reference,
      customerName: input.customer_name || null,
      warehouseId: input.warehouse_id,
      locationId: input.location_id,
      notes: input.notes || null,
      createdBy: input.created_by || null,
      status: 'draft',
      items: {
        create: input.items.map((it) => ({
          productId: it.product_id,
          requestedQty: it.requested_qty,
        })),
      },
    },
    include: includeRelations,
  });
}

export async function updateDelivery(id: string, data: Partial<CreateDeliveryInput>) {
  return prisma.delivery.update({
    where: { id },
    data: {
      customerName: data.customer_name ?? undefined,
      warehouseId: data.warehouse_id ?? undefined,
      locationId: data.location_id ?? undefined,
      notes: data.notes ?? undefined,
    },
    include: includeRelations,
  });
}

/** Mirrors SQL `pick_delivery`: draft/waiting -> waiting, sets picked_qty = requested_qty. */
export async function pickDelivery(deliveryId: string, _user?: string) {
  return prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new AppError('Delivery not found', 404);
    if (!['draft', 'waiting'].includes(delivery.status)) {
      throw new AppError(`Delivery must be in draft to pick (current: ${delivery.status})`, 409);
    }

    // Prisma's updateMany can't do `SET picked_qty = requested_qty`, so do it per-row.
    const items = await tx.deliveryItem.findMany({ where: { deliveryId, pickedQty: 0 } });
    for (const item of items) {
      await tx.deliveryItem.update({ where: { id: item.id }, data: { pickedQty: item.requestedQty } });
    }

    return tx.delivery.update({
      where: { id: deliveryId },
      data: { status: 'waiting' },
      include: includeRelations,
    });
  });
}

/** Mirrors SQL `pack_delivery`: waiting/ready -> ready, requires all items fully picked. */
export async function packDelivery(deliveryId: string, _user?: string) {
  return prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.findUnique({ where: { id: deliveryId }, include: { items: true } });
    if (!delivery) throw new AppError('Delivery not found', 404);
    if (!['waiting', 'ready'].includes(delivery.status)) {
      throw new AppError(`Delivery must be picked before packing (current: ${delivery.status})`, 409);
    }

    const unpicked = delivery.items.filter((i) => i.pickedQty < i.requestedQty);
    if (unpicked.length > 0) {
      throw new AppError(`Cannot pack: ${unpicked.length} item(s) not fully picked`, 409);
    }

    for (const item of delivery.items.filter((i) => i.packedQty === 0)) {
      await tx.deliveryItem.update({ where: { id: item.id }, data: { packedQty: item.pickedQty } });
    }

    return tx.delivery.update({
      where: { id: deliveryId },
      data: { status: 'ready' },
      include: includeRelations,
    });
  });
}

/** Mirrors SQL `validate_delivery`: ready -> done, decrements stock, writes ledger. Idempotent. */
export async function validateDelivery(deliveryId: string, user?: string) {
  return prisma.$transaction(
    async (tx) => {
      const delivery = await tx.delivery.findUnique({
        where: { id: deliveryId },
        include: { items: { include: { product: true } } },
      });

      if (!delivery) throw new AppError('Delivery not found', 404);
      if (delivery.status === 'done') {
        throw new AppError(`Delivery ${delivery.reference} is already validated`, 409);
      }
      if (delivery.status === 'canceled') {
        throw new AppError('Cannot validate a canceled delivery', 409);
      }
      if (delivery.status !== 'ready') {
        throw new AppError(`Delivery must be packed (ready) before validating (current: ${delivery.status})`, 409);
      }
      if (!delivery.locationId) {
        throw new AppError('Delivery has no source location', 400);
      }

      for (const item of delivery.items) {
        if (item.packedQty === 0) {
          throw new AppError(`Cannot validate: item ${item.product.sku} has zero packed quantity`, 409);
        }
        const { before, after } = await upsertStock(tx, item.productId, delivery.locationId, -item.packedQty);
        await writeLedger(tx, {
          operationType: 'delivery',
          reference: delivery.reference,
          productId: item.productId,
          sku: item.product.sku,
          quantityChange: -item.packedQty,
          quantityBefore: before,
          quantityAfter: after,
          warehouseId: delivery.warehouseId,
          locationId: delivery.locationId,
          userEmail: user ?? null,
          reason: delivery.notes,
        });
      }

      return tx.delivery.update({
        where: { id: deliveryId },
        data: { status: 'done', validatedBy: user ?? null, validatedAt: new Date() },
        include: includeRelations,
      });
    },
    { isolationLevel: 'Serializable' }
  );
}

/**
 * Kanban drag-and-drop handler for deliveries.
 *
 * IMPORTANT: this must NEVER just write the `status` column. Draft->Waiting
 * and Waiting->Ready are not cosmetic states — they represent the real
 * Pick and Pack operations (picked_qty / packed_qty), which later gate
 * whether a delivery is even allowed to validate. A plain status write let
 * a dragged card claim "Picked" or "Packed" without those quantities ever
 * being set, which is exactly the fake frontend-only transition the
 * workflow rules forbid. So every drag here is routed through the same
 * pick/pack/cancel service functions the explicit buttons use — a card can
 * only move forward if the real operation it represents actually succeeds
 * (e.g. dragging to "Ready" without every item picked is rejected, same as
 * clicking Pack too early would be). Dragging to "Done" is intentionally
 * not supported here: Done requires decrementing stock, which only the
 * dedicated /validate endpoint performs.
 */
export async function updateDeliveryStatus(id: string, status: string, user?: string) {
  const delivery = await prisma.delivery.findUnique({ where: { id } });
  if (!delivery) throw new AppError('Delivery not found', 404);

  if (status === 'canceled') {
    return cancelDelivery(id);
  }
  if (status === 'waiting' && delivery.status === 'draft') {
    return pickDelivery(id, user);
  }
  if (status === 'ready' && (delivery.status === 'waiting' || delivery.status === 'ready')) {
    return packDelivery(id, user);
  }

  throw new AppError(
    `Cannot move delivery from ${delivery.status} to ${status} via drag-and-drop; use the Pick/Pack/Validate actions`,
    400
  );
}

export async function cancelDelivery(id: string) {
  const delivery = await prisma.delivery.findUnique({ where: { id } });
  if (!delivery) throw new AppError('Delivery not found', 404);
  if (!['draft', 'waiting', 'ready'].includes(delivery.status)) {
    throw new AppError(`Delivery cannot be canceled from status ${delivery.status}`, 409);
  }
  return prisma.delivery.update({ where: { id }, data: { status: 'canceled' } });
}
