import { prisma } from "../utils/prismaClient";
import { AppError } from "../utils/AppError";

interface ReorderRuleInput {
  productId: string;
  warehouseId?: string | null;
  locationId?: string | null;
  reorderPoint: number;
  reorderQuantity: number;
  maxStock?: number | null;
  isActive?: boolean;
}

const assertValidProduct = async (productId: string) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError("Referenced product does not exist.", 400);
};

const assertValidWarehouse = async (warehouseId: string) => {
  const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!warehouse) throw new AppError("Referenced warehouse does not exist.", 400);
};

const assertLocationBelongsToWarehouse = async (
  locationId: string,
  warehouseId?: string | null
) => {
  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) throw new AppError("Referenced location does not exist.", 400);
  if (warehouseId && location.warehouseId !== warehouseId) {
    throw new AppError("Location does not belong to the specified warehouse.", 400);
  }
};

const validateScope = async (data: Pick<ReorderRuleInput, "warehouseId" | "locationId">) => {
  if (data.warehouseId) await assertValidWarehouse(data.warehouseId);
  if (data.locationId) await assertLocationBelongsToWarehouse(data.locationId, data.warehouseId);
};

export const createReorderRule = async (data: ReorderRuleInput) => {
  await assertValidProduct(data.productId);
  await validateScope(data);

  return prisma.reorderRule.create({
    data: {
      productId: data.productId,
      warehouseId: data.warehouseId ?? null,
      locationId: data.locationId ?? null,
      reorderPoint: data.reorderPoint,
      reorderQuantity: data.reorderQuantity,
      maxStock: data.maxStock ?? null,
      isActive: data.isActive ?? true,
    },
    include: { product: true, warehouse: true, location: true },
  });
};

export const listReorderRules = (filters: {
  productId?: string;
  warehouseId?: string;
  locationId?: string;
  isActive?: boolean;
}) =>
  prisma.reorderRule.findMany({
    where: {
      ...(filters.productId ? { productId: filters.productId } : {}),
      ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      ...(filters.locationId ? { locationId: filters.locationId } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
    },
    include: { product: true, warehouse: true, location: true },
    orderBy: { createdAt: "desc" },
  });

export const getReorderRuleById = async (id: string) => {
  const rule = await prisma.reorderRule.findUnique({
    where: { id },
    include: { product: true, warehouse: true, location: true },
  });
  if (!rule) throw new AppError("Reorder rule not found.", 404);
  return rule;
};

export const updateReorderRule = async (id: string, data: Partial<ReorderRuleInput>) => {
  const existing = await getReorderRuleById(id);

  if (data.productId) await assertValidProduct(data.productId);
  await validateScope({
    warehouseId: data.warehouseId !== undefined ? data.warehouseId : existing.warehouseId,
    locationId: data.locationId !== undefined ? data.locationId : existing.locationId,
  });

  return prisma.reorderRule.update({
    where: { id },
    data,
    include: { product: true, warehouse: true, location: true },
  });
};

export const deleteReorderRule = async (id: string) => {
  await getReorderRuleById(id);
  return prisma.reorderRule.delete({ where: { id } });
};
