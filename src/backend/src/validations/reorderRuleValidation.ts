import { z } from "zod";

export const createReorderRuleSchema = z.object({
  productId: z.string().uuid("A valid product is required"),
  warehouseId: z.string().uuid("A valid warehouse is required").optional().nullable(),
  locationId: z.string().uuid("A valid location is required").optional().nullable(),
  reorderPoint: z.number().int().nonnegative("reorderPoint must be zero or greater"),
  reorderQuantity: z.number().int().positive("reorderQuantity must be greater than zero"),
  maxStock: z.number().int().nonnegative().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateReorderRuleSchema = z.object({
  productId: z.string().uuid("A valid product is required").optional(),
  warehouseId: z.string().uuid("A valid warehouse is required").optional().nullable(),
  locationId: z.string().uuid("A valid location is required").optional().nullable(),
  reorderPoint: z.number().int().nonnegative("reorderPoint must be zero or greater").optional(),
  reorderQuantity: z
    .number()
    .int()
    .positive("reorderQuantity must be greater than zero")
    .optional(),
  maxStock: z.number().int().nonnegative().optional().nullable(),
  isActive: z.boolean().optional(),
});
