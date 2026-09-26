import type { Request, Response } from 'express';
import * as transferService from '../services/transferService';
import { AppError } from '../utils/AppError';

export async function list(_req: Request, res: Response) {
  res.json(await transferService.listTransfers());
}

export async function getById(req: Request, res: Response) {
  const transfer = await transferService.getTransfer(req.params.id);
  if (!transfer) throw new AppError('Transfer not found', 404);
  res.json(transfer);
}

export async function create(req: Request, res: Response) {
  const transfer = await transferService.createTransfer(req.body);
  res.status(201).json(transfer);
}

export async function update(req: Request, res: Response) {
  const transfer = await transferService.updateTransfer(req.params.id, req.body);
  res.json(transfer);
}

export async function updateStatus(req: Request, res: Response) {
  res.json(await transferService.updateTransferStatus(req.params.id, req.body?.status));
}

export async function complete(req: Request, res: Response) {
  res.json(await transferService.completeTransfer(req.params.id, req.body?.user));
}

export async function cancel(req: Request, res: Response) {
  res.json(await transferService.cancelTransfer(req.params.id));
}
