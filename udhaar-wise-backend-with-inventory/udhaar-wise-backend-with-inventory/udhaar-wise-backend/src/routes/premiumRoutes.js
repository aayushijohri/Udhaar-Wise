import express from "express";
import { requireUser } from "../middlewares/auth.js";
import {
  listPlans,
  getCurrentSubscription,
  upgradeSubscription,
  cancelSubscription,
  getFeatureAccess,
} from "../controllers/premiumController.js";

const router = express.Router();

router.use(requireUser);

router.get("/plans", listPlans);
router.get("/subscription", getCurrentSubscription);
router.post("/subscription/upgrade", upgradeSubscription);
router.post("/subscription/cancel", cancelSubscription);
router.get("/feature-access", getFeatureAccess);

export default router;
