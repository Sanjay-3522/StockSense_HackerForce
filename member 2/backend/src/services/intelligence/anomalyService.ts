/**
 * Anomaly Detection Service (Member 3 — Intelligence)
 *
 * Detects unusual patterns in stock movements using transparent statistical rules.
 * NO machine learning. All thresholds and reasoning are fully documented.
 *
 * Anomaly types detected:
 *
 *  A. LARGE_MOVEMENT
 *     A single movement is unusually large compared to the historical range for
 *     the same product+operation type. Threshold: mean + 2 × standard deviation.
 *
 *  B. SPIKE_MOVEMENT
 *     A single movement is more than 3× the average for that product+operation.
 *
 *  C. REPEATED_ADJUSTMENT
 *     The same product has 3+ adjustments within 7 days at the same location.
 *
 *  D. LARGE_NEGATIVE
 *     A single negative movement exceeds 3× the average negative movement for
 *     that product.
 *
 *  E. REPEATED_DISCREPANCY
 *     The same product+location has 3+ separate adjustment discrepancies within
 *     30 days (an adjustment is counted as a discrepancy if difference != 0,
 *     which is always the case since adjustmentService validates that).
 *
 * Minimum history required: 5 movements before an anomaly is flagged.
 * If fewer than 5 historical data points exist: return INSUFFICIENT_DATA note.
 *
 * Severity calculation:
 *   deviation >= 5σ  → CRITICAL
 *   deviation >= 3σ  → HIGH
 *   deviation >= 2σ  → MEDIUM
 *   else             → LOW
 */
import { prisma } from '../../utils/prisma';

const MIN_HISTORY = 5;       // minimum data points before anomaly detection
const LOOKBACK_DAYS = 90;    // historical window for baseline calculation
const ANOMALY_WINDOW_DAYS = 30; // window for detecting repeated patterns

export type AnomalyType =
  | 'LARGE_MOVEMENT'
  | 'SPIKE_MOVEMENT'
  | 'REPEATED_ADJUSTMENT'
  | 'LARGE_NEGATIVE'
  | 'REPEATED_DISCREPANCY';

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Anomaly {
  id: string;                    // deterministic: 'anomaly-<movementId>' or 'anomaly-<type>-<productId>-<key>'
  type: AnomalyType;
  severity: AnomalySeverity;
  productId: string;
  productName: string;
  sku: string;
  warehouseId: string | null;
  warehouseName: string | null;
  locationId: string | null;
  locationName: string | null;
  operationType: string | null;
  reference: string | null;
  timestamp: Date;
  observedMovement: number;
  historicalMean: number;
  historicalStdDev: number;
  thresholdValue: number;
  deviationSigma: number | null;
  reason: string;
  supportingMovementIds: string[];
}

export interface AnomalyFilters {
  severity?: AnomalySeverity;
  productId?: string;
  warehouseId?: string;
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
  anomalyType?: AnomalyType;
}

// ---------------------------------------------------------------------------
// Statistics helpers
// ---------------------------------------------------------------------------

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function severity(sigma: number): AnomalySeverity {
  if (sigma >= 5) return 'CRITICAL';
  if (sigma >= 3) return 'HIGH';
  if (sigma >= 2) return 'MEDIUM';
  return 'LOW';
}

// ---------------------------------------------------------------------------
// Main detection function
// ---------------------------------------------------------------------------

