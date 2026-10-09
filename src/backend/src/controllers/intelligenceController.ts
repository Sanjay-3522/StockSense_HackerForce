import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { getOverview } from '../services/overviewService';
import { getMovements } from '../services/movementService';
import { explainStockChange, investigateDiscrepancy } from '../services/explanationService';
import { getAnomalies } from '../services/anomalyService';
import { getReorderRecommendations } from '../services/reorderService';
import * as actions from '../services/actionService';
import {
  optionalUuid, parseDateRange, parseEnum, parseInteger, parsePagination, parseOptionalIntBody,
  queryString, requiredUuid, requiredString,
} from '../services/intelligenceValidation';
import type { InventoryFilters, MovementFilters } from '../services/intelligenceQueries';

const OPERATIONS = ['receipt', 'delivery', 'transfer', 'adjustment'] as const;
const DIRECTIONS = ['positive', 'negative'] as const;
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const ACTION_PRIORITIES = ['CRITICAL', 'NEEDS_REVIEW', 'INFORMATION'] as const;
const ACTION_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED'] as const;
const REORDER_STATUSES = ['REORDER_RECOMMENDED', 'NOT_REQUIRED', 'INSUFFICIENT_DATA'] as const;
const ANOMALY_TYPES = ['UNUSUALLY_LARGE_MOVEMENT', 'UNUSUAL_NEGATIVE_MOVEMENT', 'SUDDEN_MOVEMENT_SPIKE', 'REPEATED_DISCREPANCIES'] as const;

function parseInventoryFilters(req: Request): InventoryFilters {
  return {
    productId: optionalUuid(queryString(req, 'product_id') ?? queryString(req, 'product'), 'product_id'),
    warehouseId: optionalUuid(queryString(req, 'warehouse_id'), 'warehouse_id'),
    locationId: optionalUuid(queryString(req, 'location_id'), 'location_id'),
    categoryId: optionalUuid(queryString(req, 'category_id'), 'category_id'),
    sku: queryString(req, 'sku'),
  };
}

function parseMovementFilters(req: Request): MovementFilters {
  const inventory = parseInventoryFilters(req);
  const { start, end } = parseDateRange(queryString(req, 'from'), queryString(req, 'to'));
  return {
    ...inventory,
    operationType: parseEnum(queryString(req, 'operation_type'), 'operation_type', OPERATIONS),
    direction: parseEnum(queryString(req, 'direction'), 'direction', DIRECTIONS),
    reference: queryString(req, 'reference'),
    from: start,
    to: end,
  };
}

async function verifyFilters(filters: InventoryFilters) {
  const [product, warehouse, location, category] = await Promise.all([
    filters.productId ? prisma.product.findUnique({ where: { id: filters.productId }, select: { id: true } }) : Promise.resolve(true),
    filters.warehouseId ? prisma.warehouse.findUnique({ where: { id: filters.warehouseId }, select: { id: true } }) : Promise.resolve(true),
    filters.locationId ? prisma.location.findUnique({ where: { id: filters.locationId }, select: { id: true, warehouseId: true } }) : Promise.resolve(true),
    filters.categoryId ? prisma.productCategory.findUnique({ where: { id: filters.categoryId }, select: { id: true } }) : Promise.resolve(true),
  ]);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
  if (!warehouse) throw new AppError('Warehouse not found', 404, 'NOT_FOUND');
  if (!location) throw new AppError('Location not found', 404, 'NOT_FOUND');
  if (!category) throw new AppError('Category not found', 404, 'NOT_FOUND');
  if (filters.locationId && filters.warehouseId && typeof location !== 'boolean' && location.warehouseId !== filters.warehouseId) {
    throw new AppError('Location does not belong to the requested warehouse', 400, 'VALIDATION_ERROR');
  }
}

export async function overview(req: Request, res: Response) {
  const filters = parseInventoryFilters(req);
  await verifyFilters(filters);
  res.json(await getOverview(filters));
}

export async function movements(req: Request, res: Response) {
  const filters = parseMovementFilters(req);
  await verifyFilters(filters);
  const { page, limit } = parsePagination(req);
  res.json(await getMovements(filters, page, limit));
}

