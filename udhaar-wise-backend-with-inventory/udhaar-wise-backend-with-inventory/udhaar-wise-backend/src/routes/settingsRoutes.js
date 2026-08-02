import express from "express";
import { requireUser } from "../middlewares/auth.js";
import {
  getProfile,
  updateProfile,
  getBilling,
  getPreferences,
  updatePreferences,
} from "../controllers/settingsController.js";

const router = express.Router();

router.use(requireUser);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.get("/billing", getBilling);
router.get("/preferences", getPreferences);
router.put("/preferences", updatePreferences);

export default router;