export async function detectAnomalies(filters: AnomalyFilters = {}): Promise<{
  anomalies: Anomaly[];
  insufficientDataProducts: { productId: string; productName: string; sku: string; reason: string }[];
  dataWindowDays: number;
}> {
  const now = new Date();
  const lookbackStart = new Date(now);
  lookbackStart.setDate(lookbackStart.getDate() - LOOKBACK_DAYS);

  const anomalyWindowStart = new Date(now);
  anomalyWindowStart.setDate(anomalyWindowStart.getDate() - ANOMALY_WINDOW_DAYS);

  // Build optional product/warehouse/location filters
  const baseWhere: Record<string, unknown> = {};
  if (filters.productId) baseWhere.productId = filters.productId;
  if (filters.warehouseId) baseWhere.warehouseId = filters.warehouseId;
  if (filters.locationId) baseWhere.locationId = filters.locationId;

  // 1. Fetch all historical movements in the lookback window
  const historicalMovements = await prisma.stockMovement.findMany({
    where: {
      ...baseWhere,
      createdAt: { gte: lookbackStart },
    },
    include: { product: true, warehouse: true, location: true },
    orderBy: { createdAt: 'asc' },
  });

  // 2. Group by productId + operationType
  type MGroup = {
    product: { id: string; name: string; sku: string };
    movements: typeof historicalMovements;
  };
  const groups = new Map<string, MGroup>();
  for (const m of historicalMovements) {
    const key = `${m.productId}|${m.operationType}`;
    if (!groups.has(key)) {
      groups.set(key, { product: { id: m.product.id, name: m.product.name, sku: m.product.sku }, movements: [] });
    }
    groups.get(key)!.movements.push(m);
  }

  const anomalies: Anomaly[] = [];
  const insufficientDataProducts: { productId: string; productName: string; sku: string; reason: string }[] = [];
  const seenInsufficient = new Set<string>();

  // Respect date-range filter for which movements we check for anomalies
  // (baseline always uses full LOOKBACK_DAYS for statistical stability)
  const checkFrom = filters.dateFrom ? new Date(filters.dateFrom) : anomalyWindowStart;
  const checkTo = filters.dateTo
    ? (() => {
        const dt = new Date(filters.dateTo);
        if (filters.dateTo.length <= 10) dt.setDate(dt.getDate() + 1);
        return dt;
      })()
    : now;

  for (const [key, group] of groups) {
    const [productId] = key.split('|');
    const { product, movements } = group;

    // Must have enough history for statistical baselines
    if (movements.length < MIN_HISTORY) {
      if (!seenInsufficient.has(productId)) {
        seenInsufficient.add(productId);
        insufficientDataProducts.push({
          productId,
          productName: product.name,
          sku: product.sku,
          reason: `Only ${movements.length} historical movement(s) — minimum ${MIN_HISTORY} required for anomaly detection.`,
        });
      }
      continue;
    }

    const absValues = movements.map((m) => Math.abs(m.quantityChange));
    const avg = mean(absValues);
    const sd = stdDev(absValues, avg);
    const threshold2Sigma = avg + 2 * sd;

    // Identify "candidate" movements (recent, within date filter)
    const candidates = movements.filter(
      (m) => m.createdAt >= checkFrom && m.createdAt < checkTo
    );

    for (const m of candidates) {
      const absVal = Math.abs(m.quantityChange);
      const sigma = sd > 0 ? (absVal - avg) / sd : 0;

      // --- A. LARGE_MOVEMENT ---
      if (absVal > threshold2Sigma && sd > 0) {
        anomalies.push({
          id: `anomaly-large-${m.id}`,
          type: 'LARGE_MOVEMENT',
          severity: severity(sigma),
          productId: m.product.id,
          productName: m.product.name,
          sku: m.sku,
          warehouseId: m.warehouseId,
          warehouseName: m.warehouse?.name ?? null,
          locationId: m.locationId,
          locationName: m.location?.name ?? null,
          operationType: m.operationType,
          reference: m.reference,
          timestamp: m.createdAt,
          observedMovement: m.quantityChange,
          historicalMean: avg,
          historicalStdDev: sd,
          thresholdValue: threshold2Sigma,
          deviationSigma: parseFloat(sigma.toFixed(2)),
          reason: `Movement of ${m.quantityChange} units is ${sigma.toFixed(1)}σ above the ${LOOKBACK_DAYS}-day mean of ${avg.toFixed(1)} ± ${sd.toFixed(1)} for this product and operation type.`,
          supportingMovementIds: [m.id],
        });
        continue; // don't double-flag with SPIKE on same movement
      }

      // --- B. SPIKE_MOVEMENT (>3× average, but fewer than 2σ, i.e. low-σ distributions) ---
      if (avg > 0 && absVal > avg * 3 && absVal <= threshold2Sigma) {
        anomalies.push({
          id: `anomaly-spike-${m.id}`,
          type: 'SPIKE_MOVEMENT',
          severity: 'MEDIUM',
          productId: m.product.id,
          productName: m.product.name,
          sku: m.sku,
          warehouseId: m.warehouseId,
          warehouseName: m.warehouse?.name ?? null,
          locationId: m.locationId,
          locationName: m.location?.name ?? null,
          operationType: m.operationType,
          reference: m.reference,
          timestamp: m.createdAt,
          observedMovement: m.quantityChange,
          historicalMean: avg,
          historicalStdDev: sd,
          thresholdValue: avg * 3,
          deviationSigma: sd > 0 ? parseFloat(sigma.toFixed(2)) : null,
          reason: `Movement of ${m.quantityChange} units is ${(absVal / avg).toFixed(1)}× the ${LOOKBACK_DAYS}-day average of ${avg.toFixed(1)} for this product and operation type.`,
          supportingMovementIds: [m.id],
        });
      }

      // --- D. LARGE_NEGATIVE ---
      if (m.quantityChange < 0) {
        const negativeMovements = movements.filter((x) => x.quantityChange < 0);
        if (negativeMovements.length >= MIN_HISTORY) {
          const negAbs = negativeMovements.map((x) => Math.abs(x.quantityChange));
          const negAvg = mean(negAbs);
          const negSd = stdDev(negAbs, negAvg);
          const negSigma = negSd > 0 ? (Math.abs(m.quantityChange) - negAvg) / negSd : 0;
          if (Math.abs(m.quantityChange) > negAvg * 3 && negSd > 0 && negSigma >= 2) {
            anomalies.push({
              id: `anomaly-lneg-${m.id}`,
              type: 'LARGE_NEGATIVE',
              severity: severity(negSigma),
              productId: m.product.id,
              productName: m.product.name,
              sku: m.sku,
              warehouseId: m.warehouseId,
              warehouseName: m.warehouse?.name ?? null,
              locationId: m.locationId,
              locationName: m.location?.name ?? null,
              operationType: m.operationType,
              reference: m.reference,
              timestamp: m.createdAt,
              observedMovement: m.quantityChange,
              historicalMean: -negAvg,
              historicalStdDev: negSd,
              thresholdValue: -(negAvg * 3),
              deviationSigma: parseFloat(negSigma.toFixed(2)),
              reason: `Outgoing movement of ${m.quantityChange} units is ${negSigma.toFixed(1)}σ below the average negative movement of ${(-negAvg).toFixed(1)} for this product.`,
              supportingMovementIds: [m.id],
            });
          }
        }
      }
    }
  }

  // --- C. REPEATED_ADJUSTMENT (same product, 3+ adjustments in 7 days at same location) ---
  const adjustmentWindow = 7;
  const adjustmentMovements = historicalMovements.filter(
    (m) => m.operationType === 'adjustment' && m.createdAt >= checkFrom && m.createdAt < checkTo
  );

  // Group by productId + locationId
  const adjGroups = new Map<string, typeof historicalMovements>();
  for (const m of adjustmentMovements) {
    const key = `${m.productId}|${m.locationId ?? '__'}`;
    if (!adjGroups.has(key)) adjGroups.set(key, []);
    adjGroups.get(key)!.push(m);
  }

  for (const [, adjMovements] of adjGroups) {
    if (adjMovements.length < 3) continue;

    // Sliding 7-day window
    adjMovements.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    for (let i = 0; i <= adjMovements.length - 3; i++) {
      const windowStart = adjMovements[i].createdAt;
      const windowEnd = new Date(windowStart);
      windowEnd.setDate(windowEnd.getDate() + adjustmentWindow);
      const inWindow = adjMovements.filter(
        (m) => m.createdAt >= windowStart && m.createdAt < windowEnd
      );
      if (inWindow.length >= 3) {
        const first = inWindow[0];
        const ids = inWindow.map((m) => m.id);
        anomalies.push({
          id: `anomaly-radjust-${first.productId}-${first.locationId ?? 'noloc'}-${windowStart.getTime()}`,
          type: 'REPEATED_ADJUSTMENT',
          severity: inWindow.length >= 5 ? 'HIGH' : 'MEDIUM',
          productId: first.product.id,
          productName: first.product.name,
          sku: first.sku,
          warehouseId: first.warehouseId,
          warehouseName: first.warehouse?.name ?? null,
          locationId: first.locationId,
          locationName: first.location?.name ?? null,
          operationType: 'adjustment',
          reference: null,
          timestamp: first.createdAt,
          observedMovement: inWindow.reduce((s, m) => s + m.quantityChange, 0),
          historicalMean: 0,
          historicalStdDev: 0,
          thresholdValue: 3,
          deviationSigma: null,
          reason: `${inWindow.length} adjustments recorded for this product at this location within a ${adjustmentWindow}-day window, which may indicate repeated counting issues.`,
          supportingMovementIds: ids,
        });
        break; // only flag the earliest window per product+location
      }
    }
  }

  // --- E. REPEATED_DISCREPANCY (3+ adjustments within 30-day window per product+location) ---
  // This is a longer-window variant of C focusing on discrepancy recurrence
  const longAdjMovements = historicalMovements.filter(
    (m) => m.operationType === 'adjustment' && m.createdAt >= anomalyWindowStart
  );
  const longAdjGroups = new Map<string, typeof historicalMovements>();
  for (const m of longAdjMovements) {
    const key = `${m.productId}|${m.locationId ?? '__'}`;
    if (!longAdjGroups.has(key)) longAdjGroups.set(key, []);
    longAdjGroups.get(key)!.push(m);
  }

  for (const [, adjMovements] of longAdjGroups) {
    if (adjMovements.length < 3) continue;

    // Avoid duplicate with REPEATED_ADJUSTMENT (which uses a 7-day window) by
    // only generating REPEATED_DISCREPANCY when the 7-day check didn't fire
    const first = adjMovements[0];
    const alreadyFlagged = anomalies.some(
      (a) =>
        a.type === 'REPEATED_ADJUSTMENT' &&
        a.productId === first.productId &&
        a.locationId === first.locationId
    );
    if (alreadyFlagged) continue;

    anomalies.push({
      id: `anomaly-rdiscr-${first.productId}-${first.locationId ?? 'noloc'}`,
      type: 'REPEATED_DISCREPANCY',
      severity: adjMovements.length >= 5 ? 'HIGH' : 'MEDIUM',
      productId: first.product.id,
      productName: first.product.name,
      sku: first.sku,
      warehouseId: first.warehouseId,
      warehouseName: first.warehouse?.name ?? null,
      locationId: first.locationId,
      locationName: first.location?.name ?? null,
      operationType: 'adjustment',
      reference: null,
      timestamp: first.createdAt,
      observedMovement: adjMovements.reduce((s, m) => s + m.quantityChange, 0),
      historicalMean: 0,
      historicalStdDev: 0,
      thresholdValue: 3,
      deviationSigma: null,
      reason: `${adjMovements.length} inventory adjustments for this product+location in the last ${ANOMALY_WINDOW_DAYS} days may indicate recurring discrepancies.`,
      supportingMovementIds: adjMovements.map((m) => m.id),
    });
  }

  // Apply post-filters
  let filteredAnomalies = anomalies;
  if (filters.severity) {
    filteredAnomalies = filteredAnomalies.filter((a) => a.severity === filters.severity);
  }
  if (filters.anomalyType) {
    filteredAnomalies = filteredAnomalies.filter((a) => a.type === filters.anomalyType);
  }

  return {
    anomalies: filteredAnomalies,
    insufficientDataProducts,
    dataWindowDays: LOOKBACK_DAYS,
  };
}
