import { supabaseAdmin as supabase } from "../config/supabase.js";

/**
 * Ported from settings_module (FastAPI). Profile reuses the existing
 * `users` table instead of a new business_profiles table (see Integration
 * Plan: business_profiles → users). Preferences and billing use new tables.
 */

// ---- Profile (business_profiles → users) ----------------------------

export async function getProfile(shopkeeperId) {
  const { data: list, error } = await supabase
    .from("users")
    .select("id, business_name, phone_number, email, address, currency, created_at, updated_at")
    .eq("id", shopkeeperId);

  if (error) throw error;

  const data = list && list.length > 0 ? list[0] : null;

  if (!data) {
    let email = "";
    let phone = "";
    try {
      const { data: authUserData } = await supabase.auth.admin.getUserById(shopkeeperId);
      if (authUserData?.user) {
        email = authUserData.user.email || "";
        phone = authUserData.user.phone || "";
      }
    } catch (authErr) {
      console.error("Auth getUserById error in getProfile:", authErr);
    }

    const fallbackPhone = phone || `temp-${shopkeeperId.slice(0, 8)}-${Date.now()}`;

    const insertPayload = {
      id: shopkeeperId,
      business_name: "My Business",
      phone_number: fallbackPhone,
      email: email,
      address: "",
      currency: "INR"
    };

    const { data: createdList, error: insertError } = await supabase
      .from("users")
      .insert([insertPayload])
      .select("id, business_name, phone_number, email, address, currency, created_at, updated_at");

    if (insertError) {
      console.error("Supabase insert error in getProfile:", insertError);
      return insertPayload;
    }

    if (createdList && createdList.length > 0) {
      return createdList[0];
    }
    return insertPayload;
  }

  return data;
}

export async function updateProfile(shopkeeperId, updates) {
  const allowed = ["business_name", "phone_number", "email", "address", "currency"];
  const payload = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) payload[key] = updates[key];
  }

  const { data: list, error } = await supabase
    .from("users")
    .update(payload)
    .eq("id", shopkeeperId)
    .select();

  if (error) throw error;
  if (!list || list.length === 0) {
    throw new Error("Profile not found");
  }
  return list[0];
}

// ---- Billing (reads from Premium module's subscriptions table) ------

export async function getBilling(shopkeeperId) {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("id, status, billing_cycle, start_date, expiry_date, auto_renew, subscription_plans(name, monthly_price, yearly_price)")
      .eq("shopkeeper_id", shopkeeperId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { status: "none", plan: null, message: "No active subscription" };
    return data;
  } catch (err) {
    // Table may not exist if migrations_modules.sql was not applied
    console.warn("[settings] getBilling fallback:", err.message);
    return { status: "none", plan: null, message: "No active subscription" };
  }
}

// ---- Preferences ------------------------------------------------------

const DEFAULT_PREFS = (shopkeeperId) => ({
  shopkeeper_id: shopkeeperId,
  language: "english",
  theme: "system",
  notifications_enabled: true,
  voice_auto_parse: true,
  screenshot_auto_parse: true,
  auto_create_orders: false,
  human_review_required: true,
  confidence_threshold: 0.80,
});

export async function getPreferences(shopkeeperId) {
  try {
    const { data: list, error } = await supabase
      .from("preferences")
      .select("*")
      .eq("shopkeeper_id", shopkeeperId);

    if (error) throw error;

    if (list && list.length > 0) return list[0];

    // Table exists but no row — create one with defaults
    const { data: createdList, error: createError } = await supabase
      .from("preferences")
      .insert([{ shopkeeper_id: shopkeeperId }])
      .select();

    if (createError) throw createError;
    return (createdList && createdList.length > 0) ? createdList[0] : DEFAULT_PREFS(shopkeeperId);
  } catch (err) {
    // Table may not exist — return in-memory defaults
    console.warn("[settings] getPreferences fallback:", err.message);
    return DEFAULT_PREFS(shopkeeperId);
  }
}

export async function updatePreferences(shopkeeperId, updates) {
  const allowed = [
    "language",
    "theme",
    "notifications_enabled",
    "voice_auto_parse",
    "screenshot_auto_parse",
    "auto_create_orders",
    "human_review_required",
    "confidence_threshold",
  ];
  const payload = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) payload[key] = updates[key];
  }

  try {
    const { data: list, error } = await supabase
      .from("preferences")
      .upsert([{ shopkeeper_id: shopkeeperId, ...payload }], { onConflict: "shopkeeper_id" })
      .select();

    if (error) throw error;
    if (!list || list.length === 0) return { ...DEFAULT_PREFS(shopkeeperId), ...payload };
    return list[0];
  } catch (err) {
    console.warn("[settings] updatePreferences fallback:", err.message);
    return { ...DEFAULT_PREFS(shopkeeperId), ...payload };
  }
}
