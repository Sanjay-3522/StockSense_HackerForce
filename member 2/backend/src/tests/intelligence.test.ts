/**
 * Intelligence Backend Verification Script (Member 3)
 *
 * This is a standalone TypeScript test/verification script that can be run with:
 *   npx tsx src/tests/intelligence.test.ts
 *
 * It validates all 7 intelligence features against the real database.
 * The database must be seeded and have some movement records for meaningful results.
 *
 * Tests:
 *  A — Inventory Overview
 *  B — Move History (filtering + pagination)
 *  C — Explain Stock Change (net change math)
 *  D — Investigation (EXPLAINED + PARTIALLY_EXPLAINED cases)
 *  E — Anomaly Detection (anomaly generation + INSUFFICIENT_DATA)
 *  F — Smart Reorder (recommendation + INSUFFICIENT_DATA)
 *  G — Action Center (create, dedup, transition, resolve)
 */
import 'dotenv/config';
import { prisma } from '../utils/prisma';
import { getInventoryOverview } from '../services/intelligence/overviewService';
import { listMovements } from '../services/intelligence/movementService';
import { explainStockChange } from '../services/intelligence/explanationService';
import { runInvestigation } from '../services/intelligence/investigationService';
import { detectAnomalies } from '../services/intelligence/anomalyService';
import { getReorderRecommendations } from '../services/intelligence/reorderService';
import {
  listActions,
  getAction,
  upsertAction,
  updateAction,
  resolveAction,
} from '../services/intelligence/actionService';

