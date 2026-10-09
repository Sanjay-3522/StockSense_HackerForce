import { Router } from "express";
import * as productController from "../controllers/productController";
import { validate } from "../middleware/validate";
import { createProductSchema, updateProductSchema } from "../validations/productValidation";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", validate(createProductSchema), productController.createProduct);
router.get("/", productController.listProducts);
router.get("/:id", productController.getProduct);
router.put("/:id", validate(updateProductSchema), productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

export default router;
