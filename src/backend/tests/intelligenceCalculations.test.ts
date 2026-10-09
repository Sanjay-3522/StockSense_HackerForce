import test from 'node:test';
import assert from 'node:assert/strict';
import {
  averageDailyConsumption,
  buildMovementBaseline,
  explainDifference,
  sumSignedMovements,
  summarizeMovements,
} from './intelligenceCalculations';

test('stock explanation aggregates signed ledger movements', () => {
  const totals = summarizeMovements([
    { quantityChange: 100 },
    { quantityChange: -20 },
    { quantityChange: -30 },
    { quantityChange: -5 },
  ]);
  assert.deepEqual(totals, { incoming: 100, outgoing: -55, net: 45 });
});

test('investigation classifies a fully traced -70 discrepancy', () => {
  const traced = sumSignedMovements(-70, [{ quantityChange: -40 }, { quantityChange: -20 }, { quantityChange: -10 }, { quantityChange: 8 }]);
  assert.equal(traced, -70);
  assert.equal(explainDifference(-70, traced).status, 'EXPLAINED');
  assert.equal(explainDifference(-70, traced).unexplained, 0);
});

test('investigation retains the signed unresolved quantity when partly explained', () => {
  const traced = sumSignedMovements(-70, [{ quantityChange: -40 }, { quantityChange: -15 }, { quantityChange: 10 }]);
  const analysis = explainDifference(-70, traced);
  assert.equal(traced, -55);
  assert.equal(analysis.status, 'PARTIALLY_EXPLAINED');
  assert.equal(analysis.unexplained, -15);
});

test('untraced discrepancy is UNEXPLAINED', () => {
  assert.equal(explainDifference(12, 0).status, 'UNEXPLAINED');
});

test('anomaly baseline requires five observations and uses transparent median/MAD', () => {
  assert.equal(buildMovementBaseline([5, 10, 15, 20]) , null);
  const baseline = buildMovementBaseline([10, 20, 30, 15, 25]);
  assert.deepEqual(baseline, { count: 5, medianAbsoluteMovement: 20, medianAbsoluteDeviation: 5, threshold: 60 });
  assert.ok(180 > baseline!.threshold);
});

test('average daily consumption uses negative delivery quantity only', () => {
  assert.equal(averageDailyConsumption([{ quantityChange: -24, createdAt: new Date() }, { quantityChange: 12, createdAt: new Date() }, { quantityChange: -12, createdAt: new Date() }], 3), 12);
  assert.equal(averageDailyConsumption([], 90), null);
});
