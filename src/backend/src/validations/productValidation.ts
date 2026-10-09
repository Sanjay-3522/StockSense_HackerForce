import { z } from "zod";

export const createProductSchema = z
  .object({
    name: z.string().min(1, "Product name is required"),
    sku: z.string().min(1, "SKU is required"),
    description: z.string().optional(),
    categoryId: z.string().uuid("A valid category is required"),
    unit: z.string().min(1, "Unit is required"),
    barcode: z.string().optional(),
    initialStock: z.number().int().nonnegative().optional(),
    // Required alongside initialStock so a Stock record can actually be
    // created for it (see productService.createProduct).
    initialStockLocationId: z.string().uuid("A valid location is required").optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.initialStock && data.initialStock > 0 && !data.initialStockLocationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "initialStockLocationId is required when initialStock is greater than zero.",
        path: ["initialStockLocationId"],
      });
    }
  });

// Updating a product does not mutate stock quantities — that's operational-
// layer logic (receipts/deliveries/adjustments) outside this scope — so
// initialStock/initialStockLocationId are intentionally not editable here.
export const updateProductSchema = z.object({
  name: z.string().min(1, "Product name is required").optional(),
  sku: z.string().min(1, "SKU is required").optional(),
  description: z.string().optional(),
  categoryId: z.string().uuid("A valid category is required").optional(),
  unit: z.string().min(1, "Unit is required").optional(),
  barcode: z.string().optional(),
  isActive: z.boolean().optional(),
});
