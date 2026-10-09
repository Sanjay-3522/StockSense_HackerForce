import { Router } from "express";
import * as categoryController from "../controllers/categoryController";
import { validate } from "../middleware/validate";
import { createCategorySchema, updateCategorySchema } from "../validations/categoryValidation";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", validate(createCategorySchema), categoryController.createCategory);
router.get("/", categoryController.listCategories);
router.get("/:id", categoryController.getCategory);
router.put("/:id", validate(updateCategorySchema), categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);

export default router;
