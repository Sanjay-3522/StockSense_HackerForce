import { z } from "zod";

export const createAdjustmentReasonSchema = z.object({
  name: z.string().min(1, "Reason name is required"),
  description: z.string().optional(),
});

export const updateAdjustmentReasonSchema = createAdjustmentReasonSchema.partial();
