import type { Request, Response } from 'express';
import * as receiptService from '../services/receiptService';
import { AppError } from '../utils/AppError';

export async function list(_req: Request, res: Response) {
  res.json(await receiptService.listReceipts());
}

export async function getById(req: Request, res: Response) {
  const receipt = await receiptService.getReceipt(req.params.id);
  if (!receipt) throw new AppError('Receipt not found', 404);
  res.json(receipt);
}

export async function create(req: Request, res: Response) {
  const receipt = await receiptService.createReceipt(req.body);
  res.status(201).json(receipt);
}

export async function update(req: Request, res: Response) {
  const receipt = await receiptService.updateReceipt(req.params.id, req.body);
  res.json(receipt);
}

export async function updateStatus(req: Request, res: Response) {
  const receipt = await receiptService.updateReceiptStatus(req.params.id, req.body?.status);
  res.json(receipt);
}

export async function validate(req: Request, res: Response) {
  const receipt = await receiptService.validateReceipt(req.params.id, req.body?.user);
  res.json(receipt);
}

export async function cancel(req: Request, res: Response) {
  const receipt = await receiptService.cancelReceipt(req.params.id);
  res.json(receipt);
}
