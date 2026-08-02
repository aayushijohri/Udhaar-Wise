import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import * as aiService from "../services/aiService.js";
import * as ordersService from "../services/ordersService.js";
import * as inventoryService from "../services/inventoryService.js";
import { transcribeAudio } from '../services/whisperService.js';
import { createOrder } from '../services/ordersService.js';
import whatsappService from '../services/whatsappService.js';

// ---------------------------------------------------------------------------
// Shopkeeper resolver
// ---------------------------------------------------------------------------
// Uses the SHOPKEEPER_ID from environment configuration to ensure
// webhook orders are created under the same user as authenticated frontend requests.
let _cachedShopkeeper = null;

async function resolveShopkeeper() {
  if (_cachedShopkeeper) return _cachedShopkeeper;

  const shopkeeperId = config.shopkeeperId;
  if (!shopkeeperId) {
    throw new Error('SHOPKEEPER_ID environment variable is not set');
  }

  // Retrieve shopkeeper using the admin client to bypass Row-Level Security (RLS)
  const response = await supabaseAdmin
    .from('users')
    .select('id, phone_number, business_name')
    .eq('id', shopkeeperId)
    .single();

  logger.info('[resolveShopkeeper] Supabase query response:', {
    data: response.data,
    error: response.error
  });

  const { data, error } = response;

  if (error || !data) {
    throw new Error('Could not resolve shopkeeper: ' + (error?.message || 'no user found with SHOPKEEPER_ID'));
  }

  _cachedShopkeeper = data;
  return data;
}

// ---------------------------------------------------------------------------
// Customer find-or-create (by WhatsApp phone number)
// ---------------------------------------------------------------------------
async function findOrCreateCustomer(shopkeeperId, phone, name) {
  // Query without deleted_at check first. The unique constraint is on (shopkeeper_id, phone_number) 
  // unconditionally, so soft-deleted rows will still trigger constraint violations if we attempt new insert.
  const { data: existing } = await supabaseAdmin
    .from('customers')
    .select('id, name, phone_number, deleted_at')
    .eq('shopkeeper_id', shopkeeperId)
    .eq('phone_number', phone)
    .maybeSingle();

  if (existing) {
    if (existing.deleted_at !== null) {
      // Auto-restore the customer if they contact us again
      const { error: restoreErr } = await supabaseAdmin
        .from('customers')
        .update({ deleted_at: null, is_active: true })
        .eq('id', existing.id);
      if (restoreErr) {
        logger.error('[WhatsApp] Failed to restore soft-deleted customer: ' + restoreErr.message);
      }
    }
    return existing;
  }

  try {
    const { data: created, error } = await supabaseAdmin
      .from('customers')
      .insert([{
        shopkeeper_id: shopkeeperId,
        name: name || phone,
        phone_number: phone,
      }])
      .select('id, name, phone_number')
      .single();

    if (error) throw error;
    return created;
  } catch (insertErr) {
    // If a collision occurs (concurrent webhook triggers processing at exact same time),
    // perform a redundant lookup as fallback to avoid failing the pipeline.
    if (insertErr.code === '23505' || insertErr.message?.includes('unique constraint') || insertErr.message?.includes('duplicate key')) {
      const { data: refetched } = await supabaseAdmin
        .from('customers')
        .select('id, name, phone_number')
        .eq('shopkeeper_id', shopkeeperId)
        .eq('phone_number', phone)
        .maybeSingle();
      if (refetched) return refetched;
    }
    throw new Error('Failed to create customer: ' + insertErr.message);
  }
}

