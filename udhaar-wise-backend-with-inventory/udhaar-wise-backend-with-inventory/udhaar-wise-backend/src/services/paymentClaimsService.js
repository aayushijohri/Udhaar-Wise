/**
 * paymentClaimsService.js
 *
 * Manages pending payment claims sent via WhatsApp.
 * A customer sends "500 paid", which creates a PENDING claim.
 * The shopkeeper must Approve or Reject from the dashboard.
 * On approval, paid_amount is updated on the matched orders (FIFO).
 */

import { supabaseAdmin as supabase } from "../config/supabase.js";
import { readMemoryFile, writeMemoryFile } from "./customerMemoryService.js";

const SELECT_FIELDS = `
  id, shopkeeper_id, customer_id, amount, payment_mode, raw_message,
  status, created_at, approved_at, rejected_at, notes,
  customers ( id, name, phone_number )
`;

// Create a pending payment claim from a customer WhatsApp message
export async function createPaymentClaim(shopkeeperId, customerId, { amount, payment_mode, raw_message }) {
  const { data, error } = await supabase
    .from("payment_claims")
    .insert([{
      shopkeeper_id: shopkeeperId,
      customer_id: customerId,
      amount: Number(amount),
      payment_mode: payment_mode || "cash",
      raw_message: raw_message || null,
      status: "pending",
    }])
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    const err = new Error("Failed to create payment claim: " + error.message);
    err.status = 500;
    throw err;
  }
  return data;
}

// List payment claims (filtered by status) — enriched with candidate orders
export async function listPaymentClaims(shopkeeperId, { status } = {}) {
  let q = supabase
    .from("payment_claims")
    .select(SELECT_FIELDS)
    .eq("shopkeeper_id", shopkeeperId)
    .order("created_at", { ascending: false });

  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) {
    const err = new Error("Failed to list payment claims: " + error.message);
    err.status = 500;
    throw err;
  }

  const claims = data || [];

  const enriched = await Promise.all(
    claims.map(async (claim) => {
      try {
        const { data: unpaidOrders } = await supabase
          .from("orders")
          .select(`
            id, final_amount, paid_amount, payment_status,
            order_items ( quantity, unit_price, inventory ( item_name ) )
          `)
          .eq("customer_id", claim.customer_id)
          .eq("shopkeeper_id", shopkeeperId)
          .in("payment_status", ["unpaid", "partially_paid"])
          .order("created_at", { ascending: true });

        const candidate_orders = (unpaidOrders || []).map((ord) => {
          const items = (ord.order_items || []).map((i) => ({
            item_name: i.inventory?.item_name || "Item",
            quantity: i.quantity,
            unit_price: i.unit_price,
          }));
          const items_summary = items.length > 0
            ? items.map((i) => `${i.item_name} ×${i.quantity}`).join(", ")
            : `ORD-${ord.id.slice(0, 8).toUpperCase()}`;
          const owed = Number(ord.final_amount || 0) - Number(ord.paid_amount || 0);
          return {
            order_id: ord.id,
            order_number: `ORD-${ord.id.slice(0, 8).toUpperCase()}`,
            total_amount: Number(ord.final_amount || 0),
            paid_amount: Number(ord.paid_amount || 0),
            remaining: owed,
            items,
            items_summary,
          };
        });

        return { ...claim, candidate_orders };
      } catch {
        return { ...claim, candidate_orders: [] };
      }
    })
  );

  return enriched;
}

// Approve payment claim using FIFO logic across unpaid orders and register transaction
export async function approvePaymentClaim(shopkeeperId, claimId) {
  const { data: claim, error: claimError } = await supabase
    .from("payment_claims")
    .select("*")
    .eq("id", claimId)
    .eq("shopkeeper_id", shopkeeperId)
    .single();

  if (claimError || !claim || claim.status !== "pending") {
    throw new Error("Invalid or already processed claim.");
  }

  const { data: unpaidOrders } = await supabase
    .from("orders")
    .select("id, final_amount, paid_amount, order_status")
    .eq("customer_id", claim.customer_id)
    .eq("shopkeeper_id", shopkeeperId)
    .in("payment_status", ["unpaid", "partially_paid"])
    .order("created_at", { ascending: true });

  let remainingToApply = Number(claim.amount);
  const allocations = [];

  for (const order of unpaidOrders || []) {
    if (remainingToApply <= 0) break;
    const owed = Number(order.final_amount) - Number(order.paid_amount);
    const payment = Math.min(remainingToApply, owed);
    const newPaid = Number(order.paid_amount) + payment;
    const isFullyPaid = newPaid >= Number(order.final_amount);
    const newPaymentStatus = isFullyPaid ? "fully_paid" : "partially_paid";
    const newOrderStatus = isFullyPaid ? "completed" : order.order_status;

    await supabase.from("orders").update({
      paid_amount: newPaid,
      payment_status: newPaymentStatus,
      order_status: newOrderStatus
    }).eq("id", order.id);

    remainingToApply -= payment;
    allocations.push({
      order_id: order.id,
      order_number: `ORD-${order.id.slice(0, 8).toUpperCase()}`,
      applied: payment,
      remaining: Math.max(0, owed - payment),
      fully_paid: isFullyPaid
    });
  }

  await supabase.from("payment_claims").update({
    status: "approved",
    approved_at: new Date().toISOString()
  }).eq("id", claimId);

  // Sanitize payment_method to allowed DB values
  const ALLOWED_METHODS = ["cash", "upi", "bank_transfer", "adjustment"];
  const rawMethod = (claim.payment_mode || "cash").toLowerCase();
  const paymentMethod = ALLOWED_METHODS.includes(rawMethod) ? rawMethod : "cash";

  // Insert ledger transaction — triggers fn_update_customer_balance
  await supabase.from("transactions").insert([{
    shopkeeper_id: shopkeeperId,
    customer_id: claim.customer_id,
    type: "payment",
    amount: Number(claim.amount),
    payment_method: paymentMethod,
    description: claim.raw_message || `Payment of ₹${claim.amount} approved`
  }]);

  return { success: true, allocations };
}

