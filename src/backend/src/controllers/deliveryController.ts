import type { Response } from 'express';
import * as deliveryService from '../services/deliveryService';
import { AppError } from '../utils/AppError';
import type { AuthRequest } from '../middleware/auth';

export async function list(_req: AuthRequest, res: Response) {
  res.json(await deliveryService.listDeliveries());
}

export async function getById(req: AuthRequest, res: Response) {
  const delivery = await deliveryService.getDelivery(req.params.id);
  if (!delivery) throw new AppError('Delivery not found', 404, 'NOT_FOUND');
  res.json(delivery);
}

export async function create(req: AuthRequest, res: Response) {
  const delivery = await deliveryService.createDelivery({
    ...req.body,
    created_by: req.user?.email ?? req.body?.created_by ?? null,
  });
  res.status(201).json(delivery);
}

export async function update(req: AuthRequest, res: Response) {
  const delivery = await deliveryService.updateDelivery(req.params.id, req.body);
  res.json(delivery);
}

export async function updateStatus(req: AuthRequest, res: Response) {
  res.json(await deliveryService.updateDeliveryStatus(req.params.id, req.body?.status, req.user?.email));
}

export async function pick(req: AuthRequest, res: Response) {
  res.json(await deliveryService.pickDelivery(req.params.id, req.user?.email));
}

export async function pack(req: AuthRequest, res: Response) {
  res.json(await deliveryService.packDelivery(req.params.id, req.user?.email));
}

export async function validate(req: AuthRequest, res: Response) {
  res.json(await deliveryService.validateDelivery(req.params.id, req.user?.email));
}

export async function cancel(req: AuthRequest, res: Response) {
  res.json(await deliveryService.cancelDelivery(req.params.id));
}
