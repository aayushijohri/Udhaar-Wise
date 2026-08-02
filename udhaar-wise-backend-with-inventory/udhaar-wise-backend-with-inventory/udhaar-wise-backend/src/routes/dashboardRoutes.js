import express from "express";
import { requireUser } from "../middlewares/auth.js";
import {
  getOverview,
  getRevenueAnalytics,
  getOrdersAnalytics,
  getCustomersAnalytics,
  getInventoryAnalytics,
  getAiAnalytics,
  getRecentActivities,
} from "../controllers/dashboardController.js";

const router = express.Router();

router.use(requireUser);

router.get("/overview", getOverview);
router.get("/revenue", getRevenueAnalytics);
router.get("/orders", getOrdersAnalytics);
router.get("/customers", getCustomersAnalytics);
router.get("/inventory", getInventoryAnalytics);
router.get("/ai", getAiAnalytics);
router.get("/recent-activities", getRecentActivities);

export default router;
