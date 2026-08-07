import { supabaseAdmin as supabase } from "../config/supabase.js";
import { updateCustomerMemory } from "./customerMemoryService.js";
import whatsappService from "./whatsappService.js";
import * as aiService from "./aiService.js";

/**
 * Ported from orders-module/src/services/orders.service.js (CommonJS → ESM).
 *
 * Column mapping applied throughout (see Integration Plan):
 *   business_id        -> shopkeeper_id
 *   inventory_item_id   -> inventory_id (existing order_items column)
 *   subtotal             -> total_price (existing order_items column)
 *
 * The original relied on Postgres RPCs (next_order_number,
 * find_or_create_inventory_item, adjust_inventory_stock) that don't exist
 * in this project. Reimplemented here as plain Supabase queries instead of
 * new DB functions, to avoid introducing untested SQL. This trades a small
 * amount of atomicity for staying within the existing Supabase-JS pattern
 * already used everywhere else in this backend (see Integration Report).
 */

const TERMINAL_STATUSES = ["completed", "cancelled"];

const ORDER_SELECT = `
  id, shopkeeper_id, customer_id, total_amount, discount_amount, tax_amount,
  final_amount, paid_amount, payment_status, order_status, notes, created_at, updated_at,
  customers ( id, name, phone_number ),
  order_items ( id, inventory_id, quantity, unit_price, total_price, inventory ( item_name ) )
`;

export function parseNotesMetadata(notesField) {
  const metadata = {
    source: "manual_entry",
    input_type: "text",
    cleanNotes: notesField || "",
    customer_name: null,
    customer_phone: null,
    extras: {},
  };

  if (notesField && notesField.startsWith("[source:")) {
    const match = notesField.match(/^\[source:([^\]]+)\]\[input:([^\]]+)\](.*)$/s);
    if (match) {
      metadata.source = match[1];
      metadata.input_type = match[2];
      let rest = (match[3] || "").trim();
      const extraMetaRegex = /^\[([^\]]+):([^\]]+)\](.*)$/s;
      let extraMatch;
      // Collect bracketed key:value pairs into extras, but extract known keys
      while (rest && (extraMatch = rest.match(extraMetaRegex))) {
        const key = extraMatch[1];
        const value = extraMatch[2];
        rest = (extraMatch[3] || "").trim();
        if (key === "customer") {
          metadata.customer_name = value;
        } else if (key === "phone") {
          metadata.customer_phone = value;
        } else {
          metadata.extras[key] = value;
        }
      }
      metadata.cleanNotes = rest.trim();
    }
  }

  return metadata;
}

function formatOrder(order) {
  if (!order) return order;
  const meta = parseNotesMetadata(order.notes);

  // Mock missing order columns for frontend compatibility
  order.order_number = `ORD-${order.id.slice(0, 8).toUpperCase()}`;
  order.source = meta.source;
  order.input_type = meta.input_type;
  order.notes = meta.cleanNotes;
  // Use actual order_status from database, default to pending if not set
  order.order_status = order.order_status || "pending";
  order.cancelled_at = null;
  order.cancellation_reason = null;

  if (order.customers) {
    order.customer_name = order.customers.name;
    order.customer_phone = order.customers.phone_number || meta.customer_phone || "";
  } else if (meta.customer_name) {
    order.customer_name = meta.customer_name;
    order.customer_phone = meta.customer_phone || "";
  } else {
    order.customer_name = "Walk-in Customer";
    order.customer_phone = "";
  }

  // Expose parsed metadata (intent/transcript/other extras) to the API consumer
  order.parsed_intent = meta.extras.intent || null;
  order.transcript = meta.extras.transcript || null;

  if (Array.isArray(order.order_items)) {
    order.order_items = order.order_items.map((item) => ({
      ...item,
      item_name: item.inventory?.item_name || "Unknown Item",
      unit: "pcs",
      stock_status: "not_tracked",
      stock_deducted_quantity: 0,
    }));
    
    order.items_summary = order.order_items
      .map((item) => `${item.item_name} x ${item.quantity}`)
      .join(", ");

    // Treat unpriced orders as null amount (not ₹0)
    const allUnpriced = order.order_items.every((i) => !i.unit_price || Number(i.unit_price) === 0);
    if (allUnpriced && Number(order.final_amount) === 0) {
      order.final_amount = null;
      order.total_amount = null;
    }
  } else {
    order.items_summary = "";
  }
  return order;
}

