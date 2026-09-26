import type { Request, Response } from 'express';
import * as adjustmentService from '../services/adjustmentService';

export async function create(req: Request, res: Response) {
  const adjustment = await adjustmentService.createAndConfirmAdjustment(req.body);
  res.status(201).json(adjustment);
}

export async function list(_req: Request, res: Response) {
  res.json(await adjustmentService.listAdjustments());
}
