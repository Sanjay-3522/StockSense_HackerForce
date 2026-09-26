import type { Request, Response } from 'express';
import * as deliveryService from '../services/deliveryService';
import { AppError } from '../utils/AppError';

export async function list(_req: Request, res: Response) {
  res.json(await deliveryService.listDeliveries());
}

export async function getById(req: Request, res: Response) {
  const delivery = await deliveryService.getDelivery(req.params.id);
  if (!delivery) throw new AppError('Delivery not found', 404);
  res.json(delivery);
}

export async function create(req: Request, res: Response) {
  const delivery = await deliveryService.createDelivery(req.body);
  res.status(201).json(delivery);
}

export async function update(req: Request, res: Response) {
  const delivery = await deliveryService.updateDelivery(req.params.id, req.body);
  res.json(delivery);
}

export async function updateStatus(req: Request, res: Response) {
  res.json(await deliveryService.updateDeliveryStatus(req.params.id, req.body?.status, req.body?.user));
}

export async function pick(req: Request, res: Response) {
  res.json(await deliveryService.pickDelivery(req.params.id, req.body?.user));
}

export async function pack(req: Request, res: Response) {
  res.json(await deliveryService.packDelivery(req.params.id, req.body?.user));
}

export async function validate(req: Request, res: Response) {
  res.json(await deliveryService.validateDelivery(req.params.id, req.body?.user));
}

export async function cancel(req: Request, res: Response) {
  res.json(await deliveryService.cancelDelivery(req.params.id));
}
