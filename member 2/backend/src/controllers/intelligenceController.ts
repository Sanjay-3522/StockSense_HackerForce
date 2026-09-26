/**
 * Intelligence Controller (Member 3)
 *
 * Thin HTTP adapter layer — validates inputs, calls services,
 * returns structured JSON. Never exposes stack traces or raw DB errors.
 */
import type { Request, Response } from 'express';
import { AppError } from '../../utils/AppError';
import * as overviewService from '../../services/intelligence/overviewService';
import * as movementService from '../../services/intelligence/movementService';
import * as explanationService from '../../services/intelligence/explanationService';
import * as investigationService from '../../services/intelligence/investigationService';
import * as anomalyService from '../../services/intelligence/anomalyService';
import * as reorderService from '../../services/intelligence/reorderService';
import * as actionService from '../../services/intelligence/actionService';
import { ActionStatus, ActionPriority, ActionType } from '@prisma/client';

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}

function asInt(v: unknown): number | undefined {
  const n = Number(v);
  return !isNaN(n) && Number.isFinite(n) ? n : undefined;
}

function asPage(v: unknown): number {
  const n = Number(v);
  return !isNaN(n) && n >= 1 ? Math.floor(n) : 1;
}

function asPageSize(v: unknown): number {
  const n = Number(v);
  return !isNaN(n) && n >= 1 && n <= 200 ? Math.floor(n) : 50;
}

function isISODate(v: unknown): boolean {
  return typeof v === 'string' && !isNaN(Date.parse(v));
}

// ---------------------------------------------------------------------------
// Feature 1 — Inventory Overview
// ---------------------------------------------------------------------------

export async function getOverview(req: Request, res: Response) {
  const filters: overviewService.OverviewFilters = {
    warehouseId: asString(req.query.warehouseId),
    locationId: asString(req.query.locationId),
    productId: asString(req.query.productId),
    categoryId: asString(req.query.categoryId),
    sku: asString(req.query.sku),
  };
  const result = await overviewService.getInventoryOverview(filters);
  res.json({ success: true, data: result });
}

// ---------------------------------------------------------------------------
// Feature 2 — Move History
// ---------------------------------------------------------------------------

const VALID_OPERATION_TYPES = ['receipt', 'delivery', 'transfer', 'adjustment'] as const;
type MovementOpType = (typeof VALID_OPERATION_TYPES)[number];

export async function getMovements(req: Request, res: Response) {
  const opType = asString(req.query.operationType) as MovementOpType | undefined;
  if (opType && !VALID_OPERATION_TYPES.includes(opType)) {
    throw new AppError(`Invalid operationType. Valid values: ${VALID_OPERATION_TYPES.join(', ')}`, 400);
  }

  const directionRaw = asString(req.query.direction);
  if (directionRaw && directionRaw !== 'positive' && directionRaw !== 'negative') {
    throw new AppError('direction must be "positive" or "negative"', 400);
  }

  const dateFrom = asString(req.query.dateFrom);
  const dateTo = asString(req.query.dateTo);
  if (dateFrom && !isISODate(dateFrom)) throw new AppError('dateFrom must be a valid ISO date string', 400);
  if (dateTo && !isISODate(dateTo)) throw new AppError('dateTo must be a valid ISO date string', 400);

  const filters: movementService.MovementFilters = {
    productId: asString(req.query.productId),
    sku: asString(req.query.sku),
    warehouseId: asString(req.query.warehouseId),
    locationId: asString(req.query.locationId),
    operationType: opType,
    dateFrom,
    dateTo,
    direction: directionRaw as 'positive' | 'negative' | undefined,
    reference: asString(req.query.reference),
    page: asPage(req.query.page),
    pageSize: asPageSize(req.query.pageSize),
  };

  const result = await movementService.listMovements(filters);
  res.json({ success: true, ...result });
}

// ---------------------------------------------------------------------------
// Feature 3 — Explain Stock Change
// ---------------------------------------------------------------------------

export async function getStockExplanation(req: Request, res: Response) {
  const productId = asString(req.query.productId);
  if (!productId) throw new AppError('productId is required', 400);

  const dateFrom = asString(req.query.dateFrom);
  const dateTo = asString(req.query.dateTo);
  if (dateFrom && !isISODate(dateFrom)) throw new AppError('dateFrom must be a valid ISO date string', 400);
  if (dateTo && !isISODate(dateTo)) throw new AppError('dateTo must be a valid ISO date string', 400);

  const result = await explanationService.explainStockChange({
    productId,
    warehouseId: asString(req.query.warehouseId),
    locationId: asString(req.query.locationId),
    dateFrom,
    dateTo,
    reference: asString(req.query.reference),
  });
  res.json({ success: true, data: result });
}