// ---------------------------------------------------------------------------
// Download WhatsApp media and save to a temp file
// ---------------------------------------------------------------------------
async function downloadMedia(mediaId) {
  // 1. Get the media URL from Meta
  const metaRes = await axios.get(
    `https://graph.facebook.com/${config.whatsapp.apiVersion}/${mediaId}`,
    { headers: { Authorization: `Bearer ${config.whatsapp.accessToken}` } }
  );
  const mediaUrl = metaRes.data?.url;
  if (!mediaUrl) throw new Error('No media URL returned for media id ' + mediaId);

  // 2. Download the file
  const fileRes = await axios.get(mediaUrl, {
    responseType: 'arraybuffer',
    headers: { Authorization: `Bearer ${config.whatsapp.accessToken}` },
  });

  const tmpFile = path.join(os.tmpdir(), `wa_audio_${mediaId}.ogg`);
  fs.writeFileSync(tmpFile, Buffer.from(fileRes.data));
  return tmpFile;
}

// ---------------------------------------------------------------------------
// Core message processing pipeline
// ---------------------------------------------------------------------------
async function processMessage(message, senderPhone, senderName) {
  const shopkeeper = await resolveShopkeeper();
  const shopkeeperId = shopkeeper.id;

  // 1. Find or create the customer
  const customer = await findOrCreateCustomer(shopkeeperId, senderPhone, senderName);

  // 2. Extract text content
  let text = null;

  if (message.type === 'text') {
    text = message.text?.body;
  } else if (message.type === 'audio') {
    // Download + transcribe via Whisper
    const mediaId = message.audio?.id;
    if (!mediaId) {
      logger.warn('[WhatsApp] Audio message missing media id');
      return;
    }
    const tmpPath = await downloadMedia(mediaId);
    try {
      text = await transcribeAudio(tmpPath);
      logger.info(`[WhatsApp] Transcribed audio from ${senderPhone}: "${text}"`);
    } finally {
      try { fs.unlinkSync(tmpPath); } catch (_) { /* best-effort cleanup */ }
    }
  } else {
    logger.info(`[WhatsApp] Skipping unsupported message type: ${message.type}`);
    return;
  }

  if (!text || text.trim().length === 0) {
    logger.info('[WhatsApp] Empty text after extraction, skipping.');
    return;
  }

  // 3. Detect intent using AI
  let intent;
  try {
    intent = await aiService.classifyMessage(text);
    logger.info(`[WhatsApp] Detected intent: ${intent} for message: "${text}"`);
  } catch (err) {
    logger.error('[WhatsApp] Intent detection failed: ' + err.message);
    intent = aiService.INTENTS.GENERAL_MESSAGE;
  }

  // 4. Process based on intent
  if (intent === aiService.INTENTS.NEW_ORDER) {
    // Parse the order via AI with fallback
    let parsed;
    try {
      parsed = await aiService.parseOrder(text);
    } catch (err) {
      logger.error('[WhatsApp] AI parsing failed: ' + err.message, err);
      await whatsappService.sendTextMessage(
        senderPhone,
        "Sorry, we could not understand your order. Please try again with a clear message like: '2 kg atta, 1 kg sugar'"
      );
      return;
    }

    // Validate parsed output — must have at least one item
    if (!Array.isArray(parsed?.items) || parsed.items.length === 0) {
      logger.warn('[WhatsApp] AI returned no items for message: ' + text);
      await whatsappService.sendTextMessage(
        senderPhone,
        "We received your message but could not identify any order items. Please list the items you want to order."
      );
      return;
    }

    // Map AI output to the shape createOrder() expects
    const orderItems = parsed.items.map((item) => ({
      item_name: item.product || 'Unknown Item',
      quantity: Number(item.quantity) || 1,
      unit: item.unit || 'pcs',
      unit_price: 0, // Will be calculated from total amount if provided
    }));

    // Use parsed amount if provided, otherwise null (not 0)
    const totalAmount = parsed.amount !== null && parsed.amount !== undefined ? Number(parsed.amount) : null;

    const orderPayload = {
      customer_id: customer.id,
      items: orderItems,
      total_amount: totalAmount,
      source: 'whatsapp',
      input_type: message.type === 'audio' ? 'voice' : 'text',
      order_status: 'pending',
      payment_status: 'unpaid',
      notes: parsed.notes || null,
    };

    // Create the order
    let order;
    try {
      order = await createOrder(shopkeeperId, shopkeeperId, orderPayload);
      logger.info(`[WhatsApp] Created order ${order.order_number} for customer ${customer.name} (${senderPhone})`);
    } catch (err) {
      logger.error('[WhatsApp] Order creation failed: ' + err.message, err);
      await whatsappService.sendTextMessage(
        senderPhone,
        "We received your order but there was an error saving it. Please contact the shop directly."
      );
      return;
    }

    // Send confirmation back to the customer
    const itemSummary = orderItems
      .map((i) => `• ${i.item_name} × ${i.quantity} ${i.unit}`)
      .join('\n');

    const confirmationMsg =
      `✅ Order received! (${order.order_number})\n\n` +
      `${itemSummary}\n\n` +
      (parsed.delivery_date ? `📅 Delivery: ${parsed.delivery_date}\n` : '') +
      `We'll confirm with you shortly.`;

    await whatsappService.sendTextMessage(senderPhone, confirmationMsg);

  } else if (intent === aiService.INTENTS.PAYMENT) {
    // Handle payment message
    const parsed = aiService.ruleBasedParse(text);
    const amount = parsed.amount;

    if (!amount) {
      await whatsappService.sendTextMessage(
        senderPhone,
        "Could not identify payment amount. Please specify like: 'Paid 500 rs'"
      );
      return;
    }

    // Find the latest unpaid order for this customer
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_id", customer.id)
      .eq("shopkeeper_id", shopkeeperId)
      .in("payment_status", ["unpaid", "partially_paid"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (!orders || orders.length === 0) {
      await whatsappService.sendTextMessage(
        senderPhone,
        "No pending orders found for payment. Thank you for your message!"
      );
      return;
    }

    const order = orders[0];
    const newPaid = Number(order.paid_amount) + amount;
    const totalAmount = Number(order.final_amount);
    const newPaymentStatus = newPaid >= totalAmount ? "fully_paid" : "partially_paid";

    try {
      await ordersService.updateOrder(shopkeeperId, order.id, {
        paid_amount: newPaid,
        payment_status: newPaymentStatus,
      });
      logger.info(`[WhatsApp] Payment of ₹${amount} recorded for order ${order.order_number}`);
      
      const msg = newPaid >= totalAmount
        ? `✅ Payment of ₹${amount} received. Order ${order.order_number} is now fully paid! Thank you!`
        : `✅ Payment of ₹${amount} received. Outstanding: ₹${totalAmount - newPaid}`;
      
      await whatsappService.sendTextMessage(senderPhone, msg);
    } catch (err) {
      logger.error('[WhatsApp] Payment update failed: ' + err.message);
      await whatsappService.sendTextMessage(
        senderPhone,
        "There was an error recording your payment. Please contact the shop."
      );
    }

  } else if (intent === aiService.INTENTS.INVENTORY_PURCHASE) {
    // Owner buying inventory - increase stock
    const parsed = aiService.ruleBasedParse(text);
    
    if (parsed.items.length === 0) {
      await whatsappService.sendTextMessage(
        senderPhone,
        "Could not identify inventory items. Please specify like: 'Bought 20 kg atta'"
      );
      return;
    }

    for (const item of parsed.items) {
      try {
        // Find existing inventory item
        const { data: existing } = await supabase
          .from("inventory")
          .select("*")
          .eq("shopkeeper_id", shopkeeperId)
          .ilike("item_name", item.product)
          .maybeSingle();

        if (existing) {
          // Restock existing item
          await inventoryService.restockInventory(shopkeeperId, existing.id, {
            quantity: item.quantity,
          });
          logger.info(`[WhatsApp] Restocked ${item.product} by ${item.quantity} ${item.unit}`);
        } else {
          // Create new inventory item
          await inventoryService.createInventory(shopkeeperId, {
            item_name: item.product,
            unit_price: 0,
            quantity_in_stock: item.quantity,
            min_stock_threshold: 5,
          });
          logger.info(`[WhatsApp] Created inventory item ${item.product} with ${item.quantity} ${item.unit}`);
        }
      } catch (err) {
        logger.error(`[WhatsApp] Inventory update failed for ${item.product}:`, err.message);
      }
    }

    await whatsappService.sendTextMessage(
      senderPhone,
      `✅ Inventory updated: ${parsed.items.map(i => `${i.product} +${i.quantity}`).join(', ')}`
    );

  } else if (intent === aiService.INTENTS.ORDER_STATUS) {
    // Customer asking about order status
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_id", customer.id)
      .eq("shopkeeper_id", shopkeeperId)
      .order("created_at", { ascending: false })
      .limit(3);

    if (!orders || orders.length === 0) {
      await whatsappService.sendTextMessage(
        senderPhone,
        "No orders found for your account."
      );
      return;
    }

    const statusMsg = orders
      .map((o) => `• ${o.order_number}: ${o.order_status || 'pending'} (₹${o.final_amount})`)
      .join('\n');

    await whatsappService.sendTextMessage(
      senderPhone,
      `📋 Your recent orders:\n\n${statusMsg}`
    );

  } else {
    // General message
    await whatsappService.sendTextMessage(
      senderPhone,
      "Thanks for your message! For orders, please specify items like: '2 kg atta, 1 kg sugar'. For payments, use: 'Paid 500 rs'."
    );
  }
}

// ---------------------------------------------------------------------------
// Public controllers
// ---------------------------------------------------------------------------

/**
 * Verification GET endpoint for Meta Developer Application Configuration.
 */
export const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  logger.info('Incoming webhook verification request received', { mode, token });

  if (mode && token) {
    if (mode === 'subscribe' && token === config.whatsapp.webhookVerifyToken) {
      logger.info('Webhook verification successful. Returning challenge code.');
      return res.status(200).send(challenge);
    } else {
      logger.warn('Webhook verification token mismatch', {
        received: token,
        expected: config.whatsapp.webhookVerifyToken,
      });
      return res.sendStatus(403);
    }
  }

  logger.warn('Webhook verification parameters are missing');
  return res.sendStatus(400);
};

/**
 * POST endpoint for receiving real-time events from Meta WhatsApp Cloud API.
 * Returns 200 immediately, then processes messages asynchronously.
 */
export const receiveWebhook = (req, res) => {
  const { body } = req;

  // Meta expects a 200 immediately to avoid retries
  res.status(200).json({ status: 'success' });

  // Process asynchronously
  (async () => {
    try {
      if (body.object !== 'whatsapp_business_account') {
        logger.warn('Incoming webhook object is not whatsapp_business_account', { object: body.object });
        return;
      }

      logger.info('Received WhatsApp Webhook Payload', { entriesCount: body.entry?.length });

      for (const entry of (body.entry || [])) {
        for (const change of (entry.changes || [])) {
          const { value } = change;
          if (!value) continue;

          // Process message status updates (sent, delivered, read, failed) — log only
          for (const status of (value.statuses || [])) {
            logger.info(
              `Message status transition: ID ${status.id} is now [${status.status}] for recipient ${status.recipient_id}`,
              { timestamp: status.timestamp, error: status.errors?.[0] || null }
            );
          }

          // Process incoming messages
          for (const message of (value.messages || [])) {
            const contact = value.contacts?.find((c) => c.wa_id === message.from);
            const senderName = contact?.profile?.name || null;
            const senderPhone = message.from;

            logger.info(`New Message from ${senderName || senderPhone} (${senderPhone})`, {
              messageId: message.id,
              type: message.type,
              textBody: message.text?.body || '[No Text Body]',
            });

            // Fire-and-forget with error boundary per message
            processMessage(message, senderPhone, senderName).catch((err) => {
              logger.error(
                `[WhatsApp] Unhandled error processing message from ${senderPhone}: ${err.message}`,
                err
              );
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error occurred in receiveWebhook processing pipeline', error);
    }
  })();
};
