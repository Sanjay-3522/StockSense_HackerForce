import { Router } from 'express';
import * as ctrl from '../controllers/deliveryController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.getById));
router.post('/', asyncHandler(ctrl.create));
router.patch('/:id', asyncHandler(ctrl.update));
router.patch('/:id/status', asyncHandler(ctrl.updateStatus));
router.post('/:id/pick', asyncHandler(ctrl.pick));
router.post('/:id/pack', asyncHandler(ctrl.pack));
router.post('/:id/validate', asyncHandler(ctrl.validate));
router.post('/:id/cancel', asyncHandler(ctrl.cancel));

export default router;