function computeItemTotals(items) {
  return items.map((item) => ({
    ...item,
    total_price: Number((item.quantity * item.unit_price).toFixed(2)),
  }));
}
function sumTotal(items) {
  return Number(items.reduce((acc, i) => acc + i.total_price, 0).toFixed(2));
}

async function generateOrderNumber(shopkeeperId) {
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("shopkeeper_id", shopkeeperId);

  const seq = (count || 0) + 1;
  return `ORD-${String(seq).padStart(5, "0")}`;
}

// ---- Inventory hook helpers (inline, no RPC dependency) ------------------

async function matchInventoryItems(shopkeeperId, items) {
  const matched = [];
  for (const item of items) {
    if (item.inventory_id) {
      matched.push(item);
      continue;
    }
    if (!item.item_name) {
      matched.push({ ...item, inventory_id: null });
      continue;
    }

    const { data: existing } = await supabase
      .from("inventory")
      .select("id")
      .eq("shopkeeper_id", shopkeeperId)
      .ilike("item_name", item.item_name)
      .maybeSingle();

    if (existing) {
      matched.push({ ...item, inventory_id: existing.id });
      continue;
    }

    // Do NOT auto-create inventory items. Inventory is owner-controlled only.
    // Orders should not create inventory products.
    matched.push({ ...item, inventory_id: null });
  }
  return matched;
}

async function deductStockForItems(insertedItems) {
  for (const item of insertedItems) {
    if (!item.inventory_id) {
      continue;
    }

    const { data: inv, error: fetchError } = await supabase
      .from("inventory")
      .select("id, quantity_in_stock, min_stock_threshold, item_name")
      .eq("id", item.inventory_id)
      .maybeSingle();

    if (fetchError || !inv) {
      continue;
    }

    const newQuantity = Math.max(inv.quantity_in_stock - item.quantity, 0);
    await supabase.from("inventory").update({ quantity_in_stock: newQuantity }).eq("id", inv.id);

    if (inv.min_stock_threshold !== null && newQuantity <= inv.min_stock_threshold) {
      console.warn(`[orders] LOW STOCK: ${inv.item_name} at ${newQuantity} units`);
    }
  }
}

async function restockItems(orderItems) {
  for (const item of orderItems || []) {
    if (!item.inventory_id) continue;

    const { data: inv } = await supabase
      .from("inventory")
      .select("id, quantity_in_stock")
      .eq("id", item.inventory_id)
      .maybeSingle();

    if (!inv) continue;

    await supabase
      .from("inventory")
      .update({ quantity_in_stock: inv.quantity_in_stock + item.quantity })
      .eq("id", inv.id);
  }
}

