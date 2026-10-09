import { prisma } from "../utils/prismaClient";
import { AppError } from "../utils/AppError";

interface WarehouseInput {
  code: string;
  name: string;
  address?: string;
  isActive?: boolean;
}

export const createWarehouse = (data: WarehouseInput) => prisma.warehouse.create({ data });

export const listWarehouses = (filters: { isActive?: boolean }) =>
  prisma.warehouse.findMany({
    where: filters.isActive !== undefined ? { isActive: filters.isActive } : {},
    orderBy: { createdAt: "desc" },
  });

export const getWarehouseById = async (id: string) => {
  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
    include: { locations: true },
  });
  if (!warehouse) throw new AppError("Warehouse not found.", 404);
  return warehouse;
};

export const updateWarehouse = async (id: string, data: Partial<WarehouseInput>) => {
  await getWarehouseById(id);
  return prisma.warehouse.update({ where: { id }, data });
};

export const deleteWarehouse = async (id: string) => {
  await getWarehouseById(id);
  const locationCount = await prisma.location.count({ where: { warehouseId: id } });
  if (locationCount > 0) {
    throw new AppError("Cannot delete warehouse: locations still exist under it.", 409);
  }
  return prisma.warehouse.delete({ where: { id } });
};
