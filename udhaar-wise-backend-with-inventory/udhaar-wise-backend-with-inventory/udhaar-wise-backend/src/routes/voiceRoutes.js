import express from "express";
import { upload } from "../middlewares/upload.js";
import { parseVoice } from "../controllers/voiceController.js";

const router = express.Router();

router.post("/parse", upload.single("audio"), parseVoice);

export default router;