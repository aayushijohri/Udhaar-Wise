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
import * as paymentClaimsService from "../services/paymentClaimsService.js";
import { transcribeAudio } from '../services/whisperService.js';
import { createOrder } from '../services/ordersService.js';
import whatsappService from '../services/whatsappService.js';

// ---------------------------------------------------------------------------
// Duplicate-message protection (in-memory set, clears on restart)
// ---------------------------------------------------------------------------
const _processedMessageIds = new Set();
function isDuplicateMessage(messageId) {
  if (_processedMessageIds.has(messageId)) return true;
  _processedMessageIds.add(messageId);
  if (_processedMessageIds.size > 5000) {
    const toDelete = [..._processedMessageIds].slice(0, 1000);
    toDelete.forEach((id) => _processedMessageIds.delete(id));
  }
  return false;
}

// ---------------------------------------------------------------------------
// Shopkeeper resolver (cached)
// ---------------------------------------------------------------------------
let _cachedShopkeeper = null;
async function resolveShopkeeper() {
  if (_cachedShopkeeper) return _cachedShopkeeper;
  const shopkeeperId = process.env.SHOPKEEPER_ID;
  if (!shopkeeperId) throw new Error('SHOPKEEPER_ID environment variable is not set');
  const { data, error } = await supabaseAdmin
    .from('users').select('id, phone_number, business_name').eq('id', shopkeeperId).single();
  if (error || !data) throw new Error('Could not resolve shopkeeper: ' + (error?.message || 'not found'));
  _cachedShopkeeper = data;
  return data;
}

// ---------------------------------------------------------------------------
// Customer find-or-create
// ---------------------------------------------------------------------------
async function findOrCreateCustomer(shopkeeperId, phone, name) {
  const { data: existing } = await supabaseAdmin
    .from('customers').select('id, name, phone_number, deleted_at')
    .eq('shopkeeper_id', shopkeeperId).eq('phone_number', phone).maybeSingle();

  if (existing) {
    if (existing.deleted_at !== null) {
      await supabaseAdmin.from('customers').update({ deleted_at: null, is_active: true }).eq('id', existing.id);
    }
    return existing;
  }

  try {
    const { data: created, error } = await supabaseAdmin
      .from('customers')
      .insert([{ shopkeeper_id: shopkeeperId, name: name || phone, phone_number: phone }])
      .select('id, name, phone_number').single();
    if (error) throw error;
    return created;
  } catch (insertErr) {
    if (insertErr.code === '23505' || insertErr.message?.includes('unique constraint') || insertErr.message?.includes('duplicate key')) {
      const { data: refetched } = await supabaseAdmin
        .from('customers').select('id, name, phone_number')
        .eq('shopkeeper_id', shopkeeperId).eq('phone_number', phone).maybeSingle();
      if (refetched) return refetched;
    }
    throw new Error('Failed to create customer: ' + insertErr.message);
  }
}

