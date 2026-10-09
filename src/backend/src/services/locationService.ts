import { prisma } from "../utils/prismaClient";
import { AppError } from "../utils/AppError";

interface LocationInput {
  warehouseId: string;
  code: string;
  name: string;
  zone?: string;
  isActive?: boolean;
}

const assertValidWarehouse = async (warehouseId: string) => {
  const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!warehouse) throw new AppError("Referenced warehouse does not exist.", 400);
};

export const createLocation = async (data: LocationInput) => {
  await assertValidWarehouse(data.warehouseId);
  return prisma.location.create({ data, include: { warehouse: true } });
};

export const listLocations = (filters: { warehouseId?: string; isActive?: boolean }) =>
  prisma.location.findMany({
    where: {
      ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
    },
    include: { warehouse: true },
    orderBy: { createdAt: "desc" },
  });

export const getLocationById = async (id: string) => {
  const location = await prisma.location.findUnique({
    where: { id },
    include: { warehouse: true, stocks: true },
  });
  if (!location) throw new AppError("Location not found.", 404);
  return location;
};

export const updateLocation = async (id: string, data: Partial<LocationInput>) => {
  await getLocationById(id);
  if (data.warehouseId) await assertValidWarehouse(data.warehouseId);
  return prisma.location.update({ where: { id }, data, include: { warehouse: true } });
};

export const deleteLocation = async (id: string) => {
  await getLocationById(id);
  const stockCount = await prisma.stock.count({ where: { locationId: id } });
  if (stockCount > 0) {
    throw new AppError("Cannot delete location: stock records still reference it.", 409);
  }
  return prisma.location.delete({ where: { id } });
};
