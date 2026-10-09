import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as reasonService from "../services/adjustmentReasonService";

export const createReason = asyncHandler(async (req: Request, res: Response) => {
  const reason = await reasonService.createReason(req.body);
  res.status(201).json({ success: true, data: reason });
});

export const listReasons = asyncHandler(async (req: Request, res: Response) => {
  const reasons = await reasonService.listReasons();
  res.status(200).json({ success: true, data: reasons });
});

export const getReason = asyncHandler(async (req: Request, res: Response) => {
  const reason = await reasonService.getReasonById(req.params.id);
  res.status(200).json({ success: true, data: reason });
});

export const updateReason = asyncHandler(async (req: Request, res: Response) => {
  const reason = await reasonService.updateReason(req.params.id, req.body);
  res.status(200).json({ success: true, data: reason });
});

export const deleteReason = asyncHandler(async (req: Request, res: Response) => {
  await reasonService.deleteReason(req.params.id);
  res.status(200).json({ success: true, message: "Adjustment reason deleted successfully." });
});
