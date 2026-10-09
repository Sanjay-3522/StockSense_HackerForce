import { Router } from 'express';
import * as ctrl from '../controllers/transferController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.getById));
router.post('/', asyncHandler(ctrl.create));
router.patch('/:id', asyncHandler(ctrl.update));
router.patch('/:id/status', asyncHandler(ctrl.updateStatus));
router.post('/:id/complete', asyncHandler(ctrl.complete));
router.post('/:id/cancel', asyncHandler(ctrl.cancel));

export default router;
