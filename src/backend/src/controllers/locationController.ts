import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as locationService from "../services/locationService";

export const createLocation = asyncHandler(async (req: Request, res: Response) => {
  const location = await locationService.createLocation(req.body);
  res.status(201).json({ success: true, data: location });
});

export const listLocations = asyncHandler(async (req: Request, res: Response) => {
  const { warehouseId, isActive } = req.query;
  const locations = await locationService.listLocations({
    warehouseId: warehouseId as string | undefined,
    isActive: isActive !== undefined ? isActive === "true" : undefined,
  });
  res.status(200).json({ success: true, data: locations });
});

export const getLocation = asyncHandler(async (req: Request, res: Response) => {
  const location = await locationService.getLocationById(req.params.id);
  res.status(200).json({ success: true, data: location });
});

export const updateLocation = asyncHandler(async (req: Request, res: Response) => {
  const location = await locationService.updateLocation(req.params.id, req.body);
  res.status(200).json({ success: true, data: location });
});

export const deleteLocation = asyncHandler(async (req: Request, res: Response) => {
  await locationService.deleteLocation(req.params.id);
  res.status(200).json({ success: true, message: "Location deleted successfully." });
});
