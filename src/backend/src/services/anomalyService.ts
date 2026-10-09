import { prisma } from '../utils/prisma';
import { buildMovementBaseline } from './intelligenceCalculations';
import { movementInclude, movementWhere, type MovementFilters } from './intelligenceQueries';

const WINDOW_DAYS = 30;
const BASELINE_DAYS = 90;
const MOVEMENT_CAP = 5000;

function keyFor(movement: { productId: string; locationId: string | null; sourceLocationId: string | null; destinationLocationId: string | null; quantityChange: number }) {
  const locationId = movement.locationId ?? (movement.quantityChange < 0 ? movement.sourceLocationId : movement.destinationLocationId) ?? 'unknown';
  return `${movement.productId}:${locationId}`;
}

export async function getAnomalies(filters: MovementFilters & { severity?: string; anomalyType?: string }) {
  const now = new Date();
  const requestedStart = filters.from ?? new Date(now.getTime() - WINDOW_DAYS * 86400000);
  const requestedEnd = filters.to ?? now;
  const historicalStart = new Date(requestedStart.getTime() - BASELINE_DAYS * 86400000);
  const [recent, history] = await Promise.all([
    prisma.stockMovement.findMany({ where: movementWhere({ ...filters, from: requestedStart, to: requestedEnd }), orderBy: { createdAt: 'desc' }, take: MOVEMENT_CAP, include: movementInclude }),
    prisma.stockMovement.findMany({ where: movementWhere({ ...filters, from: historicalStart, to: new Date(requestedStart.getTime() - 1) }), orderBy: { createdAt: 'desc' }, take: MOVEMENT_CAP, include: movementInclude }),
  ]);

  const historyByKey = new Map<string, typeof history>();
  for (const row of history) {
    const key = keyFor(row);
    const group = historyByKey.get(key) ?? [];
    group.push(row);
    historyByKey.set(key, group);
  }
  const anomalies: Array<Record<string, unknown>> = [];
  let insufficientGroups = 0;
  for (const row of recent) {
    const baseline = buildMovementBaseline((historyByKey.get(keyFor(row)) ?? []).map((movement) => movement.quantityChange));
    if (!baseline) {
      insufficientGroups++;
      continue;
    }
    const magnitude = Math.abs(row.quantityChange);
    if (magnitude <= baseline.threshold) continue;
    const deviation = magnitude - baseline.threshold;
    const ratio = magnitude / Math.max(baseline.medianAbsoluteMovement, 1);
    const severity = ratio >= 10 ? 'CRITICAL' : ratio >= 6 ? 'HIGH' : ratio >= 4 ? 'MEDIUM' : 'LOW';
    anomalies.push({
      id: `movement:${row.id}`,
      product: row.product,
      productId: row.productId,
      sku: row.sku,
      warehouse: row.warehouse ?? row.location?.warehouse ?? row.sourceLocation?.warehouse ?? row.destinationLocation?.warehouse ?? null,
      location: row.location ?? (row.quantityChange < 0 ? row.sourceLocation : row.destinationLocation),
      operation: { type: row.operationType, reference: row.reference },
      timestamp: row.createdAt,
      observedMovement: row.quantityChange,
      historicalBaseline: { sampleCount: baseline.count, medianAbsoluteMovement: baseline.medianAbsoluteMovement, medianAbsoluteDeviation: baseline.medianAbsoluteDeviation },
      threshold: baseline.threshold,
      deviation,
      anomalyType: row.quantityChange < 0 ? 'UNUSUAL_NEGATIVE_MOVEMENT' : 'UNUSUALLY_LARGE_MOVEMENT',
      reason: `Absolute movement ${magnitude} exceeds the historical threshold ${baseline.threshold} based on ${baseline.count} prior observations.`,
      severity,
      supportingMovementIds: [row.id, ...(historyByKey.get(keyFor(row)) ?? []).slice(0, 20).map((movement) => movement.id)],
      warehouseId: row.warehouseId ?? row.location?.warehouseId ?? row.sourceLocation?.warehouseId ?? row.destinationLocation?.warehouseId ?? null,
      locationId: row.locationId ?? (row.quantityChange < 0 ? row.sourceLocationId : row.destinationLocationId),
      productIdValue: row.productId,
    });
  }

  // Daily spike rule: compare total absolute movements for a recent UTC day
  // against the same product/location's prior active-day totals. Require five
  // historical active days, so a sparse series is not labeled anomalous.
  const dayTotal = (rows: typeof recent) => {
    const byDay = new Map<string, typeof recent>();
    for (const row of rows) {
      const key = row.createdAt.toISOString().slice(0, 10);
      const group = byDay.get(key) ?? [];
      group.push(row);
      byDay.set(key, group);
    }
    return byDay;
  };
  const allKeys = new Set([...historyByKey.keys(), ...recent.map(keyFor)]);
  for (const key of allKeys) {
    const historicDays = dayTotal(historyByKey.get(key) ?? []);
    const recentDays = dayTotal(recent.filter((row) => keyFor(row) === key));
    const baseline = buildMovementBaseline([...historicDays.values()].map((rows) => rows.reduce((sum, row) => sum + Math.abs(row.quantityChange), 0)));
    if (!baseline) continue;
    for (const [day, rows] of recentDays) {
      const observed = rows.reduce((sum, row) => sum + Math.abs(row.quantityChange), 0);
      if (observed <= baseline.threshold) continue;
      const representative = rows[0];
      const ratio = observed / Math.max(baseline.medianAbsoluteMovement, 1);
      anomalies.push({
        id: `daily-spike:${key}:${day}`,
        product: representative.product,
        productId: representative.productId,
        sku: representative.sku,
        warehouse: representative.warehouse ?? representative.location?.warehouse ?? representative.sourceLocation?.warehouse ?? representative.destinationLocation?.warehouse ?? null,
        location: representative.location ?? (representative.quantityChange < 0 ? representative.sourceLocation : representative.destinationLocation),
        operation: { type: 'multiple', references: [...new Set(rows.map((row) => row.reference))] },
        timestamp: day,
        observedMovement: rows.reduce((sum, row) => sum + row.quantityChange, 0),
        historicalBaseline: { sampleCount: baseline.count, medianAbsoluteMovement: baseline.medianAbsoluteMovement, medianAbsoluteDeviation: baseline.medianAbsoluteDeviation },
        threshold: baseline.threshold,
        deviation: observed - baseline.threshold,
        anomalyType: 'SUDDEN_MOVEMENT_SPIKE',
        reason: `Total absolute movement ${observed} on ${day} exceeds the historical daily threshold ${baseline.threshold} based on ${baseline.count} active days.`,
        severity: ratio >= 10 ? 'CRITICAL' : ratio >= 6 ? 'HIGH' : ratio >= 4 ? 'MEDIUM' : 'LOW',
        supportingMovementIds: rows.map((row) => row.id),
        warehouseId: representative.warehouseId ?? representative.location?.warehouseId ?? representative.sourceLocation?.warehouseId ?? representative.destinationLocation?.warehouseId ?? null,
        locationId: representative.locationId ?? (representative.quantityChange < 0 ? representative.sourceLocationId : representative.destinationLocationId),
        productIdValue: representative.productId,
      });
    }
  }

  const adjustmentGroups = new Map<string, typeof recent>();
  for (const row of recent) {
    if (row.operationType !== 'adjustment') continue;
    const key = keyFor(row);
    const group = adjustmentGroups.get(key) ?? [];
    group.push(row);
    adjustmentGroups.set(key, group);
  }
  for (const rows of adjustmentGroups.values()) {
    if (rows.length < 3) continue;
    const row = rows[0];
    anomalies.push({
      id: `adjustments:${keyFor(row)}:${rows.map((item) => item.id).sort().join(',')}`,
      product: row.product,
      productId: row.productId,
      sku: row.sku,
      warehouse: row.warehouse ?? row.location?.warehouse ?? row.sourceLocation?.warehouse ?? row.destinationLocation?.warehouse ?? null,
      location: row.location ?? (row.quantityChange < 0 ? row.sourceLocation : row.destinationLocation),
      operation: { type: 'adjustment', references: [...new Set(rows.map((item) => item.reference))] },
      timestamp: row.createdAt,
      observedMovement: rows.reduce((sum, item) => sum + item.quantityChange, 0),
      historicalBaseline: null,
      threshold: 3,
      deviation: rows.length - 2,
      anomalyType: 'REPEATED_DISCREPANCIES',
      reason: `${rows.length} adjustment movements were recorded for this product/location in the selected period. This is a review signal only.`,
      severity: rows.length >= 5 ? 'HIGH' : 'MEDIUM',
      supportingMovementIds: rows.map((item) => item.id),
      warehouseId: row.warehouseId ?? row.location?.warehouseId ?? row.sourceLocation?.warehouseId ?? row.destinationLocation?.warehouseId ?? null,
      locationId: row.locationId ?? (row.quantityChange < 0 ? row.sourceLocationId : row.destinationLocationId),
      productIdValue: row.productId,
    });
  }

  const isInsufficient = recent.length === 0 || (anomalies.length === 0 && insufficientGroups > 0);
  const requestedSeverity = filters.severity;
  const requestedType = filters.anomalyType;
  const filtered = anomalies.filter((item) => (!requestedSeverity || item.severity === requestedSeverity) && (!requestedType || item.anomalyType === requestedType));
  return {
    state: isInsufficient ? 'INSUFFICIENT_DATA' : anomalies.length ? 'READY' : 'READY',
    items: filtered,
    analysis: { windowStart: requestedStart.toISOString(), windowEnd: requestedEnd.toISOString(), baselineDays: BASELINE_DAYS, baselineMinimumSamples: 5, analyzedMovements: recent.length, historicalMovements: history.length, insufficientBaselineMovements: insufficientGroups, capped: recent.length === MOVEMENT_CAP || history.length === MOVEMENT_CAP },
  };
}
