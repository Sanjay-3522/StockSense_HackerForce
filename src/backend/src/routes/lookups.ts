import { Router } from 'express';
import * as ctrl from '../controllers/lookupController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/reference', asyncHandler(ctrl.reference));
router.get('/stock', asyncHandler(ctrl.stockQuantity));

export default router;
