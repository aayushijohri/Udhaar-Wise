import express from "express";
import { parseOrder } from "../controllers/aiController.js";

const router = express.Router();

router.post("/parse", parseOrder);

export default router;