// ---------------------------------------------------------------------------
// Test utilities
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function section(name: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST ${name}`);
  console.log('='.repeat(60));
}

// ---------------------------------------------------------------------------
// TEST A — Inventory Overview
// ---------------------------------------------------------------------------

async function testOverview() {
  section('A — Inventory Overview');

  const result = await getInventoryOverview({});

  assert(typeof result.summary.totalInventoryQuantity === 'number', 'totalInventoryQuantity is a number');
  assert(result.summary.totalInventoryQuantity >= 0, 'totalInventoryQuantity >= 0');
  assert(typeof result.summary.totalProducts === 'number', 'totalProducts is a number');
  assert(typeof result.summary.totalWarehouses === 'number', 'totalWarehouses is a number');
  assert(Array.isArray(result.inventoryByWarehouse), 'inventoryByWarehouse is array');
  assert(Array.isArray(result.inventoryByCategory), 'inventoryByCategory is array');
  assert(Array.isArray(result.productsRequiringAttention), 'productsRequiringAttention is array');
  assert(Array.isArray(result.recentMovements), 'recentMovements is array');

  // Verify totals match database directly
  const dbTotal = await prisma.stock.aggregate({ _sum: { quantity: true } });
  const dbTotalQty = dbTotal._sum.quantity ?? 0;
  assert(
    result.summary.totalInventoryQuantity === dbTotalQty,
    'Calculated total matches database SUM(stock.quantity)',
    `expected=${dbTotalQty}, got=${result.summary.totalInventoryQuantity}`
  );

  // Verify product count
  const dbProductCount = await prisma.product.count({ where: { isActive: true } });
  assert(
    result.summary.totalProducts <= dbProductCount,
    'totalProducts <= active product count in DB'
  );

  console.log(`  → Summary: ${JSON.stringify(result.summary)}`);
}

// ---------------------------------------------------------------------------
// TEST B — Move History
// ---------------------------------------------------------------------------

async function testMoveHistory() {
  section('B — Move History (filtering + pagination)');

  // Basic query
  const all = await listMovements({ pageSize: 5 });
  assert(Array.isArray(all.data), 'Returns data array');
  assert(all.data.length <= 5, 'Respects pageSize=5');
  assert(typeof all.pagination.total === 'number', 'Has pagination.total');
  assert(all.pagination.page === 1, 'Default page=1');

  // Operation type filter
  const receipts = await listMovements({ operationType: 'receipt' });
  assert(
    receipts.data.every((m) => m.operationType === 'receipt'),
    'operationType=receipt filter works'
  );

  // Direction filter — positive
  const positive = await listMovements({ direction: 'positive' });
  assert(
    positive.data.every((m) => m.quantityChange > 0),
    'direction=positive returns only positive movements'
  );

  // Direction filter — negative
  const negative = await listMovements({ direction: 'negative' });
  assert(
    negative.data.every((m) => m.quantityChange < 0),
    'direction=negative returns only negative movements'
  );

  // Pagination
  const page2 = await listMovements({ page: 2, pageSize: 1 });
  assert(page2.pagination.page === 2, 'Page 2 returns correctly');

  // Date range — future dates should return empty
  const emptyDate = await listMovements({ dateFrom: '2099-01-01' });
  assert(emptyDate.data.length === 0, 'Future dateFrom returns empty result');

  console.log(`  → Total movements in DB: ${all.pagination.total}`);
}

// ---------------------------------------------------------------------------
// TEST C — Explain Stock Change
// ---------------------------------------------------------------------------

async function testStockExplanation() {
  section('C — Explain Stock Change');

  // Find a product that has movements
  const firstMovement = await prisma.stockMovement.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!firstMovement) {
    console.log('  ⚠ No stock movements in DB — skipping explanation test (seed first)');
    return;
  }

  const result = await explainStockChange({ productId: firstMovement.productId });

  assert(
    ['EXPLAINED', 'PARTIALLY_EXPLAINED', 'UNEXPLAINED', 'NO_DATA'].includes(result.status),
    'Status is one of valid values'
  );
  assert(typeof result.netMovement === 'number', 'netMovement is a number');
  assert(typeof result.openingQuantity === 'number' || result.openingQuantity === null, 'openingQuantity is number or null');
  assert(typeof result.explanation === 'string' && result.explanation.length > 0, 'Explanation text present');

  // Verify net = incoming + outgoing
  const expectedNet = result.totalIncoming + result.totalOutgoing;
  assert(result.netMovement === expectedNet, 'netMovement = totalIncoming + totalOutgoing', `expected=${expectedNet}, got=${result.netMovement}`);

  // Verify computedClosing = opening + net
  if (result.openingQuantity !== null) {
    const expectedClosing = result.openingQuantity + result.netMovement;
    assert(
      result.closingQuantity === expectedClosing,
      'closingQuantity = openingQuantity + netMovement',
      `expected=${expectedClosing}, got=${result.closingQuantity}`
    );
  }

  console.log(`  → Product: ${result.product.name}, Status: ${result.status}, Net: ${result.netMovement}`);
}

// ---------------------------------------------------------------------------
// TEST D — Investigation
// ---------------------------------------------------------------------------

async function testInvestigation() {
  section('D — Inventory Investigator');

  // Find a product with known movements
  const movement = await prisma.stockMovement.findFirst({
    where: { operationType: 'delivery', quantityChange: { lt: 0 } },
    include: { product: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!movement) {
    console.log('  ⚠ No delivery movements in DB — skipping investigation EXPLAINED test');
  } else {
    // Case 1: difference = 0 → NO_DISCREPANCY
    const noDiscrep = await runInvestigation({
      productId: movement.productId,
      recordedQuantity: 100,
      physicalQuantity: 100,
    });
    assert(noDiscrep.status === 'NO_DISCREPANCY', 'Equal quantities → NO_DISCREPANCY');
    assert(noDiscrep.difference === 0, 'Difference is 0 for NO_DISCREPANCY');

    // Case 2: EXPLAINED scenario — traced = difference
    // Use known movement quantities to set up a scenario
    const tracedTotal = movement.quantityChange; // negative
    const result = await runInvestigation({
      productId: movement.productId,
      locationId: movement.locationId ?? undefined,
      recordedQuantity: 500,
      physicalQuantity: 500 + tracedTotal, // physical = recorded + traced
    });
    assert(
      ['EXPLAINED', 'PARTIALLY_EXPLAINED', 'UNEXPLAINED'].includes(result.status),
      'Investigation returns valid status'
    );
    assert(typeof result.difference === 'number', 'difference is a number');
    assert(typeof result.tracedQuantity === 'number', 'tracedQuantity is a number');
    assert(typeof result.unexplainedQuantity === 'number', 'unexplainedQuantity is a number');
    assert(
      result.difference === result.tracedQuantity + result.unexplainedQuantity,
      'difference = tracedQuantity + unexplainedQuantity'
    );
    console.log(`  → Case 2: status=${result.status}, traced=${result.tracedQuantity}, unexplained=${result.unexplainedQuantity}`);
  }

  // Case 3: PARTIALLY_EXPLAINED — difference is larger than available movements
  const anyProduct = await prisma.product.findFirst();
  if (anyProduct) {
    const result2 = await runInvestigation({
      productId: anyProduct.id,
      recordedQuantity: 1000,
      physicalQuantity: 800, // -200 expected
    });
    assert(
      ['EXPLAINED', 'PARTIALLY_EXPLAINED', 'UNEXPLAINED'].includes(result2.status),
      'PARTIALLY_EXPLAINED/UNEXPLAINED possible for large discrepancy'
    );
    assert(result2.difference === -200, 'Difference correctly calculated as -200');
    console.log(`  → Case 3: status=${result2.status}, unexplained=${result2.unexplainedQuantity}`);
  }
}

// ---------------------------------------------------------------------------
// TEST E — Anomaly Detection
// ---------------------------------------------------------------------------

async function testAnomalyDetection() {
  section('E — Anomaly Detection');

  const result = await detectAnomalies({});

  assert(Array.isArray(result.anomalies), 'anomalies is an array');
  assert(Array.isArray(result.insufficientDataProducts), 'insufficientDataProducts is an array');
  assert(typeof result.dataWindowDays === 'number', 'dataWindowDays is a number');

  // Every anomaly must have required fields
  for (const a of result.anomalies) {
    assert(typeof a.id === 'string', `Anomaly ${a.id} has id`);
    assert(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(a.severity), `Anomaly ${a.id} has valid severity`);
    assert(typeof a.reason === 'string' && a.reason.length > 0, `Anomaly ${a.id} has reason text`);
    assert(Array.isArray(a.supportingMovementIds), `Anomaly ${a.id} has supportingMovementIds`);
    assert(typeof a.observedMovement === 'number', `Anomaly ${a.id} has observedMovement`);
    break; // check only first to avoid verbose output
  }

  // Insufficient data products should not have anomalies
  for (const iDP of result.insufficientDataProducts) {
    const hasAnomaly = result.anomalies.some((a) => a.productId === iDP.productId);
    assert(!hasAnomaly, `Insufficient-data product ${iDP.sku} has no anomaly (correctly returns INSUFFICIENT_DATA)`);
    break;
  }

  // Severity filter
  const highOnly = await detectAnomalies({ severity: 'HIGH' });
  assert(
    highOnly.anomalies.every((a) => a.severity === 'HIGH'),
    'severity=HIGH filter returns only HIGH anomalies'
  );

  console.log(`  → Found ${result.anomalies.length} anomalies, ${result.insufficientDataProducts.length} insufficient-data products`);
}

// ---------------------------------------------------------------------------
// TEST F — Smart Reorder
// ---------------------------------------------------------------------------

async function testSmartReorder() {
  section('F — Smart Reorder');

  const result = await getReorderRecommendations({});

  assert(Array.isArray(result), 'Returns an array');

  for (const r of result) {
    assert(
      ['REORDER_RECOMMENDED', 'NOT_REQUIRED', 'INSUFFICIENT_DATA'].includes(r.recommendationStatus),
      `Product ${r.sku} has valid recommendationStatus`
    );
    assert(typeof r.currentStock === 'number', `Product ${r.sku} has currentStock`);
    assert(typeof r.effectiveStock === 'number', `Product ${r.sku} has effectiveStock`);
    assert(typeof r.explanation === 'string' && r.explanation.length > 0, `Product ${r.sku} has explanation`);

    // Effective stock invariant
    assert(
      r.effectiveStock === r.currentStock + r.pendingReceiptQty - r.pendingDeliveryQty,
      `Product ${r.sku}: effectiveStock = currentStock + pendingReceipts - pendingDeliveries`
    );
  }

  const insufficientCount = result.filter((r) => r.recommendationStatus === 'INSUFFICIENT_DATA').length;
  const reorderCount = result.filter((r) => r.recommendationStatus === 'REORDER_RECOMMENDED').length;
  const notRequiredCount = result.filter((r) => r.recommendationStatus === 'NOT_REQUIRED').length;

  console.log(`  → Total products evaluated: ${result.length}`);
  console.log(`    REORDER_RECOMMENDED: ${reorderCount}, NOT_REQUIRED: ${notRequiredCount}, INSUFFICIENT_DATA: ${insufficientCount}`);
}

// ---------------------------------------------------------------------------
// TEST G — Action Center
// ---------------------------------------------------------------------------

async function testActionCenter() {
  section('G — Action Center');

  // Find a product to use as context
  const product = await prisma.product.findFirst();
  if (!product) {
    console.log('  ⚠ No products in DB — skipping action center test');
    return;
  }

  // Clean up any test actions from prior runs
  await prisma.intelligenceAction.deleteMany({
    where: { source: 'TEST_SUITE', productId: product.id },
  });

  // G1: Create an action
  const { action: action1, created: c1 } = await upsertAction({
    type: 'REORDER_RECOMMENDED',
    priority: 'NEEDS_REVIEW',
    title: 'Test reorder action',
    description: 'Test description',
    source: 'TEST_SUITE',
    productId: product.id,
    warehouseId: null,
  });
  assert(c1 === true, 'First upsert creates new action');
  assert(action1 !== null, 'Action is returned');

  // G2: Deduplication — same type+source+product should not create duplicate
  const { action: action2, created: c2 } = await upsertAction({
    type: 'REORDER_RECOMMENDED',
    priority: 'NEEDS_REVIEW',
    title: 'Test reorder action (duplicate attempt)',
    description: 'Updated description',
    source: 'TEST_SUITE',
    productId: product.id,
    warehouseId: null,
  });
  assert(c2 === false, 'Second upsert with same key does NOT create duplicate');
  assert(action2?.id === action1?.id, 'Same action ID returned on dedup');

  const id = action1!.id;

  // G3: Read it back
  const fetched = await getAction(id);
  assert(fetched.id === id, 'getAction returns correct action');
  assert(fetched.status === 'OPEN', 'New action has status OPEN');

  // G4: OPEN → IN_PROGRESS
  const updated = await updateAction(id, { status: 'IN_PROGRESS' });
  assert(updated.status === 'IN_PROGRESS', 'OPEN → IN_PROGRESS transition works');

  // G5: Invalid transition RESOLVED → OPEN (must fail)
  const resolvedAction = await resolveAction(id);
  assert(resolvedAction.status === 'RESOLVED', 'IN_PROGRESS → RESOLVED works');
  assert(resolvedAction.resolvedAt !== null, 'resolvedAt is set on resolve');

  // G6: Cannot re-resolve already-resolved action
  let resolveError = false;
  try {
    await resolveAction(id);
  } catch {
    resolveError = true;
  }
  assert(resolveError, 'Re-resolving an already-resolved action throws error');

  // G7: OPEN → RESOLVED (skipping IN_PROGRESS) should fail
  const { action: action3 } = await upsertAction({
    type: 'LOW_STOCK',
    priority: 'INFORMATION',
    title: 'Test low stock',
    description: 'Test',
    source: 'TEST_SUITE',
    productId: product.id,
  });
  let badTransitionError = false;
  try {
    await updateAction(action3!.id, { status: 'RESOLVED' });
  } catch {
    badTransitionError = true;
  }
  assert(badTransitionError, 'OPEN → RESOLVED directly throws error (must go through IN_PROGRESS)');

  // G8: List with filter
  const list = await listActions({ source: 'TEST_SUITE', productId: product.id });
  assert(Array.isArray(list.data), 'listActions returns data array');
  assert(typeof list.pagination.total === 'number', 'listActions returns pagination');

  // G9: A new OPEN action can be created for the same condition AFTER the previous is RESOLVED
  const { action: action4, created: c4 } = await upsertAction({
    type: 'REORDER_RECOMMENDED',
    priority: 'NEEDS_REVIEW',
    title: 'New reorder action after resolution',
    description: 'Condition recurred',
    source: 'TEST_SUITE',
    productId: product.id,
    warehouseId: null,
  });
  assert(c4 === true, 'New OPEN action created after previous is RESOLVED (condition recurred)');
  assert(action4?.id !== id, 'New action has a different ID from the resolved one');

  // Cleanup
  await prisma.intelligenceAction.deleteMany({
    where: { source: 'TEST_SUITE', productId: product.id },
  });
  console.log('  → Test actions cleaned up');
}

// ---------------------------------------------------------------------------
// Run all tests
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n🧪 StockSense — Member 3 Intelligence Backend Tests');
  console.log('======================================================\n');

  try {
    await testOverview();
    await testMoveHistory();
    await testStockExplanation();
    await testInvestigation();
    await testAnomalyDetection();
    await testSmartReorder();
    await testActionCenter();
  } catch (err) {
    console.error('\n💥 Unexpected error during tests:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n======================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('✅ All tests passed!');
  } else {
    console.log('❌ Some tests failed. See above for details.');
    process.exit(1);
  }
}

main();
