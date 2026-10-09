import { Router } from "express";
import * as locationController from "../controllers/locationController";
import { validate } from "../middleware/validate";
import { createLocationSchema, updateLocationSchema } from "../validations/locationValidation";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", validate(createLocationSchema), locationController.createLocation);
router.get("/", locationController.listLocations);
router.get("/:id", locationController.getLocation);
router.put("/:id", validate(updateLocationSchema), locationController.updateLocation);
router.delete("/:id", locationController.deleteLocation);

export default router;
