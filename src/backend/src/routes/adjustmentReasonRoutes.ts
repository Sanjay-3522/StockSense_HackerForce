import { Router } from "express";
import * as reasonController from "../controllers/adjustmentReasonController";
import { validate } from "../middleware/validate";
import {
  createAdjustmentReasonSchema,
  updateAdjustmentReasonSchema,
} from "../validations/adjustmentReasonValidation";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", validate(createAdjustmentReasonSchema), reasonController.createReason);
router.get("/", reasonController.listReasons);
router.get("/:id", reasonController.getReason);
router.put("/:id", validate(updateAdjustmentReasonSchema), reasonController.updateReason);
router.delete("/:id", reasonController.deleteReason);

export default router;
