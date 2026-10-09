import { z } from "zod";

export const createWarehouseSchema = z.object({
  code: z.string().min(1, "Warehouse code is required"),
  name: z.string().min(1, "Warehouse name is required"),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateWarehouseSchema = createWarehouseSchema.partial();
