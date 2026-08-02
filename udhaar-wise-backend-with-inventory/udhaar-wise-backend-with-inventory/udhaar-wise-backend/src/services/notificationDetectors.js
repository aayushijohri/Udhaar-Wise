import { supabaseAdmin as supabase } from "../config/supabase.js";

/**
 * Ported from notification_module/detectors/*.py, adapted to the columns
 * that actually exist in this schema (no orders.due_date, no
 * customer_reminders/inventory_items tables). Where the original detector
 * needs data this schema doesn't track yet, that's called out below rather
 * than silently faked — see Integration Report "Manual Steps".
 */

function dedupeKey(...parts) {
  return parts.join(":");
}
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ---- Payment reminders --------------------------------------------------
// Original design used orders.due_date to compute overdue milestones.
// That column doesn't exist in this schema, so this is a reduced-fidelity
// version: flags customers with an outstanding negative balance.
export async function detectPaymentReminders(shopkeeperId) {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, current_balance")
    .eq("shopkeeper_id", shopkeeperId)
    .lt("current_balance", 0);

  if (error) throw error;

  return (data || []).map((c) => ({
    shopkeeper_id: shopkeeperId,
    category: "payment",
    type: "payment_pending",
    dedupe_key: dedupeKey("payment_pending", c.id, todayKey()),
    title: "Payment pending",
    message: `₹${Math.abs(c.current_balance)} pending from ${c.name}`,
    severity: Math.abs(c.current_balance) > 5000 ? "warning" : "info",
    reference_type: "customer",
    reference_id: c.id,
    metadata: { amount_due: Math.abs(c.current_balance), customer_name: c.name },
  }));
}

// ---- Inventory alerts -----------------------------------------------------
export async function detectInventoryAlerts(shopkeeperId) {
  const { data, error } = await supabase
    .from("inventory")
    .select("id, item_name, quantity_in_stock, min_stock_threshold")
    .eq("shopkeeper_id", shopkeeperId)
    .eq("is_active", true);

  if (error) throw error;

  const candidates = [];
  for (const item of data || []) {
    if (item.quantity_in_stock <= 0) {
      candidates.push({
        shopkeeper_id: shopkeeperId,
        category: "inventory",
        type: "out_of_stock",
        dedupe_key: dedupeKey("out_of_stock", item.id, todayKey()),
        title: "Out of stock",
        message: `${item.item_name} is out of stock.`,
        severity: "critical",
        reference_type: "inventory",
        reference_id: item.id,
        metadata: { stock_qty: item.quantity_in_stock },
      });
    } else if (item.quantity_in_stock <= (item.min_stock_threshold ?? 5)) {
      candidates.push({
        shopkeeper_id: shopkeeperId,
        category: "inventory",
        type: "low_stock",
        dedupe_key: dedupeKey("low_stock", item.id, todayKey()),
        title: "Low stock",
        message: `${item.item_name} is running low.`,
        severity: "warning",
        reference_type: "inventory",
        reference_id: item.id,
        metadata: { stock_qty: item.quantity_in_stock, threshold: item.min_stock_threshold },
      });
    }
  }
  return candidates;
}

// ---- Subscription alerts (Premium module's subscriptions table) ---------
export async function detectSubscriptionAlerts(shopkeeperId) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, expiry_date, status, subscription_plans(name)")
    .eq("shopkeeper_id", shopkeeperId)
    .eq("status", "active");

  if (error) throw error;

  const candidates = [];
  const now = Date.now();
  for (const sub of data || []) {
    const daysLeft = Math.ceil((new Date(sub.expiry_date).getTime() - now) / (24 * 60 * 60 * 1000));
    if (daysLeft <= 7) {
      candidates.push({
        shopkeeper_id: shopkeeperId,
        category: "subscription",
        type: "subscription_expiring",
        dedupe_key: dedupeKey("subscription_expiring", sub.id, todayKey()),
        title: "Subscription expiring soon",
        message: `Your ${sub.subscription_plans?.name || "plan"} subscription expires in ${daysLeft} day(s).`,
        severity: daysLeft <= 2 ? "critical" : "warning",
        reference_type: "subscription",
        reference_id: sub.id,
        metadata: { days_left: daysLeft },
      });
    }
  }
  return candidates;
}

// ---- Occasion reminders ---------------------------------------------------
// Original design read a customer_reminders table (occasion_type,
// reminder_date) that this schema doesn't have — customers only has
// `reminder_frequency_days`, not birthday/anniversary dates. Left as a
// no-op until that table/columns exist; see Integration Report.
export async function detectOccasionReminders(_shopkeeperId) {
  return [];
}

// ---- AI alerts --------------------------------------------------------
// Original design read an AI-usage/quota table that doesn't exist in this
// schema (AI Intake module wasn't ported — see Integration Plan). No-op.
export async function detectAiAlerts(_shopkeeperId) {
  return [];
}
