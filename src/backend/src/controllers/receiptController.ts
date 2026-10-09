import type { Response } from 'express';
import * as receiptService from '../services/receiptService';
import { AppError } from '../utils/AppError';
import type { AuthRequest } from '../middleware/auth';

export async function list(_req: AuthRequest, res: Response) {
  res.json(await receiptService.listReceipts());
}

export async function getById(req: AuthRequest, res: Response) {
  const receipt = await receiptService.getReceipt(req.params.id);
  if (!receipt) throw new AppError('Receipt not found', 404, 'NOT_FOUND');
  res.json(receipt);
}

export async function create(req: AuthRequest, res: Response) {
  const receipt = await receiptService.createReceipt({
    ...req.body,
    created_by: req.user?.email ?? req.body?.created_by ?? null,
  });
  res.status(201).json(receipt);
}

export async function update(req: AuthRequest, res: Response) {
  const receipt = await receiptService.updateReceipt(req.params.id, req.body);
  res.json(receipt);
}

export async function updateStatus(req: AuthRequest, res: Response) {
  const receipt = await receiptService.updateReceiptStatus(req.params.id, req.body?.status);
  res.json(receipt);
}

// Identity comes from the authenticated JWT (req.user), never from
// req.body.user — a client-supplied identity field cannot be trusted for
// who actually validated the operation. See Step 6 of the merge rules.
export async function validate(req: AuthRequest, res: Response) {
  const receipt = await receiptService.validateReceipt(req.params.id, req.user?.email);
  res.json(receipt);
}

export async function cancel(req: AuthRequest, res: Response) {
  const receipt = await receiptService.cancelReceipt(req.params.id);
  res.json(receipt);
}
