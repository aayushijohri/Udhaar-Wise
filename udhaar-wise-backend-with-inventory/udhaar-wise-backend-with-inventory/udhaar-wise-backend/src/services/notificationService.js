import { supabaseAdmin as supabase } from "../config/supabase.js";
import * as detectors from "./notificationDetectors.js";

/** Ported from notification_module (FastAPI) → notifications / notification_preferences tables. */

const CATEGORIES = ["payment", "occasion", "inventory", "ai", "subscription"];

export async function listNotifications(shopkeeperId, { category, isRead, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("shopkeeper_id", shopkeeperId)
    .eq("is_dismissed", false)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq("category", category);
  if (isRead !== undefined) query = query.eq("is_read", isRead);

  const { data, error, count } = await query;
  if (error) throw error;
  return { items: data, total: count };
}

export async function listByCategory(shopkeeperId, category, opts = {}) {
  return listNotifications(shopkeeperId, { ...opts, category });
}

export async function listRecent(shopkeeperId, { limit = 10 } = {}) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("shopkeeper_id", shopkeeperId)
    .eq("is_dismissed", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function markAllRead(shopkeeperId) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("shopkeeper_id", shopkeeperId)
    .eq("is_read", false);

  if (error) throw error;
  return { success: true };
}

export async function markRead(shopkeeperId, notificationId) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("shopkeeper_id", shopkeeperId)
    .eq("id", notificationId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const err = new Error("Notification not found");
    err.status = 404;
    throw err;
  }
  return data;
}

export async function dismiss(shopkeeperId, notificationId) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
    .eq("shopkeeper_id", shopkeeperId)
    .eq("id", notificationId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const err = new Error("Notification not found");
    err.status = 404;
    throw err;
  }
  return data;
}

export async function listPreferences(shopkeeperId) {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("shopkeeper_id", shopkeeperId);

  if (error) throw error;

  // Ensure every category has a row; return defaults for any missing ones
  const existing = new Map((data || []).map((p) => [p.category, p]));
  return CATEGORIES.map(
    (category) =>
      existing.get(category) || {
        shopkeeper_id: shopkeeperId,
        category,
        in_app_enabled: true,
        email_enabled: false,
        whatsapp_enabled: false,
      }
  );
}

export async function updatePreference(shopkeeperId, category, updates) {
  if (!CATEGORIES.includes(category)) {
    const err = new Error(`Invalid category: ${category}`);
    err.status = 400;
    throw err;
  }

  const allowed = ["in_app_enabled", "email_enabled", "whatsapp_enabled"];
  const payload = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) payload[key] = updates[key];
  }

  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert([{ shopkeeper_id: shopkeeperId, category, ...payload }], {
      onConflict: "shopkeeper_id,category",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * generateReminders — runs all detectors for a shopkeeper and inserts new
 * notification candidates, relying on the unique (shopkeeper_id, dedupe_key)
 * constraint to silently skip duplicates. Callable on demand from a route,
 * or wired into a cron/scheduled job later (no scheduler exists in this
 * project today — see Integration Report "Manual Steps").
 */
export async function generateReminders(shopkeeperId) {
  const [payment, inventory, subscription, occasion, ai] = await Promise.all([
    detectors.detectPaymentReminders(shopkeeperId),
    detectors.detectInventoryAlerts(shopkeeperId),
    detectors.detectSubscriptionAlerts(shopkeeperId),
    detectors.detectOccasionReminders(shopkeeperId),
    detectors.detectAiAlerts(shopkeeperId),
  ]);

  const candidates = [...payment, ...inventory, ...subscription, ...occasion, ...ai];
  if (candidates.length === 0) return { created: 0, skipped_duplicates: 0 };

  const { data, error } = await supabase
    .from("notifications")
    .upsert(candidates, { onConflict: "shopkeeper_id,dedupe_key", ignoreDuplicates: true })
    .select();

  if (error) throw error;

  return {
    created: data?.length || 0,
    skipped_duplicates: candidates.length - (data?.length || 0),
  };
}
