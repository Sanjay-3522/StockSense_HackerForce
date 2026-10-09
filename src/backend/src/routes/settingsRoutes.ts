import { Router } from "express";
import warehouseRoutes from "./warehouseRoutes";

const router = Router();

// Settings → Warehouse is a thin organizational alias over the existing
// Warehouse module. It intentionally reuses warehouseRoutes (and therefore
// the same warehouseController/warehouseService) rather than duplicating
// warehouse CRUD, so /api/warehouses and /api/settings/warehouse are always
// backed by the same single source of truth.
router.use("/warehouse", warehouseRoutes);

export default router;