// Reject a payment claim
export async function rejectPaymentClaim(shopkeeperId, claimId, notes = "") {
  const { error } = await supabase
    .from("payment_claims")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      notes,
    })
    .eq("id", claimId)
    .eq("shopkeeper_id", shopkeeperId);

  if (error) {
    const err = new Error("Failed to reject payment claim: " + error.message);
    err.status = 500;
    throw err;
  }
  return { success: true };
}

// Record direct payment by owner without creating a claim
export async function recordDirectPayment(shopkeeperId, customerId, amount, payment_mode, rawMessage) {
  const { data: unpaidOrders } = await supabase
    .from("orders")
    .select("id, final_amount, paid_amount, order_status")
    .eq("customer_id", customerId)
    .eq("shopkeeper_id", shopkeeperId)
    .in("payment_status", ["unpaid", "partially_paid"])
    .order("created_at", { ascending: true });

  let remaining = Number(amount);
  const allocations = [];

  for (const ord of unpaidOrders || []) {
    if (remaining <= 0) break;
    const owed = Number(ord.final_amount || 0) - Number(ord.paid_amount || 0);
    if (owed <= 0) continue;
    const applying = Math.min(remaining, owed);
    const newPaid = Number(ord.paid_amount || 0) + applying;
    const isFullyPaid = newPaid >= Number(ord.final_amount || 0);
    const newPaymentStatus = isFullyPaid ? "fully_paid" : "partially_paid";
    const newOrderStatus = isFullyPaid ? "completed" : ord.order_status;
    
    await supabase.from("orders")
      .update({ paid_amount: newPaid, payment_status: newPaymentStatus, order_status: newOrderStatus })
      .eq("id", ord.id)
      .eq("shopkeeper_id", shopkeeperId);
      
    remaining -= applying;
    allocations.push({
      order_id: ord.id,
      applied: applying,
      remaining: Math.max(0, owed - applying),
      fully_paid: isFullyPaid
    });
  }

  // Insert ledger transaction directly
  const ALLOWED_METHODS = ["cash", "upi", "bank_transfer", "adjustment"];
  const rawMethod = (payment_mode || "cash").toLowerCase();
  const paymentMethod = ALLOWED_METHODS.includes(rawMethod) ? rawMethod : "cash";

  await supabase.from("transactions").insert([{
    shopkeeper_id: shopkeeperId,
    customer_id: customerId,
    type: "payment",
    amount: Number(amount),
    payment_method: paymentMethod,
    description: rawMessage || `Direct payment of ₹${amount} recorded by owner`
  }]);

  return { success: true, allocations };
}

// Explicit memory saver function
export function saveExplicitMemory(shopkeeperId, customerId, { special_events, preferences, preferred_payment_mode }) {
  const allMemories = readMemoryFile();
  const key = `${shopkeeperId}:${customerId}`;
  const existing = allMemories[key] || {};
  
  if (special_events) existing.birthdays = special_events;
  if (preferences) existing.customizations = preferences;
  if (preferred_payment_mode) existing.preferred_payment_method = preferred_payment_mode;
  
  allMemories[key] = {
    ...existing,
    favorite_products: existing.favorite_products || existing.favouriteProducts || "None yet",
    buy_frequency: existing.buy_frequency || existing.buyingFrequency || "Occasional",
    average_bill: existing.average_bill || existing.averageBill || "—",
    payment_behaviour: existing.payment_behaviour || existing.paymentBehaviour || "Standard credit limits",
    preferred_payment_method: existing.preferred_payment_method || (preferred_payment_mode || "UPI/GPay"),
    preferred_order_time: existing.preferred_order_time || "Business hours",
    birthdays: existing.birthdays || (special_events || "Not recorded"),
    customizations: existing.customizations || (preferences || "Standard specs"),
    repeat_score: existing.repeat_score || "Good",
    risk_score: existing.risk_score || "Low",
    lifetime_spend: existing.lifetime_spend || "₹0",
    predicted_next_purchase: existing.predicted_next_purchase || "Not predicted",
    ai_suggestions: existing.ai_suggestions || "No recommendations",
  };
  writeMemoryFile(allMemories);
}

