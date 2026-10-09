import { z } from "zod";

export const createLocationSchema = z.object({
  warehouseId: z.string().uuid("A valid warehouse is required"),
  code: z.string().min(1, "Location code is required"),
  name: z.string().min(1, "Location name is required"),
  zone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateLocationSchema = createLocationSchema.partial();
