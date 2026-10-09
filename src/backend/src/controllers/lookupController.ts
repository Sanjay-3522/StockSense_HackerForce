import type { Request, Response } from 'express';
import * as lookupService from '../services/lookupService';
import { generateReference } from '../services/referenceService';
import { AppError } from '../utils/AppError';

// Product/warehouse/location/category/adjustment-reason listing endpoints
// that used to live here were dropped — they duplicated Member 1's
// foundation APIs. Only the two operations-specific helpers remain.

export async function reference(req: Request, res: Response) {
  const prefix = String(req.query.prefix ?? '');
  if (!prefix) throw new AppError('prefix query param is required', 400, 'VALIDATION_ERROR');
  res.json({ reference: await generateReference(prefix) });
}

export async function stockQuantity(req: Request, res: Response) {
  const productId = String(req.query.product_id ?? '');
  const locationId = String(req.query.location_id ?? '');
  if (!productId || !locationId) {
    throw new AppError('product_id and location_id query params are required', 400, 'VALIDATION_ERROR');
  }
  const quantity = await lookupService.getStockQuantity(productId, locationId);
  res.json({ quantity });
}
