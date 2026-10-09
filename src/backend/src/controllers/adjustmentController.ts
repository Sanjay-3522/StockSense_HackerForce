import type { Response } from 'express';
import * as adjustmentService from '../services/adjustmentService';
import type { AuthRequest } from '../middleware/auth';

export async function create(req: AuthRequest, res: Response) {
  const adjustment = await adjustmentService.createAndConfirmAdjustment({
    ...req.body,
    created_by: req.user?.email ?? req.body?.created_by ?? null,
    user: req.user?.email,
  });
  res.status(201).json(adjustment);
}

export async function list(_req: AuthRequest, res: Response) {
  res.json(await adjustmentService.listAdjustments());
}