// =========================================================
// LIST ORDERS (search + filters + pagination)
// =========================================================
export async function listOrders(shopkeeperId, query = {}) {
  const { search, status, paymentStatus, inputType, source, lastDays } = query;
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 20;

  let builder = supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("shopkeeper_id", shopkeeperId)
    .order("created_at", { ascending: false });

  if (paymentStatus) {
    builder = builder.eq("payment_status", paymentStatus);
  }
  if (lastDays) {
    const since = new Date(Date.now() - lastDays * 24 * 60 * 60 * 1000).toISOString();
    builder = builder.gte("created_at", since);
  }

  const { data, error } = await builder;
  if (error) {
    const err = new Error("Failed to fetch orders: " + error.message);
    err.status = 500;
    throw err;
  }

  let orders = (data || []).map(formatOrder);

  if (status) {
    orders = orders.filter((o) => o.order_status === status);
  }
  if (inputType) {
    orders = orders.filter((o) => o.input_type === inputType);
  }
  if (source) {
    orders = orders.filter((o) => o.source === source);
  }
  if (search) {
    const term = search.toLowerCase();
    orders = orders.filter((o) => 
      (o.notes && o.notes.toLowerCase().includes(term)) ||
      (o.order_number && o.order_number.toLowerCase().includes(term))
    );
  }

  const total = orders.length;
  const offset = (page - 1) * limit;
  const paginatedOrders = orders.slice(offset, offset + limit);

  return {
    orders: paginatedOrders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// =========================================================
// GET SINGLE ORDER
// =========================================================
export async function getOrderById(shopkeeperId, orderId) {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("shopkeeper_id", shopkeeperId)
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    const err = new Error("Failed to fetch order: " + error.message);
    err.status = 500;
    throw err;
  }
  if (!data) {
    const err = new Error("Order not found");
    err.status = 404;
    throw err;
  }
  return formatOrder(data);
}

// =========================================================
// CREATE ORDER — single gateway for manual/WhatsApp/voice/AI-parsed orders
// =========================================================
export async function createOrder(shopkeeperId, userId, payload) {
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    const err = new Error("At least one order item is required");
    err.status = 400;
    throw err;
  }

  // Detailed logging for debugging pipeline stages
  try {
    console.log('[ORDERSERVICE][STAGE1] Raw incoming payload to createOrder:', JSON.stringify(payload));
  } catch (e) {
    console.log('[ORDERSERVICE] Failed to stringify payload for log');
  }

  // Coerce item quantities (supports spelled-out numbers one->ten)
  const wordToNumber = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    aadha: 0.5,
    half: 0.5,
    ek: 1,
    do: 2,
    teen: 3,
  };

  function parseQuantity(q) {
    if (q === undefined || q === null) return null;
    if (typeof q === 'number') return q;
    const s = String(q).trim().toLowerCase();
    if (s === '') return null;
    if (!Number.isNaN(Number(s))) return Number(s);
    // strip non-alpha
    const alpha = s.replace(/[^a-z]/g, '');
    if (alpha && wordToNumber[alpha] !== undefined) return wordToNumber[alpha];
    const parsedInt = Number.parseInt(s, 10);
    return Number.isNaN(parsedInt) ? null : parsedInt;
  }

  const normalizedItems = (payload.items || []).map((it) => ({
    ...it,
    quantity: parseQuantity(it.quantity),
    item_name: it.item_name || it.item || it.product || "",
  }));
  // If any item is missing required fields, abort rather than silently defaulting
  const incomplete = normalizedItems.find((it) => !it.item_name || it.quantity === null || it.quantity === undefined);
  if (incomplete) {
    const err = new Error('Parsed items incomplete: each item must include name and quantity');
    err.status = 400;
    throw err;
  }
  try {
    console.log('[ORDERSERVICE][STAGE1.5] Normalized items:', JSON.stringify(normalizedItems));
  } catch (e) {}

  const itemsWithTotals = computeItemTotals(normalizedItems);
  const computedTotal = sumTotal(itemsWithTotals);
  const explicitAmount = payload.final_amount ?? payload.total_amount;
  const totalAmount =
    explicitAmount !== undefined && explicitAmount !== null
      ? Number(explicitAmount)
      : computedTotal > 0
        ? computedTotal
        : 0;
  const orderNumber = await generateOrderNumber(shopkeeperId);

  // Encode source/input_type into notes prefix since the orders table has no
  // dedicated source/input_type columns. Decoded by parseNotesMetadata on read.
  const source = payload.source || "manual_entry";
  const inputType = payload.input_type || "text";
  const rawNotes = payload.notes || null;
  const encodedNotesParts = [`[source:${source}]`, `[input:${inputType}]`];
  if (payload.customer_name) {
    encodedNotesParts.push(`[customer:${String(payload.customer_name).trim()}]`);
  }
  if (payload.customer_phone) {
    encodedNotesParts.push(`[phone:${String(payload.customer_phone).trim()}]`);
  }
  if (rawNotes !== null && rawNotes !== undefined && String(rawNotes).trim() !== "") {
    encodedNotesParts.push(String(rawNotes).trim());
  }
  const encodedNotes = encodedNotesParts.join(" ");

  const insertPayload = {
    shopkeeper_id: shopkeeperId,
    customer_id: payload.customer_id || null,
    total_amount: totalAmount,
    discount_amount: payload.discount_amount || 0,
    tax_amount: payload.tax_amount || 0,
    final_amount: totalAmount - (payload.discount_amount || 0) + (payload.tax_amount || 0),
    paid_amount: payload.paid_amount || 0,
    payment_status: payload.payment_status || "unpaid",
    order_status: "pending",
    notes: encodedNotes,
  };

  // If caller provided a customer_name but no customer_id, try to resolve or create a customer.
  // If frontend supplied a generic name (e.g. from voice UI), attempt to extract a real name from transcript via AI
  if (payload.customer_name && /voice customer|voice|customer$/i.test(String(payload.customer_name).trim()) && payload.transcript) {
    try {
      const parsedFromTranscript = await aiService.parseOrder(String(payload.transcript));
      if (parsedFromTranscript && parsedFromTranscript.customer_name) {
        payload.customer_name = parsedFromTranscript.customer_name;
      }
    } catch (e) {
      // ignore AI failures — proceed with original name
      console.warn('[ordersService] AI fallback name extraction failed:', e.message);
    }
  }

  if ((!insertPayload.customer_id || insertPayload.customer_id === null) && payload.customer_name) {
    try {
      let name = String(payload.customer_name).trim();
      // Do not create customers for placeholder/generic names coming from UI
      if (/^(voice customer|walk-?in customer|customer|unknown)$/i.test(name)) {
        name = null;
      }
      if (!name) {
        // Skip resolution/creation for placeholder names
      } else {
        // Try exact (case-insensitive) match
        const { data: existing } = await supabase
          .from('customers')
          .select('id, name, phone_number')
          .eq('shopkeeper_id', shopkeeperId)
          .ilike('name', name)
          .maybeSingle();
        if (existing && existing.id) {
          insertPayload.customer_id = existing.id;
        } else {
          // Try contains match
          const { data: candidates } = await supabase
            .from('customers')
            .select('id, name, phone_number')
            .eq('shopkeeper_id', shopkeeperId)
            .ilike('name', `%${name}%`);
          if (candidates && candidates.length === 1) {
            insertPayload.customer_id = candidates[0].id;
          } else if (!candidates || candidates.length === 0) {
            // Create a new customer record with provided name (phone optional)
            const createPayload = { shopkeeper_id: shopkeeperId, name };
            if (payload.customer_phone) createPayload.phone_number = String(payload.customer_phone).trim();
            try {
              const { data: created, error: createErr } = await supabase
                .from('customers')
                .insert([createPayload])
                .select('id')
                .single();
              if (!createErr && created && created.id) insertPayload.customer_id = created.id;
            } catch (ce) {
              // ignore create errors — leave customer_id null
              console.warn('[ordersService] create customer failed:', ce.message);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[ordersService] customer resolution error:', e.message);
    }
  }

  try {
    console.log('[ORDERSERVICE][STAGE3] Insert payload:', JSON.stringify(insertPayload));
    console.log('[ORDERSERVICE][STAGE3] Items to insert (pre-match):', JSON.stringify(itemsWithTotals));
  } catch (e) {}

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert([insertPayload])
    .select()
    .single();

  if (orderError) {
    const err = new Error("Failed to create order: " + orderError.message);
    err.status = 500;
    throw err;
  }

  try {
    console.log('[ORDERSERVICE][STAGE4] Inserted order row:', JSON.stringify(order));
  } catch (e) {}

  const matchedItems = await matchInventoryItems(shopkeeperId, itemsWithTotals);

  const itemsToInsert = matchedItems.map((item) => ({
    order_id: order.id,
    inventory_id: item.inventory_id || null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
  }));

  const { data: insertedItems, error: itemsError } = await supabase
    .from("order_items")
    .insert(itemsToInsert)
    .select();

  if (itemsError) {
    // Roll back the order — Supabase JS has no multi-table transaction here.
    await supabase.from("orders").delete().eq("id", order.id);
    const err = new Error("Failed to create order items: " + itemsError.message);
    err.status = 500;
    throw err;
  }

  try {
    console.log('[ORDERSERVICE][STAGE4] Inserted order_items rows:', JSON.stringify(insertedItems));
  } catch (e) {}

  // If caller indicated this is an owner-initiated voice/order, auto-accept the order
  if (payload.owner_initiated === true || payload.owner_voice === true) {
    try {
      const accepted = await acceptOrder(shopkeeperId, order.id, true);
      try { console.log('[ORDERSERVICE][STAGE5] Auto-accepted owner order:', JSON.stringify(accepted)); } catch (e) {}
      return accepted;
    } catch (accErr) {
      console.warn('[ORDERSERVICE] Auto-accept failed:', accErr.message);
      // fall through and return the created order row if accept failed
    }
  }

  // Do NOT deduct stock on order creation. Stock deduction happens on order acceptance.
  // await deductStockForItems(insertedItems);

  const orderLabel = `ORD-${order.id.slice(0, 8).toUpperCase()}`;
  const statusLabel = (insertPayload.order_status || "pending").replace(/^./, (c) => c.toUpperCase());
  const itemLines = (payload.items || []).map((item) => `• ${item.item_name || item.product || "Item"} ×${item.quantity || 1}`).join("\n");
  const totalText = `₹${Number(totalAmount || 0).toLocaleString("en-IN")}`;

  let customerPhone = null;
  if (payload.customer_phone) {
    customerPhone = String(payload.customer_phone).trim();
  } else if (payload.customer_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("phone_number")
      .eq("id", payload.customer_id)
      .maybeSingle();
    customerPhone = customer?.phone_number || null;
  }

  if (customerPhone) {
    try {
      await whatsappService.sendTextMessage(
        customerPhone,
        `✅ *Order confirmed*\n\nOrder ID: *${orderLabel}*\nCustomer: *${payload.customer_name || "Customer"}*\n\nItems:\n${itemLines || "• Item"}\n\nTotal: *${totalText}*\nStatus: *${statusLabel}*`
      );
    } catch (sendErr) {
      console.warn("[Orders] Confirmation WhatsApp failed:", sendErr.message);
    }
  }

  return getOrderById(shopkeeperId, order.id);
}

// =========================================================
// UPDATE ORDER
// =========================================================
export async function updateOrder(shopkeeperId, orderId, payload) {
  const existing = await getOrderById(shopkeeperId, orderId);

  if (TERMINAL_STATUSES.includes(existing.order_status) && payload.order_status) {
    const err = new Error(`Order is already ${existing.order_status} and cannot transition further`);
    err.status = 409;
    throw err;
  }

  const updateData = {};
  ["payment_status", "order_status", "notes", "paid_amount", "customer_id"].forEach((field) => {
    if (payload[field] !== undefined) updateData[field] = payload[field];
  });

  const isNewlyCancelled = payload.order_status === "cancelled" && existing.order_status !== "cancelled";
  const isTransitioningFromAcceptedToCancelled = 
    (payload.order_status === "cancelled" || payload.order_status === "rejected") && 
    existing.order_status === "accepted";

  // Only attempt to write cancellation columns if we are actually cancelling
  // (these columns may not exist in all schema versions)
  if (isNewlyCancelled) {
    // Attempt gracefully — if columns don't exist, Supabase will ignore unknown
    // fields in the patch (it returns an error, but we isolate it below)
    updateData.cancellation_reason = payload.cancellation_reason || null;
  }

  if (payload.items) {
    const itemsWithTotals = computeItemTotals(payload.items);
    const newTotal = sumTotal(itemsWithTotals);
    updateData.total_amount = newTotal;
    updateData.final_amount =
      newTotal - (payload.discount_amount ?? existing.discount_amount) + (payload.tax_amount ?? existing.tax_amount);

    if (existing.order_status === "accepted") {
      await restockItems(existing.order_items);
    }

    const { error: deleteError } = await supabase.from("order_items").delete().eq("order_id", orderId);
    if (deleteError) {
      const err = new Error("Failed to update order items: " + deleteError.message);
      err.status = 500;
      throw err;
    }

    const matchedItems = await matchInventoryItems(shopkeeperId, itemsWithTotals);
    const itemsToInsert = matchedItems.map((item) => ({
      order_id: orderId,
      inventory_id: item.inventory_id || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));

    const { data: newItems, error: insertError } = await supabase
      .from("order_items")
      .insert(itemsToInsert)
      .select();
    if (insertError) {
      const err = new Error("Failed to update order items: " + insertError.message);
      err.status = 500;
      throw err;
    }

    if (existing.order_status === "accepted") {
      await deductStockForItems(newItems);
    }
  } else if (isTransitioningFromAcceptedToCancelled) {
    await restockItems(existing.order_items);
  }

  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId)
    .eq("shopkeeper_id", shopkeeperId)
    .select()
    .single();

  if (updateError) {
    const err = new Error("Failed to update order: " + updateError.message);
    err.status = 500;
    throw err;
  }

  return getOrderById(shopkeeperId, updated.id);
}

// =========================================================
// ACCEPT ORDER
// =========================================================
export async function acceptOrder(shopkeeperId, orderId, triggerProduction = false) {
  const existing = await getOrderById(shopkeeperId, orderId);

  if (existing.order_status !== "pending") {
    const err = new Error("Order can only be accepted when in pending status");
    err.status = 409;
    throw err;
  }

  // Check finished stock for all items
  const insufficientItems = [];
  for (const item of existing.order_items || []) {
    if (!item.inventory_id) continue;
    const { data: inv } = await supabase
      .from("inventory")
      .select("id, item_name, quantity_in_stock, description")
      .eq("id", item.inventory_id)
      .maybeSingle();

    if (inv && inv.quantity_in_stock < item.quantity) {
      insufficientItems.push({
        inventory_id: inv.id,
        item_name: inv.item_name,
        available: inv.quantity_in_stock,
        required: item.quantity,
        need: item.quantity - inv.quantity_in_stock,
        description: inv.description
      });
    }
  }

  if (insufficientItems.length > 0 && !triggerProduction) {
    // Return custom error so frontend knows to show popup
    const first = insufficientItems[0];
    const err = new Error(`Only ${first.available} finished ${first.item_name}(s) available. Produce remaining ${first.need}?`);
    err.status = 400;
    err.code = "INSUFFICIENT_FINISHED_STOCK";
    err.details = {
      item_name: first.item_name,
      required: first.required,
      available: first.available,
      need: first.need
    };
    throw err;
  }

  // If triggerProduction, consume ingredients to create the needed finished stock
  if (triggerProduction && insufficientItems.length > 0) {
    for (const item of insufficientItems) {
      if (item.description) {
        try {
          const descData = JSON.parse(item.description);
          const bom = descData?.bom || descData?.recipe;
          if (bom && typeof bom === "object") {
            // Deduct raw materials/ingredients for the need quantity
            for (const [rawId, qtyPerUnit] of Object.entries(bom)) {
              const { data: rawInv } = await supabase
                .from("inventory")
                .select("id, quantity_in_stock, item_name")
                .eq("id", rawId)
                .maybeSingle();
              if (rawInv) {
                const totalNeeded = Number(qtyPerUnit) * item.need;
                const newQty = Math.max(0, rawInv.quantity_in_stock - totalNeeded);
                await supabase
                  .from("inventory")
                  .update({ quantity_in_stock: newQty })
                  .eq("id", rawInv.id);
              }
            }
          }
        } catch (e) {
          console.error("[Production] BOM parsing err:", e.message);
        }
      }
      
      // Update finished stock of product: add the produced quantity
      const { data: currentProd } = await supabase
        .from("inventory")
        .select("quantity_in_stock")
        .eq("id", item.inventory_id)
        .single();
      const updatedStock = (currentProd?.quantity_in_stock || 0) + item.need;
      await supabase
        .from("inventory")
        .update({ quantity_in_stock: updatedStock })
        .eq("id", item.inventory_id);
    }
  }

  // Update order status to accepted
  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ order_status: "accepted" })
    .eq("id", orderId)
    .eq("shopkeeper_id", shopkeeperId)
    .select()
    .single();

  if (updateError) {
    const err = new Error("Failed to accept order: " + updateError.message);
    err.status = 500;
    throw err;
  }

  // Deduct Finished Stock only
  if (Array.isArray(existing.order_items)) {
    await deductStockForItems(existing.order_items);
  }

  // Record credit ledger entry — triggers fn_update_customer_balance
  if (updated.customer_id) {
    const finalAmt = Number(updated.final_amount || 0);
    const paidAmt = Number(updated.paid_amount || 0);
    const creditAmt = finalAmt - paidAmt;
    if (creditAmt > 0) {
      try {
        const { error: txErr } = await supabase.from("transactions").insert([{
          shopkeeper_id: shopkeeperId,
          customer_id: updated.customer_id,
          order_id: updated.id,
          type: "credit",
          amount: creditAmt,
          payment_method: "adjustment",
          description: `Order ORD-${updated.id.slice(0, 8).toUpperCase()} accepted — ₹${creditAmt} on credit`
        }]);
        if (txErr) {
          console.error("[Ledger] Credit insert failed:", txErr.message);
        }
      } catch (e) {
        console.error("[Ledger] Credit insert failed:", e.message);
      }
    }
  }

  return getOrderById(shopkeeperId, updated.id);
}

// =========================================================
// REJECT ORDER
// =========================================================
export async function rejectOrder(shopkeeperId, orderId) {
  const existing = await getOrderById(shopkeeperId, orderId);

  if (existing.order_status !== "pending" && existing.order_status !== "accepted") {
    const err = new Error("Order can only be rejected from pending or accepted status");
    err.status = 409;
    throw err;
  }

  // Update order status to rejected
  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ order_status: "rejected" })
    .eq("id", orderId)
    .eq("shopkeeper_id", shopkeeperId)
    .select()
    .single();

  if (updateError) {
    const err = new Error("Failed to reject order: " + updateError.message);
    err.status = 500;
    throw err;
  }

  if (existing.order_status === "accepted" && Array.isArray(existing.order_items)) {
    await restockItems(existing.order_items);
  }

  return getOrderById(shopkeeperId, updated.id);
}

