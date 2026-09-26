import type { Request, Response } from 'express';
import * as lookupService from '../services/lookupService';
import { generateReference } from '../services/referenceService';
import { AppError } from '../utils/AppError';

export async function products(_req: Request, res: Response) {
  res.json(await lookupService.listProducts());
}

export async function warehouses(_req: Request, res: Response) {
  res.json(await lookupService.listWarehouses());
}

export async function locations(_req: Request, res: Response) {
  res.json(await lookupService.listLocations());
}

export async function categories(_req: Request, res: Response) {
  res.json(await lookupService.listCategories());
}

export async function adjustmentReasons(_req: Request, res: Response) {
  res.json(await lookupService.listAdjustmentReasons());
}

export async function reference(req: Request, res: Response) {
  const prefix = String(req.query.prefix ?? '');
  if (!prefix) throw new AppError('prefix query param is required', 400);
  res.json({ reference: await generateReference(prefix) });
}

export async function stockQuantity(req: Request, res: Response) {
  const productId = String(req.query.product_id ?? '');
  const locationId = String(req.query.location_id ?? '');
  if (!productId || !locationId) {
    throw new AppError('product_id and location_id query params are required', 400);
  }
  const quantity = await lookupService.getStockQuantity(productId, locationId);
  res.json({ quantity });
}
