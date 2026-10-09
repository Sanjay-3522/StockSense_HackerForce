import type { Response } from 'express';
import * as transferService from '../services/transferService';
import { AppError } from '../utils/AppError';
import type { AuthRequest } from '../middleware/auth';

export async function list(_req: AuthRequest, res: Response) {
  res.json(await transferService.listTransfers());
}

export async function getById(req: AuthRequest, res: Response) {
  const transfer = await transferService.getTransfer(req.params.id);
  if (!transfer) throw new AppError('Transfer not found', 404, 'NOT_FOUND');
  res.json(transfer);
}

export async function create(req: AuthRequest, res: Response) {
  const transfer = await transferService.createTransfer({
    ...req.body,
    created_by: req.user?.email ?? req.body?.created_by ?? null,
  });
  res.status(201).json(transfer);
}

export async function update(req: AuthRequest, res: Response) {
  const transfer = await transferService.updateTransfer(req.params.id, req.body);
  res.json(transfer);
}

export async function updateStatus(req: AuthRequest, res: Response) {
  res.json(await transferService.updateTransferStatus(req.params.id, req.body?.status));
}

export async function complete(req: AuthRequest, res: Response) {
  res.json(await transferService.completeTransfer(req.params.id, req.user?.email));
}

export async function cancel(req: AuthRequest, res: Response) {
  res.json(await transferService.cancelTransfer(req.params.id));
}