// Resolve a customer by parsed name. If a single good match exists, return it.
// If none, create a new customer using the sender phone when available.
async function resolveCustomerByName(shopkeeperId, parsedName, senderPhone) {
  if (!parsedName || !parsedName.trim()) return null;
  const trimmed = parsedName.trim();

  // Try exact case-insensitive match first
  const { data: exact } = await supabaseAdmin
    .from('customers')
    .select('id, name, phone_number')
    .eq('shopkeeper_id', shopkeeperId)
    .ilike('name', trimmed)
    .maybeSingle();
  if (exact) return exact;

  // Try prefix / contains matches
  const { data: candidates } = await supabaseAdmin
    .from('customers')
    .select('id, name, phone_number')
    .eq('shopkeeper_id', shopkeeperId)
    .ilike('name', `%${trimmed}%`);

  if (candidates && candidates.length === 1) return candidates[0];
  if (candidates && candidates.length > 1) {
    // Prefer exact start-with match
    const start = candidates.find(c => c.name.toLowerCase().startsWith(trimmed.toLowerCase()));
    if (start) return start;
    // Prefer candidate whose phone matches senderPhone
    if (senderPhone) {
      const byPhone = candidates.find(c => c.phone_number === senderPhone);
      if (byPhone) return byPhone;
    }
    // Ambiguous — let caller decide (do not auto-create)
    return { multiple: true, candidates };
  }

  // No candidate — create a new customer record, attaching senderPhone if available
  try {
    const insert = { shopkeeper_id: shopkeeperId, name: trimmed };
    if (senderPhone) insert.phone_number = senderPhone;
    const { data: created, error } = await supabaseAdmin
      .from('customers')
      .insert([insert])
      .select('id, name, phone_number')
      .single();
    if (error) throw error;
    return created;
  } catch (err) {
    console.warn('[WhatsApp] resolveCustomerByName create failed:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Download WhatsApp media to temp file
// ---------------------------------------------------------------------------
async function downloadMedia(mediaId, ext = 'ogg') {
  const metaRes = await axios.get(
    `https://graph.facebook.com/${config.whatsapp.apiVersion}/${mediaId}`,
    { headers: { Authorization: `Bearer ${config.whatsapp.accessToken}` } }
  );
  const mediaUrl = metaRes.data?.url;
  if (!mediaUrl) throw new Error('No media URL returned for media id ' + mediaId);
  const fileRes = await axios.get(mediaUrl, {
    responseType: 'arraybuffer',
    headers: { Authorization: `Bearer ${config.whatsapp.accessToken}` },
  });
  const tmpFile = path.join(os.tmpdir(), `wa_media_${mediaId}.${ext}`);
  fs.writeFileSync(tmpFile, Buffer.from(fileRes.data));
  return tmpFile;
}

// ---------------------------------------------------------------------------
// Fuzzy inventory lookup
// Tries: exact → case-insensitive → word-level → word-fragment
// ---------------------------------------------------------------------------
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  }
  return dp[m][n];
}

async function fuzzyFindInventoryItem(shopkeeperId, productName) {
  const normalised = productName.toLowerCase().replace(/\s+/g, ' ').trim();

  // Fetch all active inventory items for this shopkeeper
  const { data: allItems } = await supabaseAdmin
    .from('inventory')
    .select('id, item_name, unit_price, quantity_in_stock, is_active')
    .eq('shopkeeper_id', shopkeeperId)
    .eq('is_active', true);

  if (!allItems || allItems.length === 0) return { match: null, suggestions: [] };

  // Score each item
  const scored = allItems.map((item) => {
    const itemNorm = item.item_name.toLowerCase().trim();
    const dist = levenshtein(normalised, itemNorm);
    const maxLen = Math.max(normalised.length, itemNorm.length);
    const similarity = 1 - dist / maxLen; // 0–1, higher = better

    // Also check if all words in the query appear in the item name
    const queryWords = normalised.split(/\s+/);
    const wordCoverage = queryWords.filter((w) => itemNorm.includes(w)).length / queryWords.length;

    // Weighted score
    const score = similarity * 0.6 + wordCoverage * 0.4;
    return { item, score, similarity };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  // High-confidence: score ≥ 0.7 → auto-match
  if (best.score >= 0.70) return { match: best.item, suggestions: [] };

  // Medium-confidence: score 0.5–0.7 → no auto-match but suggest
  const suggestions = scored
    .filter((s) => s.score >= 0.40)
    .slice(0, 3)
    .map((s) => s.item.item_name);

  return { match: null, suggestions };
}

// ---------------------------------------------------------------------------
// Format currency
// ---------------------------------------------------------------------------
function fmt(n) { return `₹${Number(n).toLocaleString('en-IN')}`; }

// ---------------------------------------------------------------------------
// OWNER FLOW ORCHESTRATOR
// ---------------------------------------------------------------------------
async function handleOwnerFlow(text, shopkeeperId, senderPhone) {
  logger.info(`[OwnerFlow] Processing owner text: "${text}"`);

  // ── FAST-PATH: Price command detection (before AI, instant) ──────────────
  // Patterns: "Set price of X to N" | "Update X Price N" | "X costs N" | "X price N"
  {
    let pm = null;
    if (!pm) pm = text.match(/set\s+price\s+of\s+(.+?)\s+to\s+(\d+(?:\.\d+)?)/i);
    if (!pm) pm = text.match(/update\s+(.+?)\s+price\s+(\d+(?:\.\d+)?)/i);
    if (!pm) pm = text.match(/^(.+?)\s+costs\s+(\d+(?:\.\d+)?)\s*$/i);
    if (!pm && !/order|paid|receive|restock|add/i.test(text))
      pm = text.match(/^(.+?)\s+price\s+(\d+(?:\.\d+)?)\s*$/i);

    if (pm) {
      const pName = pm[1].trim();
      const pPrice = Number(pm[2]);
      const { match: pMatch } = await fuzzyFindInventoryItem(shopkeeperId, pName);
      if (!pMatch) {
        await whatsappService.sendTextMessage(senderPhone, `❌ Product "${pName}" not found. Please check the name.`);
      } else {
        await inventoryService.updateInventory(shopkeeperId, pMatch.id, { unit_price: pPrice });
        await whatsappService.sendTextMessage(senderPhone, `✅ Price updated!\n\n*${pMatch.item_name}*: ${fmt(pPrice)}`);
      }
      return true;
    }
  }

  // ── FAST-PATH: Bare "Price NNN" → update most-recently created item ───────
  {
    const priceOnly = text.match(/^price\s+(\d+(?:\.\d+)?)(?:\s+per\s+\w+)?\s*$/i);
    if (priceOnly) {
      const amount = Number(priceOnly[1]);
      const { data: recent } = await supabaseAdmin
        .from('inventory').select('id, item_name, sku')
        .eq('shopkeeper_id', shopkeeperId)
        .order('created_at', { ascending: false }).limit(1);
      if (recent && recent.length > 0) {
        await inventoryService.updateInventory(shopkeeperId, recent[0].id, { unit_price: amount });
        await whatsappService.sendTextMessage(senderPhone,
          `✅ Price set for *${recent[0].item_name}* → ${fmt(amount)}`);
      } else {
        await whatsappService.sendTextMessage(senderPhone, `❌ No items found. Add a product first.`);
      }
      return true;
    }
  }

  // ── FAST-PATH: Customer-specific outstanding ("Ram pending" / "Ram outstanding") ──
  {
    const custOutstanding = text.match(/^(?:customer\s+)?(.+?)\s+(?:pending|outstanding|dues?|balance)\s*$/i);
    if (custOutstanding) {
      const possibleName = custOutstanding[1].trim();
      const { data: allCusts } = await supabaseAdmin
        .from('customers').select('id, name, current_balance')
        .eq('shopkeeper_id', shopkeeperId).eq('is_active', true);
      const lower = possibleName.toLowerCase();
      const found = (allCusts || []).find(c =>
        c.name.toLowerCase() === lower ||
        c.name.toLowerCase().startsWith(lower) ||
        lower.startsWith(c.name.toLowerCase())
      );
      if (found) {
        const bal = Number(found.current_balance || 0);
        const msg = bal < 0
          ? `💰 *${found.name}* owes you *${fmt(Math.abs(bal))}*`
          : bal > 0
            ? `✅ *${found.name}* has an advance of *${fmt(bal)}*`
            : `✅ *${found.name}* has no pending balance.`;
        await whatsappService.sendTextMessage(senderPhone, msg);
        return true;
      }
    }
  }

  // 1. Call AI parsing
  let result = { action: "general" };
  try {
    result = await aiService.parseOwnerMessage(text);
  } catch (err) {
    logger.error(`[OwnerFlow] AI parse error: ${err.message}`);
  }
  logger.info(`[OwnerFlow] AI parse outcome:`, result);

  const RAW_KEYWORDS = ["raw material", "ingredient", "flour", "atta", "sugar", "butter", "milk", "eggs", "cream", "cocoa", "chocolate", "oil"];

  async function findExactOrUniqueCustomer(shopkeeperId, rawName, senderPhone) {
    const trimmed = rawName.trim();
    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select("id, name, current_balance, phone_number")
      .eq("shopkeeper_id", shopkeeperId)
      .eq("is_active", true);

    if (!existing || existing.length === 0) return { customer: null };

    const lower = trimmed.toLowerCase();
    // 1. Exact case-insensitive match
    const exactMatches = existing.filter(c => c.name.toLowerCase() === lower);
    if (exactMatches.length === 1) {
      return { customer: exactMatches[0] };
    }

    // 2. Case-insensitive prefix match (e.g. "Diya" matching "Diya Patel")
    const prefixMatches = existing.filter(c => c.name.toLowerCase().startsWith(lower) || lower.startsWith(c.name.toLowerCase()));
    if (prefixMatches.length === 1) {
      return { customer: prefixMatches[0] };
    }

    if (prefixMatches.length > 1) {
      let msg = `❓ Multiple customers found matching "${trimmed}":\n\n`;
      prefixMatches.forEach((c, idx) => {
        msg += `${idx + 1}. *${c.name}* (Phone: ${c.phone_number})\n`;
      });
      msg += `\nPlease specify full customer name or phone number.`;
      await whatsappService.sendTextMessage(senderPhone, msg);
      return { multiple: true };
    }

    return { customer: null };
  }

  if (result.action === "create_order") {
    const trimmedCustName = result.customer_name?.trim();
    if (!trimmedCustName) {
      await whatsappService.sendTextMessage(senderPhone, "❌ Please specify a customer name.");
      return true;
    }

    const { customer: matchedCust, multiple } = await findExactOrUniqueCustomer(shopkeeperId, trimmedCustName, senderPhone);
    if (multiple) return true;

    let customer = matchedCust;
    if (!customer) {
      const digits = String(Math.floor(1000000000 + Math.random() * 9000000000));
      const { data: created, error } = await supabaseAdmin
        .from("customers")
        .insert([{
          shopkeeper_id: shopkeeperId,
          name: trimmedCustName,
          phone_number: digits
        }])
        .select()
        .single();
      if (error) throw error;
      customer = created;
    }

    if (result.metadata) {
      await paymentClaimsService.saveExplicitMemory(shopkeeperId, customer.id, {
        special_events: result.metadata.special_events,
        preferences: result.metadata.preferences,
        preferred_payment_mode: result.metadata.preferred_payment_mode
      });
    }

    const resolvedItems = [];
    let orderTotal = 0;
    for (const item of result.items || []) {
      const { match } = await fuzzyFindInventoryItem(shopkeeperId, item.product);
      let invItem = match;
      if (!invItem) {
        const { data: newInv } = await supabaseAdmin
          .from("inventory")
          .insert([{
            shopkeeper_id: shopkeeperId,
            item_name: item.product,
            unit_price: 0,
            quantity_in_stock: 0,
            sku: "product",
            is_active: true
          }])
          .select()
          .single();
        invItem = newInv;
      }
      const qty = Number(item.quantity) || 1;
      const price = Number(invItem.unit_price) || 0;
      resolvedItems.push({
        item_name: invItem.item_name,
        inventory_id: invItem.id,
        quantity: qty,
        unit: "units",
        unit_price: price
      });
      orderTotal += qty * price;
    }

    const orderPayload = {
      customer_id: customer.id,
      items: resolvedItems,
      total_amount: orderTotal,
      source: "whatsapp",
      input_type: "text",
      payment_status: "unpaid",
      notes: text
    };

    // Create order then IMMEDIATELY accept (owner is trusted — no approval needed)
    const order = await createOrder(shopkeeperId, shopkeeperId, orderPayload);
    let acceptedOrder = order;
    try {
      acceptedOrder = await ordersService.acceptOrder(shopkeeperId, order.id, true);
    } catch (accErr) {
      logger.warn(`[OwnerFlow] Auto-accept warning: ${accErr.message}`);
    }

    // Refresh customer balance after ledger update
    const { data: updatedCust } = await supabaseAdmin
      .from('customers').select('current_balance').eq('id', customer.id).single();
    const outstanding = Number(updatedCust?.current_balance || 0);
    const outstandingStr = outstanding < 0
      ? `Outstanding: *${fmt(Math.abs(outstanding))} due*`
      : outstanding > 0
        ? `Advance: *${fmt(outstanding)}*`
        : `Balance: ✅ Clear`;

    let reply = `✅ *Order Created*\n\n`;
    reply += `Customer: *${customer.name}*\n\n`;
    reply += `Items:\n`;
    resolvedItems.forEach(i => { reply += `• ${i.item_name} ×${i.quantity}\n`; });
    reply += `\nStatus: *Accepted* ✅\n`;
    if (orderTotal > 0) reply += `Total: *${fmt(orderTotal)}*\n`;
    reply += `${outstandingStr}`;

    if (result.metadata) {
      reply += `\n\n🧠 Memory Saved:`;
      if (result.metadata.special_events) reply += `\n• ${result.metadata.special_events}`;
      if (result.metadata.preferences) reply += `\n• ${result.metadata.preferences}`;
      if (result.metadata.preferred_payment_mode) reply += `\n• Pay via: ${result.metadata.preferred_payment_mode}`;
    }

    await whatsappService.sendTextMessage(senderPhone, reply);

    const customerConfirmationLines = [
      `✅ *Order confirmed*`,
      ``,
      `Customer: *${customer.name}*`,
      ``,
      `Items:`
    ];
    resolvedItems.forEach(i => { customerConfirmationLines.push(`• ${i.item_name} ×${i.quantity}`); });
    if (orderTotal > 0) customerConfirmationLines.push(``, `💰 Total: *${fmt(orderTotal)}*`);
    customerConfirmationLines.push(``, `Status: *Accepted* ✅`);
    if (customer.phone_number) {
      try {
        await whatsappService.sendTextMessage(customer.phone_number, customerConfirmationLines.join('\n'));
      } catch (custErr) {
        logger.warn(`[OwnerFlow] Customer confirmation failed: ${custErr.message}`);
      }
    }
    return true;
  }

  if (result.action === "record_payment") {
    const trimmedCustName = result.customer_name?.trim();
    if (!trimmedCustName) {
      await whatsappService.sendTextMessage(senderPhone, "❌ Please specify a customer name for the payment.");
      return true;
    }

    const { customer: matchedCust, multiple } = await findExactOrUniqueCustomer(shopkeeperId, trimmedCustName, senderPhone);
    if (multiple) return true;

    let customer = matchedCust;
    if (!customer) {
      const digits = String(Math.floor(1000000000 + Math.random() * 9000000000));
      const { data: created } = await supabaseAdmin
        .from("customers")
        .insert([{ shopkeeper_id: shopkeeperId, name: trimmedCustName, phone_number: digits }])
        .select()
        .single();
      customer = created;
    }

    const mode = result.payment_mode || "cash";
    await paymentClaimsService.recordDirectPayment(shopkeeperId, customer.id, result.amount, mode, text);

    const { data: refetchedCust } = await supabaseAdmin
      .from("customers")
      .select("current_balance")
      .eq("id", customer.id)
      .single();

    const newBal = Number(refetchedCust?.current_balance || 0);
    const balMsg = newBal < 0
      ? `Outstanding: *${fmt(Math.abs(newBal))} still due*`
      : newBal > 0
        ? `They have an advance of *${fmt(newBal)}*`
        : `Balance: ✅ Fully cleared!`;

    await whatsappService.sendTextMessage(senderPhone,
      `✅ *Payment Recorded*\n\nCustomer: *${customer.name}*\nAmount: *${fmt(result.amount)}* (${mode.toUpperCase()})\n\n${balMsg}`);
    return true;
  }

  if (result.action === "restock") {
    const textLower = text.toLowerCase();
    const prodLower = (result.product_name || "").toLowerCase();
    const isRaw = result.is_raw_material ||
      RAW_KEYWORDS.some(k => textLower.includes(k) || prodLower.includes(k)) ||
      (result.unit && /kg|g|gm|litre|l|ml/i.test(result.unit));

    const { match } = await fuzzyFindInventoryItem(shopkeeperId, result.product_name);
    if (match) {
      const res = await inventoryService.restockInventory(shopkeeperId, match.id, { quantity: result.quantity });
      if (isRaw && match.sku !== "raw_material") {
        await inventoryService.updateInventory(shopkeeperId, match.id, { sku: "raw_material" });
      }
      await whatsappService.sendTextMessage(senderPhone,
        `✅ Restocked ${isRaw ? "Raw Material" : "Product"} *${match.item_name}*\n${res.previous_quantity} → ${res.item?.quantity_in_stock} ${result.unit || 'units'}`);
    } else {
      const created = await inventoryService.createInventory(shopkeeperId, {
        item_name: result.product_name,
        unit_price: 0,
        quantity_in_stock: result.quantity,
        sku: isRaw ? "raw_material" : "product",
        description: isRaw ? JSON.stringify({ unit: result.unit || "kg" }) : null
      });
      await whatsappService.sendTextMessage(senderPhone,
        `✅ Created and stocked ${isRaw ? "Raw Material 🌾" : "Product 🛍️"} *${created.item_name}*: ${created.quantity_in_stock} ${result.unit || 'units'}`);
    }
    return true;
  }

  if (result.action === "add_product") {
    const textLower = text.toLowerCase();
    const prodLower = (result.product_name || "").toLowerCase();
    const isRaw = result.is_raw_material ||
      RAW_KEYWORDS.some(k => textLower.includes(k) || prodLower.includes(k));

    if (isRaw) {
      // Owner intended raw material creation!
      const created = await inventoryService.createInventory(shopkeeperId, {
        item_name: result.product_name,
        unit_price: 0,
        quantity_in_stock: 0,
        sku: "raw_material"
      });
      await whatsappService.sendTextMessage(senderPhone,
        `✅ Created new Raw Material 🌾 *${created.item_name}* (Stock: 0). Use restock command to add stock.`);
      return true;
    }

    const created = await inventoryService.createInventory(shopkeeperId, {
      item_name: result.product_name,
      unit_price: 0,
      quantity_in_stock: 0,
      sku: "product"
    });
    await whatsappService.sendTextMessage(senderPhone,
      `✅ Created sellable product 🛍️ *${created.item_name}* with price ₹0.\n\nWould you like to add ingredients? Send recipe like:\n\n*Recipe for ${created.item_name}: 200g flour, 100g sugar, 2 eggs*`);
    return true;
  }

  if (result.action === "update_product_price") {
    const { match } = await fuzzyFindInventoryItem(shopkeeperId, result.product_name);
    if (!match) {
      await whatsappService.sendTextMessage(senderPhone, `❌ Product "${result.product_name}" not found.`);
    } else {
      await inventoryService.updateInventory(shopkeeperId, match.id, { unit_price: result.price });
      await whatsappService.sendTextMessage(senderPhone, `✅ Price updated!\n\n*${match.item_name}*: ${fmt(result.price)}`);
    }
    return true;
  }

  if (result.action === "delete_product") {
    const { match } = await fuzzyFindInventoryItem(shopkeeperId, result.product_name);
    if (!match) {
      await whatsappService.sendTextMessage(senderPhone, `❌ Product "${result.product_name}" not found.`);
    } else {
      await inventoryService.deleteInventory(shopkeeperId, match.id);
      await whatsappService.sendTextMessage(senderPhone, `✅ Soft deleted product: *${match.item_name}*`);
    }
    return true;
  }

  if (result.action === "get_report") {
    const type = result.report_type;
    if (type === "low_stock") {
      const { data } = await supabaseAdmin.from('inventory').select('item_name, quantity_in_stock, min_stock_threshold').eq('shopkeeper_id', shopkeeperId).eq('is_active', true);
      const low = (data || []).filter(i => i.quantity_in_stock <= (i.min_stock_threshold ?? 5));
      if (low.length === 0) {
        await whatsappService.sendTextMessage(senderPhone, `✅ All inventory items are well-stocked.`);
      } else {
        const msg = `⚠️ *Low Stock Report*:\n` + low.map(i => `• ${i.item_name}: *${i.quantity_in_stock}* left (alert <= ${i.min_stock_threshold})`).join('\n');
        await whatsappService.sendTextMessage(senderPhone, msg);
      }
      return true;
    }

    if (type === "today_sales" || type === "today_revenue") {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const { data } = await supabaseAdmin.from('orders').select('final_amount, paid_amount').eq('shopkeeper_id', shopkeeperId).gte('created_at', todayStart.toISOString());
      const totalCol = (data || []).reduce((sum, o) => sum + Number(o.paid_amount || 0), 0);
      const totalBilled = (data || []).reduce((sum, o) => sum + Number(o.final_amount || 0), 0);
      const count = (data || []).length;
      await whatsappService.sendTextMessage(senderPhone,
        `📊 *Today's Revenue Report*\n\nOrders Placed: ${count}\nTotal Collection (Received): *${fmt(totalCol)}*\nTotal Value Sold: *${fmt(totalBilled)}*`);
      return true;
    }

    if (type === "pending_dues" || type === "pending_money" || type === "outstanding") {
      const { data: allCusts } = await supabaseAdmin
        .from('customers').select('name, current_balance')
        .eq('shopkeeper_id', shopkeeperId).eq('is_active', true);
      const debtors = (allCusts || []).filter(c => Number(c.current_balance) < 0)
        .sort((a, b) => Number(a.current_balance) - Number(b.current_balance));
      const dues = debtors.reduce((sum, c) => sum + Math.abs(Number(c.current_balance)), 0);
      if (dues === 0) {
        await whatsappService.sendTextMessage(senderPhone, `✅ No pending dues. All customers are clear.`);
      } else {
        let msg = `💰 *Pending Udhaar Summary*\n\nTotal Outstanding: *${fmt(dues)}*\n\nTop Debtors:\n`;
        msg += debtors.slice(0, 8).map((c, i) => `${i + 1}. *${c.name}*: ${fmt(Math.abs(Number(c.current_balance)))}`).join('\n');
        await whatsappService.sendTextMessage(senderPhone, msg);
      }
      return true;
    }

    if (type === "who_owes_me") {
      const { data } = await supabaseAdmin.from('customers').select('name, current_balance').eq('shopkeeper_id', shopkeeperId).eq('is_active', true);
      const debtors = (data || []).filter(c => c.current_balance < 0).sort((a, b) => Number(a.current_balance) - Number(b.current_balance));
      if (debtors.length === 0) {
        await whatsappService.sendTextMessage(senderPhone, `✅ Nobody owes you money at the moment.`);
      } else {
        const msg = `👥 *Outstanding Customer Balances (Who Owes Me)*\n\n` + debtors.map((c, idx) => `${idx + 1}. *${c.name}*: owes *${fmt(Math.abs(c.current_balance))}*`).join('\n');
        await whatsappService.sendTextMessage(senderPhone, msg);
      }
      return true;
    }

    if (type === "best_customer") {
      const { data } = await supabaseAdmin.from('customers').select('name, orders(final_amount)').eq('shopkeeper_id', shopkeeperId).eq('is_active', true);
      const withSpend = (data || []).map((c) => ({
        name: c.name,
        spend: (c.orders || []).reduce((s, o) => s + Number(o.final_amount || 0), 0),
        ordersCount: (c.orders || []).length
      })).sort((a, b) => b.spend - a.spend);

      if (withSpend.length === 0 || withSpend[0].spend === 0) {
        await whatsappService.sendTextMessage(senderPhone, `No customer order history found.`);
      } else {
        const best = withSpend[0];
        await whatsappService.sendTextMessage(senderPhone, `🏆 *Best Customer*\n\n🥇 *${best.name}* is your top customer.\n• Total Spending: *${fmt(best.spend)}*\n• Total Orders: *${best.ordersCount}*`);
      }
      return true;
    }

    if (type === "inactive_customers") {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { data } = await supabaseAdmin.from('customers').select('name, orders(created_at)').eq('shopkeeper_id', shopkeeperId).eq('is_active', true);
      const inactive = (data || []).filter((c) => {
        if (!c.orders || c.orders.length === 0) return true;
        const lastOrder = Math.max(...c.orders.map(o => new Date(o.created_at).getTime()));
        return lastOrder < thirtyDaysAgo.getTime();
      });

      if (inactive.length === 0) {
        await whatsappService.sendTextMessage(senderPhone, `✅ Every customer has placed orders in the last 30 days.`);
      } else {
        const msg = `💤 *Inactive Customers (No orders in 30 days)*\n\n` + inactive.slice(0, 10).map((c) => `• *${c.name}*`).join('\n');
        await whatsappService.sendTextMessage(senderPhone, msg);
      }
      return true;
    }

    if (type === "top_products") {
      const { data } = await supabaseAdmin.from('orders').select('order_items(quantity, inventory(item_name))').eq('shopkeeper_id', shopkeeperId);
      const counts = {};
      (data || []).forEach(o => {
        (o.order_items || []).forEach(oi => {
          const name = oi.inventory?.item_name || "Unknown item";
          counts[name] = (counts[name] || 0) + (oi.quantity || 0);
        });
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (top.length === 0) {
        await whatsappService.sendTextMessage(senderPhone, `No products sold yet.`);
      } else {
        const msg = `🛍️ *Top Selling Products*:\n\n` + top.map((p, i) => `${i + 1}. *${p[0]}*: ${p[1]} units sold`).join('\n');
        await whatsappService.sendTextMessage(senderPhone, msg);
      }
      return true;
    }

    if (type === "inventory_value") {
      const { data } = await supabaseAdmin.from('inventory').select('quantity_in_stock, unit_price, cost_price').eq('shopkeeper_id', shopkeeperId).eq('is_active', true);
      const totalVal = (data || []).reduce((sum, item) => sum + (Number(item.quantity_in_stock || 0) * Number(item.cost_price || item.unit_price || 0)), 0);
      await whatsappService.sendTextMessage(senderPhone, `📦 *Total Inventory Valuation* (by cost/selling price):\n\nYour current stock is valued at *${fmt(totalVal)}*`);
      return true;
    }

    if (type === "today_orders") {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const { data } = await supabaseAdmin.from('orders').select('id, total_amount, order_status, customers(name)').eq('shopkeeper_id', shopkeeperId).gte('created_at', todayStart.toISOString());
      if (!data || data.length === 0) {
        await whatsappService.sendTextMessage(senderPhone, `📭 No orders received today.`);
      } else {
        const msg = `📋 *Today's Orders* (${data.length})\n\n` + data.map(o => `• ORD-${o.id.slice(0, 8).toUpperCase()}: *${o.customers?.name || "Cash Customer"}* — ${fmt(o.total_amount)} status: *${o.order_status}*`).join('\n');
        await whatsappService.sendTextMessage(senderPhone, msg);
      }
      return true;
    }

    if (type === "weekly_revenue" || type === "weekly_sales") {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabaseAdmin.from('orders').select('final_amount, paid_amount').eq('shopkeeper_id', shopkeeperId).gte('created_at', weekAgo);
      const billed = (data || []).reduce((s, o) => s + Number(o.final_amount || 0), 0);
      const collected = (data || []).reduce((s, o) => s + Number(o.paid_amount || 0), 0);
      await whatsappService.sendTextMessage(senderPhone,
        `📊 *Weekly Revenue (Last 7 Days)*\n\nOrders: ${(data || []).length}\nTotal Value Sold: *${fmt(billed)}*\nTotal Collected: *${fmt(collected)}*`);
      return true;
    }

    if (type === "monthly_revenue" || type === "monthly_sales") {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data } = await supabaseAdmin.from('orders').select('final_amount, paid_amount').eq('shopkeeper_id', shopkeeperId).gte('created_at', monthStart);
      const billed = (data || []).reduce((s, o) => s + Number(o.final_amount || 0), 0);
      const collected = (data || []).reduce((s, o) => s + Number(o.paid_amount || 0), 0);
      const monthName = now.toLocaleString('en-IN', { month: 'long' });
      await whatsappService.sendTextMessage(senderPhone,
        `📊 *${monthName} Revenue*\n\nOrders: ${(data || []).length}\nTotal Value Sold: *${fmt(billed)}*\nTotal Collected: *${fmt(collected)}*\nOutstanding This Month: *${fmt(billed - collected)}*`);
      return true;
    }

    if (type === "total_sales" || type === "lifetime_sales") {
      const { data } = await supabaseAdmin.from('orders').select('final_amount, paid_amount').eq('shopkeeper_id', shopkeeperId);
      const billed = (data || []).reduce((s, o) => s + Number(o.final_amount || 0), 0);
      const collected = (data || []).reduce((s, o) => s + Number(o.paid_amount || 0), 0);
      await whatsappService.sendTextMessage(senderPhone,
        `📊 *Lifetime Sales Summary*\n\nTotal Orders: ${(data || []).length}\nTotal Value Sold: *${fmt(billed)}*\nTotal Collected: *${fmt(collected)}*\nLifetime Outstanding: *${fmt(billed - collected)}*`);
      return true;
    }

    if (type === "top_customers") {
      const { data } = await supabaseAdmin.from('customers').select('name, orders(final_amount)').eq('shopkeeper_id', shopkeeperId).eq('is_active', true);
      const ranked = (data || []).map(c => ({
        name: c.name,
        spend: (c.orders || []).reduce((s, o) => s + Number(o.final_amount || 0), 0),
        ordersCount: (c.orders || []).length
      })).sort((a, b) => b.spend - a.spend).slice(0, 5);
      if (!ranked.length || ranked[0].spend === 0) {
        await whatsappService.sendTextMessage(senderPhone, `No customer order history found.`);
      } else {
        const msg = `🏆 *Top Customers*\n\n` + ranked.map((c, i) => `${i + 1}. *${c.name}* — ${fmt(c.spend)} (${c.ordersCount} orders)`).join('\n');
        await whatsappService.sendTextMessage(senderPhone, msg);
      }
      return true;
    }
  }

  // ── Recipe parser (multi-line, with or without product name) ─────────────
  if (/^recipe/i.test(text)) {
    let prodName = null;
    let ingredientsText = null;

    // "Recipe for X: ..." or "Recipe of X: ..."
    const mWithProd = text.match(/recipe\s+(?:for|of)\s+([^:\n\r]+):?\s*([\s\S]+)/i);
    if (mWithProd) {
      prodName = mWithProd[1].trim();
      ingredientsText = mWithProd[2].trim();
    } else {
      // Plain "Recipe:\n..." → fall back to most-recently created sellable product
      const mPlain = text.match(/recipe:?\s*([\s\S]+)/i);
      if (mPlain) {
        ingredientsText = mPlain[1].trim();
        const { data: recent } = await supabaseAdmin
          .from('inventory').select('id, item_name')
          .eq('shopkeeper_id', shopkeeperId).eq('sku', 'product')
          .order('created_at', { ascending: false }).limit(1);
        if (recent && recent.length > 0) prodName = recent[0].item_name;
      }
    }

    if (!prodName) {
      await whatsappService.sendTextMessage(senderPhone,
        `❌ Could not identify the product. Send like:\n\n*Recipe for Vanilla Cake:*\n500g atta\n300g sugar\n4 eggs`);
      return true;
    }

    const { match: invProduct } = await fuzzyFindInventoryItem(shopkeeperId, prodName);
    if (!invProduct) {
      await whatsappService.sendTextMessage(senderPhone, `❌ Product *${prodName}* not found.`);
      return true;
    }

    // Split by newlines OR commas
    const lines = ingredientsText.split(/[\n,;]+/);
    const bom = {};
    const saved = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Match "500g atta" or "4 eggs" or "300 gm flour"
      const mIng = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:g(?:m)?|kg|ml|l|litre|units|pcs|nos?)?\.?\s+(.+)/i);
      if (!mIng) continue;
      const qty = parseFloat(mIng[1]);
      const ingName = mIng[2].trim();
      if (!ingName) continue;

      const { match: rawMat } = await fuzzyFindInventoryItem(shopkeeperId, ingName);
      if (rawMat) {
        if (rawMat.sku !== 'raw_material')
          await inventoryService.updateInventory(shopkeeperId, rawMat.id, { sku: 'raw_material' });
        bom[rawMat.id] = qty;
        saved.push(`• ${rawMat.item_name}: ${qty}`);
      } else {
        const newRaw = await inventoryService.createInventory(shopkeeperId, {
          item_name: ingName, unit_price: 0, quantity_in_stock: 0, sku: 'raw_material'
        });
        if (newRaw) {
          bom[newRaw.id] = qty;
          saved.push(`• ${newRaw.item_name}: ${qty} (new)`);
        }
      }
    }

    if (Object.keys(bom).length === 0) {
      await whatsappService.sendTextMessage(senderPhone,
        `❌ No ingredients parsed. Example format:\n500g atta, 300g sugar, 4 eggs`);
      return true;
    }

    await inventoryService.updateInventory(shopkeeperId, invProduct.id, {
      description: JSON.stringify({ bom })
    });
    await whatsappService.sendTextMessage(senderPhone,
      `✅ Recipe saved for *${invProduct.item_name}* (${Object.keys(bom).length} ingredients):\n${saved.join('\n')}`);
    return true;
  }

  // Otherwise try legacy regex commands
  return handleOwnerCommand(text, shopkeeperId, senderPhone);
}

// ---------------------------------------------------------------------------
// OWNER MAIN HANDLER LOGIC
// ---------------------------------------------------------------------------
async function handleOwnerCommand(text, shopkeeperId, senderPhone) {
  const lower = text.toLowerCase().trim();
  // Log only in this function (caller already knows this might be an owner message)

  // ---- Today's sales ----
  if (/today'?s?\s+sales?|sales?\s+today/i.test(text)) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: orders } = await supabaseAdmin
      .from('orders').select('final_amount, paid_amount, order_status')
      .eq('shopkeeper_id', shopkeeperId)
      .gte('created_at', todayStart.toISOString());

    const total = (orders || []).reduce((s, o) => s + Number(o.paid_amount || 0), 0);
    const count = (orders || []).length;
    const pending = (orders || []).filter((o) => o.order_status === 'pending').length;
    await whatsappService.sendTextMessage(senderPhone,
      `📊 *Today's Sales*\n\nOrders: ${count}\nCollected: ${fmt(total)}\nPending: ${pending}`);
    return true;
  }

  // ---- Pending payments ----
  if (/pending\s+payment/i.test(text)) {
    const { data: claims } = await supabaseAdmin
      .from('payment_claims').select('amount, customers(name)')
      .eq('shopkeeper_id', shopkeeperId).eq('status', 'pending');
    if (!claims || claims.length === 0) {
      await whatsappService.sendTextMessage(senderPhone, '✅ No pending payment verifications.');
    } else {
      const lines = claims.map((c) => `• ${c.customers?.name || 'Customer'}: ${fmt(c.amount)}`).join('\n');
      await whatsappService.sendTextMessage(senderPhone, `⏳ *Pending Payment Claims* (${claims.length})\n\n${lines}\n\nApprove from dashboard.`);
    }
    return true;
  }

  // ---- Low stock ----
  if (/low\s+stock|stock\s+alert/i.test(text)) {
    const { data: items } = await supabaseAdmin
      .from('inventory').select('item_name, quantity_in_stock, min_stock_threshold')
      .eq('shopkeeper_id', shopkeeperId).eq('is_active', true);
    const low = (items || []).filter((i) => i.quantity_in_stock <= (i.min_stock_threshold ?? 5));
    if (low.length === 0) {
      await whatsappService.sendTextMessage(senderPhone, '✅ All items are well-stocked!');
    } else {
      const lines = low.map((i) => `• ${i.item_name}: ${i.quantity_in_stock} left`).join('\n');
      await whatsappService.sendTextMessage(senderPhone, `⚠️ *Low Stock Alert*\n\n${lines}`);
    }
    return true;
  }

  // ---- Set price: "Set chocolate cake price 450" ----
  const setPriceMatch = text.match(/set\s+(.+?)\s+price\s+(\d+(?:\.\d+)?)/i);
  if (setPriceMatch) {
    const productName = setPriceMatch[1].trim();
    const price = Number(setPriceMatch[2]);
    const { match } = await fuzzyFindInventoryItem(shopkeeperId, productName);
    if (!match) {
      await whatsappService.sendTextMessage(senderPhone, `❌ Product "${productName}" not found in inventory.`);
    } else {
      await inventoryService.updateInventory(shopkeeperId, match.id, { unit_price: price });
      await whatsappService.sendTextMessage(senderPhone, `✅ Price updated!\n\n*${match.item_name}*: ${fmt(price)}`);
    }
    return true;
  }

  // ---- Add/Restock: "Add 20 chocolate cake" / "Stock chocolate cake 50" ----
  const addStockMatch = text.match(/(?:add|stock|restock|received?)\s+(\d+)\s+(.+)/i);
  if (addStockMatch) {
    const qty = Number(addStockMatch[1]);
    const productName = addStockMatch[2].trim();
    const { match } = await fuzzyFindInventoryItem(shopkeeperId, productName);
    if (match) {
      const res = await inventoryService.restockInventory(shopkeeperId, match.id, { quantity: qty });
      await whatsappService.sendTextMessage(senderPhone,
        `✅ Restocked *${match.item_name}*\n${res.previous_quantity} → ${res.item?.quantity_in_stock} units`);
    } else {
      const created = await inventoryService.createInventory(shopkeeperId, {
        item_name: productName, unit_price: 0, quantity_in_stock: qty, min_stock_threshold: 5,
      });
      await whatsappService.sendTextMessage(senderPhone,
        `✅ New item added: *${created.item_name}* — ${created.quantity_in_stock} units`);
    }
    return true;
  }

  // ---- Bought (with cost): "Bought 20 bread 400" ----
  const boughtMatch = text.match(/bought\s+(\d+)\s+(.+?)\s+(\d+(?:\.\d+)?)\s*(?:rs|₹|rupees?)?/i);
  if (boughtMatch) {
    const qty = Number(boughtMatch[1]);
    const productName = boughtMatch[2].trim();
    const cost = Number(boughtMatch[3]);
    const { match } = await fuzzyFindInventoryItem(shopkeeperId, productName);
    if (match) {
      const res = await inventoryService.restockInventory(shopkeeperId, match.id, { quantity: qty });
      await inventoryService.updateInventory(shopkeeperId, match.id, { cost_price: cost / qty });
      await whatsappService.sendTextMessage(senderPhone,
        `✅ Restocked *${match.item_name}*\n${res.previous_quantity} → ${res.item?.quantity_in_stock} units\nCost: ${fmt(cost)}`);
    } else {
      const created = await inventoryService.createInventory(shopkeeperId, {
        item_name: productName, unit_price: 0, cost_price: cost / qty,
        quantity_in_stock: qty, min_stock_threshold: 5,
      });
      await whatsappService.sendTextMessage(senderPhone,
        `✅ New item: *${created.item_name}* — ${created.quantity_in_stock} units @ ${fmt(cost)}`);
    }
    return true;
  }

  // If not recognised, return false to fall through to customer handling
  return false;
}

// ---------------------------------------------------------------------------
// Core message processing pipeline
// ---------------------------------------------------------------------------
async function processMessage(message, senderPhone, senderName) {
  const shopkeeper = await resolveShopkeeper();
  const shopkeeperId = shopkeeper.id;

  // ---- Owner detection — normalize both numbers to digits-only for reliable comparison ----
  const stripPhone = (p) => (p || '').replace(/[^\d]/g, '').replace(/^0+/, '');
  const ownerPhone = stripPhone(process.env.OWNER_PHONE_NUMBER);
  const senderClean = stripPhone(senderPhone);
  // Match on last 10 digits to be country-code agnostic
  const isOwner = ownerPhone.length >= 10 && senderClean.length >= 10 &&
    senderClean.slice(-10) === ownerPhone.slice(-10);

  // 1. Extract text / audio / image
  let text = null;
  let imageBase64 = null;
  let imageMimeType = 'image/jpeg';

  function extractCustomerFromCaption(caption) {
    if (!caption || !caption.trim()) return null;
    const normalized = caption.trim();
    const patterns = [
      /paid\s+by\s+([^.,\n]+?)(?:\s+via|\s+on|\s+for|\s+with|[.,\n]|$)/i,
      /received\s+from\s+([^.,\n]+?)(?:\s+via|\s+on|\s+for|\s+with|[.,\n]|$)/i,
      /from\s+([^.,\n]+?)(?:\s+via|\s+on|\s+for|\s+with|[.,\n]|$)/i,
      /for\s+([^.,\n]+?)(?:\s+via|\s+on|\s+with|[.,\n]|$)/i,
      /to\s+([^.,\n]+?)(?:\s+via|\s+on|\s+with|[.,\n]|$)/i,
    ];
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  if (message.type === 'text') {
    text = message.text?.body;
  } else if (message.type === 'audio') {
    const mediaId = message.audio?.id;
    if (!mediaId) { logger.warn('[WhatsApp] Audio message missing media id'); return; }
    const tmpPath = await downloadMedia(mediaId, 'ogg');
    try {
      text = await transcribeAudio(tmpPath);
      logger.info(`[WhatsApp] Transcribed audio from ${senderPhone}: "${text}"`);
    } finally {
      try { fs.unlinkSync(tmpPath); } catch (_) { /* ignore */ }
    }
  } else if (message.type === 'image') {
    const mediaId = message.image?.id;
    if (!mediaId) { logger.warn('[WhatsApp] Image message missing media id'); return; }
    const tmpImg = await downloadMedia(mediaId, 'jpg');
    try {
      imageBase64 = fs.readFileSync(tmpImg).toString('base64');
      imageMimeType = message.image?.mime_type || 'image/jpeg';
      text = message.image?.caption || '';
    } finally {
      try { fs.unlinkSync(tmpImg); } catch (_) { /* ignore */ }
    }
  } else {
    logger.info(`[WhatsApp] Skipping unsupported message type: ${message.type}`);
    return;
  }

  // ---- IMAGE HANDLING (Gemini Vision) ----
  if (imageBase64) {
    const captionText = message.image?.caption || '';
    logger.info(`[WhatsApp] Analysing image from ${senderPhone}`);
    const imageResult = await aiService.analyseImage(imageBase64, imageMimeType, captionText);
    logger.info(`[WhatsApp] Image analysis result:`, imageResult);

    if (imageResult.type === 'payment' && imageResult.amount) {
      const paymentApp = imageResult.payment_app || imageResult.payment_mode || 'upi';
      const receiptCustomer = imageResult.sender || imageResult.customer_name || null;
      const captionCustomer = captionText ? extractCustomerFromCaption(captionText) : null;
      const normalizedReceipt = receiptCustomer ? receiptCustomer.trim().toLowerCase() : null;
      const normalizedCaption = captionCustomer ? captionCustomer.trim().toLowerCase() : null;

      if (normalizedReceipt && normalizedCaption && normalizedReceipt !== normalizedCaption) {
        await whatsappService.sendTextMessage(senderPhone,
          `I found a different customer name in the caption (${captionCustomer}) than in the payment details (${receiptCustomer}). Please confirm who paid the amount.`);
        return;
      }

      const customerName = captionCustomer || receiptCustomer;
      if (customerName) {
        text = `Customer ${customerName} paid ${imageResult.amount} rs via ${paymentApp}`;
      } else {
        text = `paid ${imageResult.amount} rs via ${paymentApp}`;
      }
    } else {
      const inferredText = imageResult.summary?.trim() || (imageResult.product ? `I can see ${imageResult.product}` : '');
      if (inferredText) {
        text = text && text.trim() ? `${text.trim()}\n${inferredText}` : inferredText;
      } else if (!text || text.trim().length === 0) {
        await whatsappService.sendTextMessage(senderPhone,
          "Thanks for the image! To place an order, please type the items you need, e.g.: '2 kg atta, 1 kg sugar'");
        return;
      }
    }
  }

  if (!text || text.trim().length === 0) {
    logger.info('[WhatsApp] Empty text after extraction, skipping.');
    return;
  }

  // ---- Owner commands — processed before AI intent detection ----
  if (isOwner) {
    logger.info(`[WhatsApp] Owner message detected from ${senderPhone}: "${text}"`);
    try {
      const handled = await handleOwnerFlow(text, shopkeeperId, senderPhone);
      if (!handled) {
        await whatsappService.sendTextMessage(senderPhone, `Sorry, I couldn't understand that instruction. Try typing 'Today's sales', 'Who owes me?', or 'Customer Priya paid 500 cash'.`);
      }
    } catch (err) {
      logger.error("[WhatsApp] Error processing owner command: " + err.message, err);
      await whatsappService.sendTextMessage(senderPhone, `❌ Error processing command: ${err.message}`);
    }
    return; // Block owner message from falling through to customer record creation
  }

  // 2. Find or create customer record
  const customer = await findOrCreateCustomer(shopkeeperId, senderPhone, senderName);

  // 3. Detect intent
  let intent;
    try {
    logger.info(`[WhatsApp] Detecting intent for message: "${text}" from ${senderPhone}`);
    intent = await aiService.classifyMessage(text);
    logger.info(`[WhatsApp] Detected intent: ${intent}`);
    console.log('[WhatsApp] classify raw result:', intent);
  } catch (err) {
    logger.error('[WhatsApp] Intent detection failed: ' + err.message);
    intent = aiService.INTENTS.GENERAL_MESSAGE;
  }

  // =====================================
  // NEW_ORDER
  // =====================================
  if (intent === aiService.INTENTS.NEW_ORDER) {
    logger.info(`[WhatsApp] NEW_ORDER intent. Parsing: "${text}"`);
    logger.info('[WhatsApp][STAGE1] Raw transcript:', text);

    let parsed;
    try {
      parsed = await aiService.parseOrder(text);
      logger.info(`[WhatsApp][STAGE2] AI parser output: ${JSON.stringify(parsed)}`);
    } catch (err) {
      logger.error('[WhatsApp] AI parsing failed: ' + err.message);
      await whatsappService.sendTextMessage(senderPhone,
        "Sorry, we could not understand your order. Please try again, e.g.: '2 chocolate cakes, 1 kg atta'");
      return;
    }

    if (!Array.isArray(parsed?.items) || parsed.items.length === 0) {
      await whatsappService.sendTextMessage(senderPhone,
        "We received your message but could not identify any order items. Please list items clearly.");
      return;
    }

    // Resolve customer: prefer parsed customer_name when provided
    let effectiveCustomer = customer;
    if (parsed.customer_name) {
      try {
        const resolved = await resolveCustomerByName(shopkeeperId, parsed.customer_name, senderPhone);
        if (resolved && resolved.multiple) {
          // Ambiguous; ask user to clarify by phone or full name
          let msg = `Multiple customers match "${parsed.customer_name}". Please specify full name or provide phone number:\n`;
          msg += resolved.candidates.slice(0, 5).map((c, i) => `${i + 1}. ${c.name} (${c.phone_number || 'no phone'})`).join('\n');
          await whatsappService.sendTextMessage(senderPhone, msg);
          return;
        }
        if (resolved && resolved.id) {
          effectiveCustomer = resolved;
        }
      } catch (e) {
        logger.warn('[WhatsApp] Customer name resolution failed: ' + e.message);
      }
    }

    // ---- Fuzzy inventory lookup + validation ----
    const resolvedItems = [];
    const confirmLines = [];
    let orderTotal = 0;
    let hadUnavailable = false;

    for (const item of parsed.items) {
      const { match, suggestions } = await fuzzyFindInventoryItem(shopkeeperId, item.product);

      if (!match) {
        hadUnavailable = true;
        let msg = `❌ Sorry, *${item.product}* is currently unavailable in our shop.`;
        if (suggestions.length > 0) msg += `\n\nDid you mean: ${suggestions.map((s) => `*${s}*`).join(', ')}?`;
        await whatsappService.sendTextMessage(senderPhone, msg);
        continue; // Don't create order for unknown items
      }

      const qty = Number(item.quantity) || 1;
      const unit = (item.unit || 'pcs').toLowerCase();

      // Stock check
      if (match.quantity_in_stock <= 0) {
        await whatsappService.sendTextMessage(senderPhone,
          `⚠️ Sorry, *${match.item_name}* is currently out of stock.`);
        hadUnavailable = true;
        continue;
      }

      // For kg-based orders, check stock in kg units
      const isKgUnit = /^(kg|kilo|kilogram|g|gm|gram|litr?e?|l|ml)$/i.test(unit);
      const stockCheckQty = isKgUnit ? qty : qty; // both use same qty, stock stored as units
      if (match.quantity_in_stock < stockCheckQty && !isKgUnit) {
        await whatsappService.sendTextMessage(senderPhone,
          `⚠️ Only *${match.quantity_in_stock}* ${match.item_name}${match.quantity_in_stock !== 1 ? 's' : ''} available. Would you like to order that many instead?`);
        hadUnavailable = true;
        continue;
      }

      const unitPrice = Number(match.unit_price) || 0;
      // For kg-based orders: price is per-kg, so lineTotal = qty_kg * price_per_kg
      const lineTotal = Number((qty * unitPrice).toFixed(2));
      orderTotal += lineTotal;
      const unitLabel = unit || 'pcs';

      if (unitPrice > 0) {
        confirmLines.push(`• ${match.item_name} × ${qty} ${unitLabel} — ${fmt(lineTotal)}`);
      } else {
        confirmLines.push(`• ${match.item_name} × ${qty} ${unitLabel}`);
      }

      resolvedItems.push({
        item_name: match.item_name,
        inventory_id: match.id,
        quantity: qty,
        unit: unitLabel,
        unit_price: unitPrice,
      });
    }

    // If all items are unavailable, stop
    if (resolvedItems.length === 0) return;

    const hasExplicitAmount = parsed.amount !== null && parsed.amount !== undefined;
    const finalTotal = hasExplicitAmount ? Number(parsed.amount) : orderTotal;

    const orderPayload = {
      customer_id: effectiveCustomer?.id || null,
      customer_name: parsed.customer_name || effectiveCustomer?.name || null,
      items: resolvedItems,
      total_amount: finalTotal,
      intent: intent,
      transcript: parsed.notes || text,
      source: 'whatsapp',
      input_type: message.type === 'audio' ? 'voice' : message.type === 'image' ? 'image' : 'text',
      order_status: 'pending',
      payment_status: 'unpaid',
      notes: parsed.notes || text,
    };

    let order;
    try {
      logger.info('[WhatsApp][STAGE3] Payload sent to createOrder: ' + JSON.stringify(orderPayload));
      order = await createOrder(shopkeeperId, shopkeeperId, orderPayload);
      logger.info(`[WhatsApp] ✅ Order ${order.order_number} created. Total=${fmt(finalTotal)}`);
    } catch (err) {
      logger.error('[WhatsApp] ❌ Order creation failed: ' + err.message);
      await whatsappService.sendTextMessage(senderPhone,
        "We received your order but there was an error saving it. Please contact the shop.");
      return;
    }

    const totalLine = finalTotal > 0 ? `\n\n💰 Total: *${fmt(finalTotal)}*` : '';
    const deliveryNote = parsed.delivery_date ? `\n📅 Delivery: ${parsed.delivery_date}` : '';
    const summary = confirmLines.join('\n');
    const partialNote = hadUnavailable ? '\n\n⚠️ Some items were unavailable and excluded.' : '';

    await whatsappService.sendTextMessage(senderPhone,
      `✅ Order received! *(${order.order_number})*\n\n${summary}${totalLine}${deliveryNote}${partialNote}\n\nWe'll confirm shortly.`);

    // =====================================
    // PAYMENT → create a claim for shopkeeper to verify
    // =====================================
  } else if (intent === aiService.INTENTS.PAYMENT) {
    const { amount, payment_mode } = await aiService.parsePayment(text);
    logger.info(`[WhatsApp] Payment claim. Amount: ${amount}, Mode: ${payment_mode}`);

    if (!amount || amount <= 0) {
      await whatsappService.sendTextMessage(senderPhone,
        "Could not identify payment amount. Please specify like: 'Paid 500 rs' or '300 gpay'");
      return;
    }

    // If AI parsing provided a customer_name in message text, try to resolve to customer id
    let paymentCustomer = customer;
    try {
      const parsedPayment = await aiService.parseOrder(text); // parseOrder also extracts customer_name in many cases
      if (parsedPayment && parsedPayment.customer_name) {
        const resolved = await resolveCustomerByName(shopkeeperId, parsedPayment.customer_name, senderPhone);
        if (resolved && resolved.multiple) {
          // Ambiguous — ask for clarification
          let msg = `Multiple customers match "${parsedPayment.customer_name}". Please specify full name or phone number:\n`;
          msg += resolved.candidates.slice(0, 5).map((c, i) => `${i + 1}. ${c.name} (${c.phone_number || 'no phone'})`).join('\n');
          await whatsappService.sendTextMessage(senderPhone, msg);
          return;
        }
        if (resolved && resolved.id) paymentCustomer = resolved;
      }
    } catch (e) {
      logger.warn('[WhatsApp] payment customer resolution failed: ' + e.message);
    }

    try {
      await paymentClaimsService.createPaymentClaim(shopkeeperId, paymentCustomer?.id || null, {
        amount,
        payment_mode,
        raw_message: text,
      });
      logger.info(`[WhatsApp] ✅ Payment claim created for ₹${amount} from ${paymentCustomer?.name || senderPhone} (${senderPhone})`);
      await whatsappService.sendTextMessage(senderPhone,
        `⏳ Payment claim of *${fmt(amount)}* via *${payment_mode}* received.\n\nAwaiting shopkeeper verification. You'll be notified once confirmed. Thank you!`);
    } catch (err) {
      logger.error('[WhatsApp] Failed to create payment claim: ' + err.message);
      if (err.message.includes('does not exist') || err.message.includes('relation')) {
        // Table doesn't exist yet — fall back to direct payment recording
        logger.warn('[WhatsApp] payment_claims table missing — applying payment directly as fallback');
        await applyPaymentDirectly(shopkeeperId, paymentCustomer, amount, senderPhone, text);
      } else {
        await whatsappService.sendTextMessage(senderPhone,
          "There was an error recording your payment. Please contact the shop.");
      }
    }

    // =====================================
    // INVENTORY_PURCHASE (owner restocking)
    // =====================================
  } else if (intent === aiService.INTENTS.INVENTORY_ADD || intent === aiService.INTENTS.INVENTORY_REMOVE || intent === aiService.INTENTS.INVENTORY_UPDATE) {
    const parsed = aiService.ruleBasedParse(text);
    if (parsed.items.length === 0) {
      await whatsappService.sendTextMessage(senderPhone,
        "Could not identify inventory items. Format: 'Bought 20 bread packets'");
      return;
    }

    const results = [];
    for (const item of parsed.items) {
      try {
        const { match } = await fuzzyFindInventoryItem(shopkeeperId, item.product);
        if (match) {
          const result = await inventoryService.restockInventory(shopkeeperId, match.id, { quantity: item.quantity });
          results.push(`${match.item_name}: ${result.previous_quantity} → ${result.item?.quantity_in_stock} ✅`);
        } else {
          const created = await inventoryService.createInventory(shopkeeperId, {
            item_name: item.product, unit_price: 0, quantity_in_stock: item.quantity, min_stock_threshold: 5,
          });
          results.push(`${created.item_name}: Added ${created.quantity_in_stock} units ✅`);
        }
      } catch (err) {
        logger.error(`[WhatsApp] Inventory update failed for ${item.product}: ${err.message}`);
        results.push(`${item.product}: Failed ❌`);
      }
    }
    await whatsappService.sendTextMessage(senderPhone, `📦 *Inventory Updated*\n\n${results.join('\n')}`);

    // =====================================
    // SET_PRICE (owner command via AI)
    // =====================================
  } else if (intent === aiService.INTENTS.SET_PRICE) {
    const priceCmd = aiService.parseSetPrice(text);
    if (!priceCmd) {
      await whatsappService.sendTextMessage(senderPhone,
        "Format: 'Set chocolate cake price 450'");
      return;
    }
    const { match } = await fuzzyFindInventoryItem(shopkeeperId, priceCmd.product);
    if (!match) {
      await whatsappService.sendTextMessage(senderPhone, `❌ "${priceCmd.product}" not found in inventory.`);
      return;
    }
    await inventoryService.updateInventory(shopkeeperId, match.id, { unit_price: priceCmd.price });
    await whatsappService.sendTextMessage(senderPhone,
      `✅ Price updated!\n\n*${match.item_name}*: ${fmt(priceCmd.price)}`);

    // =====================================
    // ORDER_STATUS
    // =====================================
  } else if (intent === aiService.INTENTS.ORDER_STATUS) {
    const { data: orders } = await supabaseAdmin
      .from("orders").select("id, order_status, final_amount, payment_status, created_at")
      .eq("customer_id", customer.id).eq("shopkeeper_id", shopkeeperId)
      .order("created_at", { ascending: false }).limit(3);

    if (!orders || orders.length === 0) {
      await whatsappService.sendTextMessage(senderPhone, "No orders found for your account.");
      return;
    }

    const statusEmoji = { pending: '⏳', accepted: '✅', completed: '🎉', rejected: '❌' };
    const statusMsg = orders.map((o) => {
      const num = `ORD-${o.id.slice(0, 8).toUpperCase()}`;
      const emoji = statusEmoji[o.order_status] || '📋';
      const amt = Number(o.final_amount) > 0 ? ` — ${fmt(o.final_amount)}` : '';
      return `${emoji} ${num}: *${o.order_status}*${amt}`;
    }).join('\n');

    await whatsappService.sendTextMessage(senderPhone, `📋 *Your Recent Orders*\n\n${statusMsg}`);

    // =====================================
    // GENERAL_MESSAGE
    // =====================================
  } else {
    await whatsappService.sendTextMessage(senderPhone,
      `👋 Hi ${customer.name}! To place an order, say what you need (e.g. *"2 chocolate cakes"* or *"aadha kilo cake"*).\nFor payment, say *"paid 500 rs"* or *"gpay 300"*.`);
  }
}

// Fallback: apply payment directly when payment_claims table is missing
async function applyPaymentDirectly(shopkeeperId, customer, amount, senderPhone, text) {
  const { data: unpaidOrders } = await supabaseAdmin
    .from("orders").select("id, final_amount, paid_amount, payment_status")
    .eq("customer_id", customer.id).eq("shopkeeper_id", shopkeeperId)
    .in("payment_status", ["unpaid", "partially_paid"]).order("created_at", { ascending: true });

  if (!unpaidOrders || unpaidOrders.length === 0) {
    await whatsappService.sendTextMessage(senderPhone, "✅ No pending orders found. Thank you!");
    return;
  }

  let remaining = amount;
  for (const ord of unpaidOrders) {
    if (remaining <= 0) break;
    const owed = Number(ord.final_amount || 0) - Number(ord.paid_amount || 0);
    if (owed <= 0) continue;
    const applying = Math.min(remaining, owed);
    const newPaid = Number(ord.paid_amount || 0) + applying;
    const totalAmt = Number(ord.final_amount || 0);
    const newStatus = totalAmt > 0 && newPaid >= totalAmt ? "fully_paid" : "partially_paid";
    await supabaseAdmin.from("orders")
      .update({ paid_amount: newPaid, payment_status: newStatus, ...(newStatus === "fully_paid" ? { order_status: "completed" } : {}) })
      .eq("id", ord.id).eq("shopkeeper_id", shopkeeperId);
    remaining -= applying;
  }
  const outstanding = Math.max(0, (unpaidOrders.reduce((s, o) => s + Math.max(0, Number(o.final_amount || 0) - Number(o.paid_amount || 0)), 0)) - amount);
  await whatsappService.sendTextMessage(senderPhone,
    outstanding > 0
      ? `✅ Payment of ${fmt(amount)} received.\n💰 Outstanding: ${fmt(outstanding)}`
      : `✅ Payment of ${fmt(amount)} received. All orders cleared! 🎉`);
}

// ---------------------------------------------------------------------------
// Public controllers
// ---------------------------------------------------------------------------
export const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  logger.info('Incoming webhook verification request received', { mode, token });
  if (mode && token) {
    if (mode === 'subscribe' && token === config.whatsapp.webhookVerifyToken) {
      logger.info('Webhook verification successful.');
      return res.status(200).send(challenge);
    } else {
      logger.warn('Webhook verification token mismatch');
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
};

export const receiveWebhook = (req, res) => {
  const { body } = req;
  res.status(200).json({ status: 'success' });

  (async () => {
    try {
      if (body.object !== 'whatsapp_business_account') return;
      logger.info('Received WhatsApp Webhook Payload', { entriesCount: body.entry?.length });

      for (const entry of (body.entry || [])) {
        for (const change of (entry.changes || [])) {
          const { value } = change;
          if (!value) continue;

          for (const status of (value.statuses || [])) {
            logger.info(`Message status: ${status.id} → [${status.status}] for ${status.recipient_id}`);
          }

          for (const message of (value.messages || [])) {
            // Duplicate protection
            if (isDuplicateMessage(message.id)) {
              logger.info(`[WhatsApp] Skipping duplicate message ID: ${message.id}`);
              continue;
            }

            const contact = value.contacts?.find((c) => c.wa_id === message.from);
            const senderName = contact?.profile?.name || null;
            const senderPhone = message.from;

            logger.info(`New Message from ${senderName || senderPhone} (${senderPhone})`, {
              messageId: message.id,
              type: message.type,
              textBody: message.text?.body || message.image?.caption || '[No Text Body]',
            });

            processMessage(message, senderPhone, senderName).catch((err) => {
              logger.error(`[WhatsApp] Unhandled error from ${senderPhone}: ${err.message}`, err);
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error in receiveWebhook', error);
    }
  })();
};