export async function stockExplanation(req: Request, res: Response) {
  const productId = requiredUuid(queryString(req, 'product_id') ?? queryString(req, 'product'), 'product_id');
  const warehouseId = optionalUuid(queryString(req, 'warehouse_id'), 'warehouse_id');
  const locationId = optionalUuid(queryString(req, 'location_id'), 'location_id');
  const { start, end } = parseDateRange(queryString(req, 'from'), queryString(req, 'to'));
  const reference = queryString(req, 'reference');
  if (!locationId && !warehouseId) throw new AppError('warehouse_id or location_id is required', 400, 'VALIDATION_ERROR');
  await verifyFilters({ productId, warehouseId, locationId });
  res.json(await explainStockChange({ productId, warehouseId, locationId, from: start, to: end, reference }));
}

export async function investigation(req: Request, res: Response) {
  const body = req.body ?? {};
  const productId = requiredUuid(body.product_id ?? body.productId, 'product_id');
  const warehouseId = body.warehouse_id == null ? undefined : requiredUuid(body.warehouse_id, 'warehouse_id');
  const locationId = body.location_id == null ? undefined : requiredUuid(body.location_id, 'location_id');
  if (!warehouseId && !locationId) throw new AppError('warehouse_id or location_id is required', 400, 'VALIDATION_ERROR');
  const recordedQuantity = parseOptionalIntBody(body.recorded_quantity ?? body.recordedQuantity, 'recorded_quantity');
  const physicalQuantity = parseOptionalIntBody(body.physical_quantity ?? body.physicalQuantity, 'physical_quantity');
  const fromValue = body.from == null ? undefined : requiredString(body.from, 'from');
  const toValue = body.to == null ? undefined : requiredString(body.to, 'to');
  const { start, end } = parseDateRange(fromValue, toValue);
  await verifyFilters({ productId, warehouseId, locationId });
  res.status(200).json(await investigateDiscrepancy({ productId, warehouseId, locationId, recordedQuantity, physicalQuantity, from: start, to: end }));
}

export async function anomalies(req: Request, res: Response) {
  const filters = parseMovementFilters(req);
  const severity = parseEnum(queryString(req, 'severity'), 'severity', SEVERITIES);
  const anomalyType = parseEnum(queryString(req, 'anomaly_type'), 'anomaly_type', ANOMALY_TYPES);
  await verifyFilters(filters);
  res.json(await getAnomalies({ ...filters, severity, anomalyType }));
}

export async function reorder(req: Request, res: Response) {
  const filters = parseInventoryFilters(req);
  const status = parseEnum(queryString(req, 'status'), 'status', REORDER_STATUSES);
  await verifyFilters(filters);
  res.json(await getReorderRecommendations({ ...filters, status }));
}

export async function listActionsHandler(req: Request, res: Response) {
  const { page, limit } = parsePagination(req);
  const { start, end } = parseDateRange(queryString(req, 'from'), queryString(req, 'to'));
  const priority = parseEnum(queryString(req, 'priority'), 'priority', ACTION_PRIORITIES);
  const status = parseEnum(queryString(req, 'status'), 'status', ACTION_STATUSES);
  const warehouseId = optionalUuid(queryString(req, 'warehouse_id'), 'warehouse_id');
  const productId = optionalUuid(queryString(req, 'product_id'), 'product_id');
  const type = queryString(req, 'type');
  const source = queryString(req, 'source');
  await verifyFilters({ warehouseId, productId });
  res.json(await actions.listActions({ priority, status, type, source, warehouseId, productId, from: start, to: end }, page, limit));
}

export async function getActionHandler(req: Request, res: Response) {
  res.json(await actions.getAction(requiredUuid(req.params.id, 'id')));
}

export async function patchActionHandler(req: Request, res: Response) {
  const id = requiredUuid(req.params.id, 'id');
  const status = parseEnum(typeof req.body?.status === 'string' ? req.body.status : undefined, 'status', ACTION_STATUSES);
  if (!status) throw new AppError('status is required', 400, 'VALIDATION_ERROR');
  let result;
  if (status === 'IN_PROGRESS') result = await actions.setActionInProgress(id);
  else if (status === 'RESOLVED') result = await actions.resolveAction(id);
  else {
    const current = await actions.getAction(id);
    if (current.status !== 'IN_PROGRESS') throw new AppError('Only IN_PROGRESS actions can return to OPEN', 409, 'INVALID_STATUS_TRANSITION');
    result = await prisma.intelligenceAction.update({ where: { id }, data: { status: 'OPEN', resolvedAt: null } });
  }
  res.json(result);
}

export async function resolveActionHandler(req: Request, res: Response) {
  res.json(await actions.resolveAction(requiredUuid(req.params.id, 'id')));
}