// ---------------------------------------------------------------------------
// Feature 4 — Inventory Investigator
// ---------------------------------------------------------------------------

export async function runInvestigation(req: Request, res: Response) {
  const { productId, locationId, warehouseId, recordedQuantity, physicalQuantity, dateFrom, dateTo } = req.body as Record<string, unknown>;

  if (!productId || typeof productId !== 'string') throw new AppError('productId is required', 400);

  const recorded = asInt(recordedQuantity);
  const physical = asInt(physicalQuantity);
  if (recorded === undefined) throw new AppError('recordedQuantity must be a valid integer', 400);
  if (physical === undefined) throw new AppError('physicalQuantity must be a valid integer', 400);
  if (recorded < 0) throw new AppError('recordedQuantity must be >= 0', 400);
  if (physical < 0) throw new AppError('physicalQuantity must be >= 0', 400);

  const dfStr = typeof dateFrom === 'string' ? dateFrom : undefined;
  const dtStr = typeof dateTo === 'string' ? dateTo : undefined;
  if (dfStr && !isISODate(dfStr)) throw new AppError('dateFrom must be a valid ISO date string', 400);
  if (dtStr && !isISODate(dtStr)) throw new AppError('dateTo must be a valid ISO date string', 400);

  const result = await investigationService.runInvestigation({
    productId,
    locationId: typeof locationId === 'string' ? locationId : undefined,
    warehouseId: typeof warehouseId === 'string' ? warehouseId : undefined,
    recordedQuantity: recorded,
    physicalQuantity: physical,
    dateFrom: dfStr,
    dateTo: dtStr,
  });
  res.status(200).json({ success: true, data: result });
}

// ---------------------------------------------------------------------------
// Feature 5 — Anomaly Detection
// ---------------------------------------------------------------------------

const VALID_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const VALID_ANOMALY_TYPES = [
  'LARGE_MOVEMENT',
  'SPIKE_MOVEMENT',
  'REPEATED_ADJUSTMENT',
  'LARGE_NEGATIVE',
  'REPEATED_DISCREPANCY',
] as const;

export async function getAnomalies(req: Request, res: Response) {
  const severityRaw = asString(req.query.severity) as anomalyService.AnomalySeverity | undefined;
  if (severityRaw && !VALID_SEVERITIES.includes(severityRaw)) {
    throw new AppError(`Invalid severity. Valid: ${VALID_SEVERITIES.join(', ')}`, 400);
  }

  const anomalyTypeRaw = asString(req.query.anomalyType) as anomalyService.AnomalyType | undefined;
  if (anomalyTypeRaw && !VALID_ANOMALY_TYPES.includes(anomalyTypeRaw)) {
    throw new AppError(`Invalid anomalyType. Valid: ${VALID_ANOMALY_TYPES.join(', ')}`, 400);
  }

  const dateFrom = asString(req.query.dateFrom);
  const dateTo = asString(req.query.dateTo);
  if (dateFrom && !isISODate(dateFrom)) throw new AppError('dateFrom must be a valid ISO date string', 400);
  if (dateTo && !isISODate(dateTo)) throw new AppError('dateTo must be a valid ISO date string', 400);

  const result = await anomalyService.detectAnomalies({
    severity: severityRaw,
    productId: asString(req.query.productId),
    warehouseId: asString(req.query.warehouseId),
    locationId: asString(req.query.locationId),
    dateFrom,
    dateTo,
    anomalyType: anomalyTypeRaw,
  });

  res.json({ success: true, data: result });
}

// ---------------------------------------------------------------------------
// Feature 6 — Smart Reorder
// ---------------------------------------------------------------------------

const VALID_REORDER_STATUSES = ['REORDER_RECOMMENDED', 'NOT_REQUIRED', 'INSUFFICIENT_DATA'] as const;

