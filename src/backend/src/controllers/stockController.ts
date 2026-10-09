import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as stockService from "../services/stockService";

export const listStock = asyncHandler(async (req: Request, res: Response) => {
  const { productId, locationId, warehouseId } = req.query;
  const stock = await stockService.listStock({
    productId: productId as string | undefined,
    locationId: locationId as string | undefined,
    warehouseId: warehouseId as string | undefined,
  });
  res.status(200).json({ success: true, data: stock });
});

export const getStockByProduct = asyncHandler(async (req: Request, res: Response) => {
  const stock = await stockService.getStockByProduct(req.params.productId);
  res.status(200).json({ success: true, data: stock });
});
