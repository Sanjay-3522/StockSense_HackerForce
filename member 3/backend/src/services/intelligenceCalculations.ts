export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export interface MovementBaseline {
  count: number;
  medianAbsoluteMovement: number;
  medianAbsoluteDeviation: number;
  threshold: number;
}

/**
 * A robust, explainable outlier baseline. Requires five historical observations.
 * Threshold is the greater of 3x median absolute movement or median + 3*MAD,
 * avoiding a zero threshold for products whose historical movements are zero.
 */
export function buildMovementBaseline(quantities: number[]): MovementBaseline | null {
  const magnitudes = quantities.map(Math.abs);
  if (magnitudes.length < 5) return null;
  const center = median(magnitudes);
  if (center === null) return null;
  const mad = median(magnitudes.map((value) => Math.abs(value - center))) ?? 0;
  return {
    count: magnitudes.length,
    medianAbsoluteMovement: center,
    medianAbsoluteDeviation: mad,
    threshold: Math.max(center * 3, center + 3 * mad, 1),
  };
}

export function explainDifference(expected: number, traced: number) {
  const unexplained = expected - traced;
  const tolerance = 0;
  return {
    unexplained,
    status: unexplained === 0 ? 'EXPLAINED' : traced === 0 ? 'UNEXPLAINED' : 'PARTIALLY_EXPLAINED',
    tolerance,
  } as const;
}

export function summarizeMovements(movements: Array<{ quantityChange: number }>) {
  const incoming = movements.reduce((sum, movement) => sum + Math.max(0, movement.quantityChange), 0);
  const outgoing = movements.reduce((sum, movement) => sum + Math.min(0, movement.quantityChange), 0);
  return { incoming, outgoing, net: incoming + outgoing };
}

export function sumSignedMovements(expectedDifference: number, movements: Array<{ quantityChange: number }>) {
  const sign = Math.sign(expectedDifference);
  return movements.reduce((sum, movement) => sign !== 0 && Math.sign(movement.quantityChange) === sign ? sum + movement.quantityChange : sum, 0);
}

export function averageDailyConsumption(negativeDeliveryMovements: { quantityChange: number; createdAt: Date }[], days: number) {
  if (days <= 0 || negativeDeliveryMovements.length === 0) return null;
  const consumed = negativeDeliveryMovements.reduce((sum, movement) => sum + Math.abs(Math.min(0, movement.quantityChange)), 0);
  return consumed / days;
}
