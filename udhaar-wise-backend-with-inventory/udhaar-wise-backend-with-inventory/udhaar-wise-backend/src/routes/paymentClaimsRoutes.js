import express from "express";
import { requireUser } from "../middlewares/auth.js";
import { listClaims, approveClaim, rejectClaim } from "../controllers/paymentClaimsController.js";

const router = express.Router();
router.use(requireUser);

router.get("/", listClaims);
router.post("/:id/approve", approveClaim);
router.post("/:id/reject", rejectClaim);

export default router;
