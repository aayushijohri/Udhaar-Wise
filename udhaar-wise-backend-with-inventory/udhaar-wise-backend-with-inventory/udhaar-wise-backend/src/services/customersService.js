import { supabaseAdmin as supabase } from "../config/supabase.js";
import * as aiService from "../services/aiService.js";
import { getCustomerMemoryData, updateCustomerMemory } from "./customerMemoryService.js";

/**
 * Ported from customers-module (CommonJS → ESM), adapted to the existing
 * `customers` table (see Integration Plan: business_id -> shopkeeper_id,
 * reuse existing `customers` table rather than a second one).
 *
 * NOT ported: AI-insights and purchase-timeline enrichment on the profile
 * endpoint. The original read from `customer_ai_insights` and an
 * `orders.occasion_type` column that don't exist in this schema — that
 * data doesn't exist anywhere yet, so returning a plausible-looking value
 * would be misleading. Both come back as `null` until AI Intake (deferred)
 * and occasion-tracking are built.
 */

// Only columns that exist in schema.sql (base migration — no migrations_modules.sql applied yet)
const LIST_SELECT =
  "id, name, phone_number, email, max_credit_limit, current_balance, is_active, created_at, updated_at";

export async function listCustomers(shopkeeperId, { search, filter, page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  let query = supabase
    .from("customers")
    .select(`${LIST_SELECT}, orders ( id, final_amount, created_at )`)
    .eq("shopkeeper_id", shopkeeperId)
    .eq("is_active", true);

  if (search) {
    const digitsOnly = search.replace(/\D/g, "");
    const orParts = [`name.ilike.%${search}%`];
    if (digitsOnly) orParts.push(`phone_number.like.%${digitsOnly}%`);
    query = query.or(orParts.join(","));
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    const err = new Error("Failed to fetch customers: " + error.message);
    err.status = 500;
    throw err;
  }

  let customersList = (data || []).map((customer) => {
    const ordersList = customer.orders || [];
    const totalOrders = ordersList.length;
    const totalSpending = ordersList.reduce((sum, o) => sum + Number(o.final_amount || 0), 0);

    let lastPurchaseDate = null;
    if (ordersList.length > 0) {
      const sorted = [...ordersList].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      lastPurchaseDate = sorted[0].created_at;
    }

    // Infer tag in-memory since migrations_modules.sql may not be applied
    const tag = totalSpending >= 50000 || totalOrders >= 25 ? "VIP"
      : totalOrders >= 10 ? "Loyal"
      : totalOrders >= 4 ? "Growing"
      : "New";

    const { orders, ...rest } = customer;
    return {
      ...rest,
      tag,
      total_orders: totalOrders,
      total_spending: totalSpending,
      last_purchase_date: lastPurchaseDate,
    };
  });

  // Apply tag filter in-memory (tag column may not exist in DB)
  if (filter && filter !== "All") {
    customersList = customersList.filter((c) => c.tag === filter);
  }

  const total = customersList.length;
  const paged = customersList.slice(offset, offset + limit);

  return {
    customers: paged,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getCustomerProfile(shopkeeperId, customerId) {
  const { data, error } = await supabase
    .from("customers")
    .select(`${LIST_SELECT}, orders ( id, final_amount, created_at, order_status, updated_at, order_items ( quantity, unit_price, inventory ( item_name ) ) )`)
    .eq("shopkeeper_id", shopkeeperId)
    .eq("id", customerId)
    .eq("is_active", true);

  if (error) {
    const err = new Error("Failed to fetch customer: " + error.message);
    err.status = 500;
    throw err;
  }

  const customerObj = data && data.length > 0 ? data[0] : null;

  if (!customerObj) {
    const err = new Error("Customer not found");
    err.status = 404;
    throw err;
  }

  const ordersList = customerObj.orders || [];
  const totalOrders = ordersList.length;
  const totalSpending = ordersList.reduce((sum, o) => sum + Number(o.final_amount || 0), 0);

  let lastPurchaseDate = null;
  if (ordersList.length > 0) {
    const sorted = [...ordersList].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    lastPurchaseDate = sorted[0].created_at;
  }

  // Generate AI-powered timeline
  const timeline = aiService.generateCustomerTimeline(ordersList);

  // Get memory from backend file
  let aiMemoryObject = getCustomerMemoryData(shopkeeperId, customerId);
  if (!aiMemoryObject) {
    await updateCustomerMemory(shopkeeperId, customerId);
    aiMemoryObject = getCustomerMemoryData(shopkeeperId, customerId);
  }

  const { orders, ...rest } = customerObj;

  return {
    ...rest,
    total_orders: totalOrders,
    total_spending: totalSpending,
    last_purchase_date: lastPurchaseDate,
    ai_memory: aiMemoryObject, // Object of 16 keys containing business insights
    timeline
  };
}

export async function createCustomer(shopkeeperId, payload) {
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("shopkeeper_id", shopkeeperId)
    .eq("phone_number", payload.phone_number)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) {
    const err = new Error("A customer with this phone number already exists");
    err.status = 409;
    throw err;
  }

  const insertPayload = {
    shopkeeper_id: shopkeeperId,
    name: payload.name,
    phone_number: payload.phone_number,
    email: payload.email || null,
    max_credit_limit: payload.max_credit_limit ?? 10000.0,
    reminder_frequency_days: payload.reminder_frequency_days ?? 7,
    tag: payload.tag || null,
    preferred_payment_method: payload.preferred_payment_method || null,
    notes: payload.notes || null,
  };

  const { data, error } = await supabase.from("customers").insert([insertPayload]).select(LIST_SELECT).single();

  if (error) {
    const err = new Error("Failed to create customer: " + error.message);
    err.status = 500;
    throw err;
  }
  return data;
}

export async function updateCustomer(shopkeeperId, customerId, payload) {
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("shopkeeper_id", shopkeeperId)
    .eq("id", customerId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) {
    const err = new Error("Customer not found");
    err.status = 404;
    throw err;
  }

  const allowed = [
    "name",
    "phone_number",
    "email",
    "max_credit_limit",
    "reminder_frequency_days",
    "tag",
    "preferred_payment_method",
    "notes",
    "is_active",
  ];
  const patch = {};
  for (const key of allowed) {
    if (payload[key] !== undefined) patch[key] = payload[key];
  }
  // If a human sets tag explicitly, pin it so any future auto-tagging job
  // (out of scope here) never silently overwrites it.
  if (patch.tag) patch.tag_is_manual = true;
  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("customers")
    .update(patch)
    .eq("shopkeeper_id", shopkeeperId)
    .eq("id", customerId)
    .select(LIST_SELECT)
    .single();

  if (error) {
    const err = new Error("Failed to update customer: " + error.message);
    err.status = 500;
    throw err;
  }
  return data;
}

export async function softDeleteCustomer(shopkeeperId, customerId) {
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("shopkeeper_id", shopkeeperId)
    .eq("id", customerId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) {
    const err = new Error("Customer not found");
    err.status = 404;
    throw err;
  }

  const { error } = await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("shopkeeper_id", shopkeeperId)
    .eq("id", customerId);

  if (error) {
    const err = new Error("Failed to delete customer: " + error.message);
    err.status = 500;
    throw err;
  }
  return { id: customerId };
}
