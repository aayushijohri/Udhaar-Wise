import express from "express";
import { requireUser } from "../middlewares/auth.js";
import {
  listAll,
  listPayments,
  listOccasions,
  listInventory,
  listAi,
  listSubscriptions,
  listRecent,
  markAllRead,
  markRead,
  dismiss,
  listPreferences,
  updatePreference,
  generate,
} from "../controllers/notificationController.js";

const router = express.Router();

router.use(requireUser);

router.get("/", listAll);
router.get("/payments", listPayments);
router.get("/occasions", listOccasions);
router.get("/inventory", listInventory);
router.get("/ai", listAi);
router.get("/subscriptions", listSubscriptions);
router.get("/recent", listRecent);

router.patch("/mark-all-read", markAllRead);
router.patch("/:notificationId/mark-read", markRead);
router.patch("/:notificationId/dismiss", dismiss);

router.get("/preferences", listPreferences);
router.put("/preferences/:category", updatePreference);

// Not in the original FastAPI router (which relied on a background
// scheduler this project doesn't have) — exposed so reminders can be
// triggered on demand until a cron/scheduled job is set up.
router.post("/generate", generate);

export default router;
