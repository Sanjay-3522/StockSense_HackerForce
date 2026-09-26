import { Router } from 'express';
import * as ctrl from '../controllers/lookupController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/products', asyncHandler(ctrl.products));
router.get('/warehouses', asyncHandler(ctrl.warehouses));
router.get('/locations', asyncHandler(ctrl.locations));
router.get('/categories', asyncHandler(ctrl.categories));
router.get('/adjustment-reasons', asyncHandler(ctrl.adjustmentReasons));
router.get('/reference', asyncHandler(ctrl.reference));
router.get('/stock', asyncHandler(ctrl.stockQuantity));

export default router;