export async function getReorderRecommendations(req: Request, res: Response) {
  const statusRaw = asString(req.query.recommendationStatus) as reorderService.ReorderStatus | undefined;
  if (statusRaw && !VALID_REORDER_STATUSES.includes(statusRaw)) {
    throw new AppError(`Invalid recommendationStatus. Valid: ${VALID_REORDER_STATUSES.join(', ')}`, 400);
  }

  const result = await reorderService.getReorderRecommendations({
    productId: asString(req.query.productId),
    warehouseId: asString(req.query.warehouseId),
    categoryId: asString(req.query.categoryId),
    recommendationStatus: statusRaw,
  });

  res.json({ success: true, data: result });
}

// ---------------------------------------------------------------------------
// Feature 7 — Action Center
// ---------------------------------------------------------------------------

const VALID_ACTION_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED'] as const;
const VALID_ACTION_PRIORITIES = ['CRITICAL', 'NEEDS_REVIEW', 'INFORMATION'] as const;
const VALID_ACTION_TYPES = [
  'REORDER_RECOMMENDED',
  'ANOMALY_DETECTED',
  'INVESTIGATION_REQUIRED',
  'LOW_STOCK',
  'OUT_OF_STOCK',
] as const;

export async function listActions(req: Request, res: Response) {
  const statusRaw = asString(req.query.status) as ActionStatus | undefined;
  if (statusRaw && !VALID_ACTION_STATUSES.includes(statusRaw)) {
    throw new AppError(`Invalid status. Valid: ${VALID_ACTION_STATUSES.join(', ')}`, 400);
  }

  const priorityRaw = asString(req.query.priority) as ActionPriority | undefined;
  if (priorityRaw && !VALID_ACTION_PRIORITIES.includes(priorityRaw)) {
    throw new AppError(`Invalid priority. Valid: ${VALID_ACTION_PRIORITIES.join(', ')}`, 400);
  }

  const typeRaw = asString(req.query.type) as ActionType | undefined;
  if (typeRaw && !VALID_ACTION_TYPES.includes(typeRaw)) {
    throw new AppError(`Invalid type. Valid: ${VALID_ACTION_TYPES.join(', ')}`, 400);
  }

  const dateFrom = asString(req.query.dateFrom);
  const dateTo = asString(req.query.dateTo);
  if (dateFrom && !isISODate(dateFrom)) throw new AppError('dateFrom must be a valid ISO date string', 400);
  if (dateTo && !isISODate(dateTo)) throw new AppError('dateTo must be a valid ISO date string', 400);

  const result = await actionService.listActions({
    status: statusRaw,
    priority: priorityRaw,
    type: typeRaw,
    source: asString(req.query.source),
    warehouseId: asString(req.query.warehouseId),
    productId: asString(req.query.productId),
    locationId: asString(req.query.locationId),
    dateFrom,
    dateTo,
    page: asPage(req.query.page),
    pageSize: asPageSize(req.query.pageSize),
  });

  res.json({ success: true, ...result });
}

export async function getActionById(req: Request, res: Response) {
  const { id } = req.params;
  if (!id) throw new AppError('Action ID is required', 400);
  const action = await actionService.getAction(id);
  res.json({ success: true, data: action });
}

export async function updateAction(req: Request, res: Response) {
  const { id } = req.params;
  if (!id) throw new AppError('Action ID is required', 400);

  const { status, priority, recommendedAction } = req.body as Record<string, unknown>;

  const statusVal = typeof status === 'string' ? (status as ActionStatus) : undefined;
  if (statusVal && !VALID_ACTION_STATUSES.includes(statusVal)) {
    throw new AppError(`Invalid status. Valid: ${VALID_ACTION_STATUSES.join(', ')}`, 400);
  }

  const priorityVal = typeof priority === 'string' ? (priority as ActionPriority) : undefined;
  if (priorityVal && !VALID_ACTION_PRIORITIES.includes(priorityVal)) {
    throw new AppError(`Invalid priority. Valid: ${VALID_ACTION_PRIORITIES.join(', ')}`, 400);
  }

  const result = await actionService.updateAction(id, {
    status: statusVal,
    priority: priorityVal,
    recommendedAction: typeof recommendedAction === 'string' ? recommendedAction : undefined,
  });
  res.json({ success: true, data: result });
}

export async function resolveAction(req: Request, res: Response) {
  const { id } = req.params;
  if (!id) throw new AppError('Action ID is required', 400);
  const result = await actionService.resolveAction(id);
  res.json({ success: true, data: result });
}

export async function syncActions(req: Request, res: Response) {
  const result = await actionService.syncActionsFromCurrentState();
  res.json({ success: true, data: result });
}
