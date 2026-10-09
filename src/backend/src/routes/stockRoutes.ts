import { Router } from "express";
import * as stockController from "../controllers/stockController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.get("/", stockController.listStock);
router.get("/product/:productId", stockController.getStockByProduct);

export default router;
