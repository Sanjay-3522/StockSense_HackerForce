import { Router } from 'express';
import * as ctrl from '../controllers/intelligenceController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/overview', asyncHandler(ctrl.overview));
router.get('/movements', asyncHandler(ctrl.movements));
router.get('/stock-explanation', asyncHandler(ctrl.stockExplanation));
router.post('/investigations', asyncHandler(ctrl.investigation));
router.get('/anomalies', asyncHandler(ctrl.anomalies));
router.get('/reorder', asyncHandler(ctrl.reorder));
router.get('/actions', asyncHandler(ctrl.listActionsHandler));
router.get('/actions/:id', asyncHandler(ctrl.getActionHandler));
router.patch('/actions/:id', asyncHandler(ctrl.patchActionHandler));
router.post('/actions/:id/resolve', asyncHandler(ctrl.resolveActionHandler));

export default router;
