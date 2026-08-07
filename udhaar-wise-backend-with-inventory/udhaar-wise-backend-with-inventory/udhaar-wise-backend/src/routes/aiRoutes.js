import express from "express";
import { requireUser } from "../middlewares/auth.js";
import { parseOrder, getFundingInsights, classify, query } from "../controllers/aiController.js";

const router = express.Router();

router.post("/parse", parseOrder);
router.post("/classify", classify);
router.post("/query", requireUser, query);
router.get("/funding-insights", requireUser, getFundingInsights);

export default router;