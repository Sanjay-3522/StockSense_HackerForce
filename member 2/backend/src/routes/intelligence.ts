/**
 * Intelligence Routes (Member 3)
 *
 * All routes are mounted at /api/intelligence in server.ts.
 *
 * GET  /api/intelligence/overview
 * GET  /api/intelligence/movements
 * GET  /api/intelligence/stock-explanation
 * POST /api/intelligence/investigations
 * GET  /api/intelligence/anomalies
 * GET  /api/intelligence/reorder
 * GET  /api/intelligence/actions
 * GET  /api/intelligence/actions/:id
 * PATCH /api/intelligence/actions/:id
 * POST /api/intelligence/actions/:id/resolve
 * POST /api/intelligence/actions/sync
 */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as ctrl from '../controllers/intelligenceController';

const router = Router();

// Feature 1 — Inventory Overview
router.get('/overview', asyncHandler(ctrl.getOverview));

// Feature 2 — Move History
router.get('/movements', asyncHandler(ctrl.getMovements));

// Feature 3 — Explain Stock Change
router.get('/stock-explanation', asyncHandler(ctrl.getStockExplanation));

// Feature 4 — Inventory Investigator
router.post('/investigations', asyncHandler(ctrl.runInvestigation));

// Feature 5 — Anomaly Detection
router.get('/anomalies', asyncHandler(ctrl.getAnomalies));

// Feature 6 — Smart Reorder
router.get('/reorder', asyncHandler(ctrl.getReorderRecommendations));

// Feature 7 — Action Center
// IMPORTANT: /actions/sync must be declared BEFORE /actions/:id to avoid
// "sync" being interpreted as an action ID.
router.post('/actions/sync', asyncHandler(ctrl.syncActions));
router.get('/actions', asyncHandler(ctrl.listActions));
router.get('/actions/:id', asyncHandler(ctrl.getActionById));
router.patch('/actions/:id', asyncHandler(ctrl.updateAction));
router.post('/actions/:id/resolve', asyncHandler(ctrl.resolveAction));

export default router;
