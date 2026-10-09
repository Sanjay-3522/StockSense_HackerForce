import { Router } from "express";
import * as warehouseController from "../controllers/warehouseController";
import { validate } from "../middleware/validate";
import { createWarehouseSchema, updateWarehouseSchema } from "../validations/warehouseValidation";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", validate(createWarehouseSchema), warehouseController.createWarehouse);
router.get("/", warehouseController.listWarehouses);
router.get("/:id", warehouseController.getWarehouse);
router.put("/:id", validate(updateWarehouseSchema), warehouseController.updateWarehouse);
router.delete("/:id", warehouseController.deleteWarehouse);

export default router;
