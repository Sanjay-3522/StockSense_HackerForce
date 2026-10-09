import { Router } from "express";
import { authenticate } from "../middleware/auth";

// Foundation (Member 1)
import authRoutes from "./authRoutes";
import categoryRoutes from "./categoryRoutes";
import productRoutes from "./productRoutes";
import warehouseRoutes from "./warehouseRoutes";
import locationRoutes from "./locationRoutes";
import stockRoutes from "./stockRoutes";
import adjustmentReasonRoutes from "./adjustmentReasonRoutes";
import reorderRuleRoutes from "./reorderRuleRoutes";
import dashboardRoutes from "./dashboardRoutes";
import settingsRoutes from "./settingsRoutes";

// Operations (Member 2)
import receiptRoutes from "./receipts";
import deliveryRoutes from "./deliveries";
import transferRoutes from "./transfers";
import adjustmentRoutes from "./adjustments";
import lookupRoutes from "./lookups";

// Intelligence (Member 3)
import intelligenceRoutes from "./intelligence";

const router = Router();

// AUTH — the only auth system in the project (JWT + bcrypt, Member 1's).
router.use("/auth", authRoutes);

// FOUNDATION — each of these routers already applies `authenticate`
// internally (router.use(authenticate) at the top of the file).
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/warehouses", warehouseRoutes);
router.use("/locations", locationRoutes);
router.use("/stock", stockRoutes);
router.use("/adjustment-reasons", adjustmentReasonRoutes);
router.use("/reorder-rules", reorderRuleRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/settings", settingsRoutes);

// OPERATIONS — Member 2's routers did not apply `authenticate` themselves
// (they were designed to run standalone), so it's applied here at the
// mount point instead, using the same JWT middleware as everything else.
router.use("/receipts", authenticate, receiptRoutes);
router.use("/deliveries", authenticate, deliveryRoutes);
router.use("/transfers", authenticate, transferRoutes);
router.use("/adjustments", authenticate, adjustmentRoutes);
router.use("/lookups", authenticate, lookupRoutes);

// INTELLIGENCE — same treatment.
router.use("/intelligence", authenticate, intelligenceRoutes);

export default router;
