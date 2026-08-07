import express from 'express';
import { requireUser } from '../middlewares/auth.js';
import * as paymentsController from '../controllers/paymentsController.js';

const router = express.Router();

// POST /api/payments - record a direct payment and refresh overview
router.post('/', requireUser, paymentsController.createPayment);

export default router;
