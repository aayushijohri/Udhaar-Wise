import { supabaseAdmin as supabase } from "../config/supabase.js";

/** Ported from premium_module (FastAPI) → subscription_plans / subscriptions tables. */

export async function listPlans() {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("active", true)
    .order("monthly_price", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getCurrentSubscription(shopkeeperId) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, subscription_plans(*)")
    .eq("shopkeeper_id", shopkeeperId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function upgradeSubscription(shopkeeperId, { planId, billingCycle = "monthly" }) {
  if (!planId) {
    const err = new Error("planId is required");
    err.status = 400;
    throw err;
  }

  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .eq("active", true)
    .single();

  if (planError || !plan) {
    const err = new Error("Plan not found or inactive");
    err.status = 404;
    throw err;
  }

  const days = billingCycle === "yearly" ? 365 : 30;
  const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  // Cancel any existing active subscription first
  await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("shopkeeper_id", shopkeeperId)
    .eq("status", "active");

  const { data, error } = await supabase
    .from("subscriptions")
    .insert([
      {
        shopkeeper_id: shopkeeperId,
        plan_id: planId,
        status: "active",
        billing_cycle: billingCycle,
        expiry_date: expiryDate,
        auto_renew: true,
      },
    ])
    .select("*, subscription_plans(*)")
    .single();

  if (error) throw error;
  return data;
}

export async function cancelSubscription(shopkeeperId) {
  const { data, error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", auto_renew: false })
    .eq("shopkeeper_id", shopkeeperId)
    .eq("status", "active")
    .select()
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const err = new Error("No active subscription to cancel");
    err.status = 404;
    throw err;
  }
  return data;
}

export async function getFeatureAccess(shopkeeperId) {
  const subscription = await getCurrentSubscription(shopkeeperId);

  if (!subscription || subscription.status !== "active") {
    // Free-tier defaults when no active paid plan exists
    return {
      plan: "free",
      analytics_enabled: false,
      priority_support: false,
      inventory_predictions: false,
      custom_branding: false,
      max_orders: 50,
      max_customers: 50,
      max_ai_requests: 20,
      max_voice_notes: 10,
    };
  }

  const plan = subscription.subscription_plans;
  return {
    plan: plan.name,
    analytics_enabled: plan.analytics_enabled,
    priority_support: plan.priority_support,
    inventory_predictions: plan.inventory_predictions,
    custom_branding: plan.custom_branding,
    max_orders: plan.max_orders,
    max_customers: plan.max_customers,
    max_ai_requests: plan.max_ai_requests,
    max_voice_notes: plan.max_voice_notes,
  };
}
