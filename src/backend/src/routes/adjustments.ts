import { Router } from 'express';
import * as ctrl from '../controllers/adjustmentController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(ctrl.list));
router.post('/', asyncHandler(ctrl.create));

export default router;
