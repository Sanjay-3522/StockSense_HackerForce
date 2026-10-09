import { prisma } from "../utils/prismaClient";
import { AppError } from "../utils/AppError";

interface ReasonInput {
  name: string;
  description?: string;
}

export const createReason = (data: ReasonInput) => prisma.adjustmentReason.create({ data });

export const listReasons = () => prisma.adjustmentReason.findMany({ orderBy: { name: "asc" } });

export const getReasonById = async (id: string) => {
  const reason = await prisma.adjustmentReason.findUnique({ where: { id } });
  if (!reason) throw new AppError("Adjustment reason not found.", 404);
  return reason;
};

export const updateReason = async (id: string, data: Partial<ReasonInput>) => {
  await getReasonById(id);
  return prisma.adjustmentReason.update({ where: { id }, data });
};

export const deleteReason = async (id: string) => {
  await getReasonById(id);
  return prisma.adjustmentReason.delete({ where: { id } });
};
