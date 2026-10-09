import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as warehouseService from "../services/warehouseService";

export const createWarehouse = asyncHandler(async (req: Request, res: Response) => {
  const warehouse = await warehouseService.createWarehouse(req.body);
  res.status(201).json({ success: true, data: warehouse });
});

export const listWarehouses = asyncHandler(async (req: Request, res: Response) => {
  const { isActive } = req.query;
  const warehouses = await warehouseService.listWarehouses({
    isActive: isActive !== undefined ? isActive === "true" : undefined,
  });
  res.status(200).json({ success: true, data: warehouses });
});

export const getWarehouse = asyncHandler(async (req: Request, res: Response) => {
  const warehouse = await warehouseService.getWarehouseById(req.params.id);
  res.status(200).json({ success: true, data: warehouse });
});

export const updateWarehouse = asyncHandler(async (req: Request, res: Response) => {
  const warehouse = await warehouseService.updateWarehouse(req.params.id, req.body);
  res.status(200).json({ success: true, data: warehouse });
});

export const deleteWarehouse = asyncHandler(async (req: Request, res: Response) => {
  await warehouseService.deleteWarehouse(req.params.id);
  res.status(200).json({ success: true, message: "Warehouse deleted successfully." });
});
