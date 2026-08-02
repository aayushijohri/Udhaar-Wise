import express from "express";
import { requireUser } from "../middlewares/auth.js";
import {
  createInventory,
  listInventory,
  getInventoryById,
  updateInventory,
  restockInventory,
  deleteInventory,
} from "../controllers/inventoryController.js";

const router = express.Router();

// Same session-verification middleware used by every other protected
// module (orders, customers, settings, premium, dashboard, notifications).
// shopkeeper_id === req.user.id, so no separate tenant resolution needed.
router.use(requireUser);

// Administration only — stock movement (deduct/restock on order events),
// low-stock detection, and analytics stay in ordersService/dashboardService/
// notificationDetectors. This module never writes quantity_in_stock except
// via the explicit, manual /restock action below.
router.post("/", createInventory);
router.get("/", listInventory);
router.get("/:id", getInventoryById);
router.patch("/:id", updateInventory);
router.patch("/:id/restock", restockInventory);
router.delete("/:id", deleteInventory);

export default router;