// =========================================================
// COMPLETE ORDER
// =========================================================
export async function completeOrder(shopkeeperId, orderId) {
  const existing = await getOrderById(shopkeeperId, orderId);

  if (existing.order_status !== "accepted") {
    const err = new Error("Order can only be completed when in accepted status");
    err.status = 409;
    throw err;
  }

  // Update order status to completed
  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ order_status: "completed" })
    .eq("id", orderId)
    .eq("shopkeeper_id", shopkeeperId)
    .select()
    .single();

  if (updateError) {
    const err = new Error("Failed to complete order: " + updateError.message);
    err.status = 500;
    throw err;
  }

  if (updated && updated.customer_id) {
    updateCustomerMemory(shopkeeperId, updated.customer_id).catch((e) =>
      console.error("[Memory] Update background error:", e)
    );
  }

  return getOrderById(shopkeeperId, updated.id);
}

// =========================================================
// DELETE ORDER
// =========================================================
export async function deleteOrder(shopkeeperId, orderId) {
  const existing = await getOrderById(shopkeeperId, orderId);

  if (existing.order_status !== "cancelled") {
    await restockItems(existing.order_items);
  }

  const { error } = await supabase.from("orders").delete().eq("id", orderId).eq("shopkeeper_id", shopkeeperId);
  if (error) {
    const err = new Error("Failed to delete order: " + error.message);
    err.status = 500;
    throw err;
  }

  return { id: orderId };
}

// =========================================================
// SEND PAYMENT REMINDER
// =========================================================
export async function sendReminder(shopkeeperId, orderId, userId, { channel, message } = {}) {
  const order = await getOrderById(shopkeeperId, orderId);

  if (order.payment_status === "fully_paid") {
    const err = new Error("Reminders can only be sent for orders with an outstanding balance");
    err.status = 409;
    throw err;
  }

  const outstanding = Number(order.final_amount) - Number(order.paid_amount || 0);
  const reminderMessage =
    message ||
    `This is a reminder that a payment of ₹${outstanding} for order ${order.order_number} is still pending. Please pay at your earliest convenience.`;

  // Actual WhatsApp/SMS dispatch is delegated to the existing whatsappService —
  // this just validates, logs, and returns a consistent response.
  const { data: reminder, error } = await supabase
    .from("order_reminders")
    .insert([
      {
        order_id: orderId,
        shopkeeper_id: shopkeeperId,
        channel: channel || "whatsapp",
        status: "queued",
        message_snapshot: reminderMessage,
        sent_by: userId || null,
      },
    ])
    .select()
    .single();

  if (error) {
    const err = new Error("Failed to log reminder: " + error.message);
    err.status = 500;
    throw err;
  }

  return reminder;
}
