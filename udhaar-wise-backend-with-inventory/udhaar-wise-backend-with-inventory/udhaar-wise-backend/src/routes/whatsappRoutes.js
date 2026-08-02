import { Router } from 'express';
import { verifyWebhook, receiveWebhook } from '../controllers/whatsappController.js';

const router = Router();

/**
 * Meta WhatsApp Webhook endpoints
 * Complete path will be determined by server registration, e.g., /api/whatsapp/webhook
 */
router.get('/webhook', verifyWebhook);
router.post('/webhook', receiveWebhook);

export default router;
