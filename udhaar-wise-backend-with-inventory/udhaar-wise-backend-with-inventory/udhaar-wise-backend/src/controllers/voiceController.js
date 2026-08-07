import { transcribeAudio } from "../services/whisperService.js";
import { parseOrder, classifyMessage, extractPaymentMode, parsePayment, INTENTS } from "../services/aiService.js";
import * as paymentClaimsService from "../services/paymentClaimsService.js";
import * as ordersService from "../services/ordersService.js";


export async function parseVoice(req, res) {
  try {
    const transcript = await transcribeAudio(req.file.path);
    console.log('[VOICE][STAGE1] Raw transcript from whisper:', transcript);

    const intent = await classifyMessage(transcript);
    console.log('[VOICE][STAGE2] Detected intent:', intent);

    if (intent === 'PAYMENT') {
      const pay = await parsePayment(transcript);
      const mode = pay.payment_mode || extractPaymentMode(transcript) || 'cash';
      // For voice payments from owner, assume owner initiated and require customer name
      // Try to parse customer name via order parser fallback
      const orderParsed = await parseOrder(transcript);
      const custName = orderParsed.customer_name || null;
      // If no customer name, return parsed payment info for manual mapping
      if (!custName) {
        return res.json({ success: true, transcript, intent: 'PAYMENT', payment: pay });
      }
      // Resolve customer and apply direct payment — use paymentClaimsService.recordDirectPayment via owner flow elsewhere
      // Here just return structured payload for upstream handling
      return res.json({ success: true, transcript, intent: 'PAYMENT', payment: pay, customer_name: custName, parsed_order: orderParsed });
    }

    if (intent === INTENTS.INVENTORY_ADD || intent === INTENTS.INVENTORY_REMOVE || intent === INTENTS.INVENTORY_UPDATE) {
      try {
        const ownerParse = await (await import('../services/aiService.js')).parseOwnerMessage(transcript);
        return res.json({ success: true, intent, owner_action: ownerParse });
      } catch (e) {
        return res.json({ success: true, intent, message: 'Could not parse inventory command', transcript });
      }
    }

    const order = await parseOrder(transcript);
    try { console.log('[VOICE][STAGE3] AI parseOrder output:', JSON.stringify(order)); } catch (e) {}

    res.json({
      success: true,
      transcript,
      data: order,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}