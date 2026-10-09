import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as dashboardService from "../services/dashboardService";

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const { warehouseId, locationId, categoryId } = req.query;
  const summary = await dashboardService.getDashboardSummary({
    warehouseId: warehouseId as string | undefined,
    locationId: locationId as string | undefined,
    categoryId: categoryId as string | undefined,
  });
  res.status(200).json({ success: true, data: summary });
});
