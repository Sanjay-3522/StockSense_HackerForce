import { Router } from "express";
import * as reorderRuleController from "../controllers/reorderRuleController";
import { validate } from "../middleware/validate";
import {
  createReorderRuleSchema,
  updateReorderRuleSchema,
} from "../validations/reorderRuleValidation";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", validate(createReorderRuleSchema), reorderRuleController.createReorderRule);
router.get("/", reorderRuleController.listReorderRules);
router.get("/:id", reorderRuleController.getReorderRule);
router.put("/:id", validate(updateReorderRuleSchema), reorderRuleController.updateReorderRule);
router.delete("/:id", reorderRuleController.deleteReorderRule);

export default router;
