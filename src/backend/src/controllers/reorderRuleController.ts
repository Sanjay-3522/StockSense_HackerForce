import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as reorderRuleService from "../services/reorderRuleService";

export const createReorderRule = asyncHandler(async (req: Request, res: Response) => {
  const rule = await reorderRuleService.createReorderRule(req.body);
  res.status(201).json({ success: true, data: rule });
});

export const listReorderRules = asyncHandler(async (req: Request, res: Response) => {
  const { productId, warehouseId, locationId, isActive } = req.query;
  const rules = await reorderRuleService.listReorderRules({
    productId: productId as string | undefined,
    warehouseId: warehouseId as string | undefined,
    locationId: locationId as string | undefined,
    isActive: isActive !== undefined ? isActive === "true" : undefined,
  });
  res.status(200).json({ success: true, data: rules });
});

export const getReorderRule = asyncHandler(async (req: Request, res: Response) => {
  const rule = await reorderRuleService.getReorderRuleById(req.params.id);
  res.status(200).json({ success: true, data: rule });
});

export const updateReorderRule = asyncHandler(async (req: Request, res: Response) => {
  const rule = await reorderRuleService.updateReorderRule(req.params.id, req.body);
  res.status(200).json({ success: true, data: rule });
});

export const deleteReorderRule = asyncHandler(async (req: Request, res: Response) => {
  await reorderRuleService.deleteReorderRule(req.params.id);
  res.status(200).json({ success: true, message: "Reorder rule deleted successfully." });
});
