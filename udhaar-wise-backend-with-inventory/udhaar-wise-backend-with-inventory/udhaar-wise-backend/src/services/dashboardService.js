import { supabaseAdmin as supabase } from "../config/supabase.js";

/**
 * Ported from dashboard_module (FastAPI). No new tables — every endpoint
 * aggregates over the existing orders / customers / inventory / transactions
 * tables, scoped by shopkeeper_id.
 */

function daysAgoIso(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// Decode source/input_type that createOrder embeds as a [source:X][input:Y] prefix in notes.
function parseNotesMeta(notes) {
  if (notes && notes.startsWith("[source:")) {
    const match = notes.match(/^\[source:([^\]]+)\]\[input:([^\]]+)\](.*)$/);
    if (match) {
      return { source: match[1], input_type: match[2], cleanNotes: match[3].trim() };
    }
  }
  return { source: "manual_entry", input_type: "text", cleanNotes: notes || "" };
}

export async function getOverview(shopkeeperId) {
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);
  const thisMonthIso = thisMonthStart.toISOString();

  const [
    { count: totalOrders },
    { count: totalCustomers },
    { count: lowStock },
    allOrders,
    thisMonthOrders,
    unpaidOrdersRes,
    customersRes,
  ] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("shopkeeper_id", shopkeeperId),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("shopkeeper_id", shopkeeperId),
    supabase
      .from("inventory")
      .select("id", { count: "exact", head: true })
      .eq("shopkeeper_id", shopkeeperId)
      .lte("quantity_in_stock", 5),
    supabase.from("orders").select("final_amount").eq("shopkeeper_id", shopkeeperId),
    supabase
      .from("orders")
      .select("id, final_amount", { count: "exact" })
      .eq("shopkeeper_id", shopkeeperId)
      .gte("created_at", thisMonthIso),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("shopkeeper_id", shopkeeperId)
      .eq("payment_status", "unpaid"),
    supabase
      .from("customers")
      .select("current_balance")
      .eq("shopkeeper_id", shopkeeperId),
  ]);

  const totalRevenue = (allOrders.data || []).reduce((sum, o) => sum + Number(o.final_amount || 0), 0);
  const monthlyRevenue = (thisMonthOrders.data || []).reduce((sum, o) => sum + Number(o.final_amount || 0), 0);
  const ordersThisMonth = thisMonthOrders.count || 0;
  const unpaidOrders = unpaidOrdersRes.count || 0;

  // pending_udhaar = total outstanding negative balance across all customers
  const pendingUdhaar = (customersRes.data || [])
    .filter((c) => Number(c.current_balance) < 0)
    .reduce((sum, c) => sum + Math.abs(Number(c.current_balance)), 0);

  // Simple loan eligibility score: 0–100 based on revenue and repayment behaviour
  const repaymentRatio = totalOrders ? 1 - unpaidOrders / totalOrders : 1;
  const loanEligibilityScore = Math.min(100, Math.round(repaymentRatio * 70 + Math.min(totalRevenue / 100000, 30)));

  return {
    // Legacy fields (kept for backward compatibility)
    total_orders: totalOrders || 0,
    total_customers: totalCustomers || 0,
    total_revenue: totalRevenue,
    low_stock_items: lowStock || 0,
    // Fields used by the frontend dashboard cards
    monthly_revenue: monthlyRevenue,
    orders_this_month: ordersThisMonth,
    unpaid_orders: unpaidOrders,
    pending_udhaar: pendingUdhaar,
    loan_eligibility_score: loanEligibilityScore,
  };
}

export async function getRevenueAnalytics(shopkeeperId, { days = 30 } = {}) {
  const { data, error } = await supabase
    .from("orders")
    .select("final_amount, created_at")
    .eq("shopkeeper_id", shopkeeperId)
    .gte("created_at", daysAgoIso(days))
    .order("created_at", { ascending: true });

  if (error) throw error;

  const byDay = {};
  for (const order of data || []) {
    const day = order.created_at.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + Number(order.final_amount || 0);
  }

  const series = Object.entries(byDay).map(([date, revenue]) => ({ date, revenue }));
  const total = series.reduce((sum, d) => sum + d.revenue, 0);

  return { period_days: days, total_revenue: total, series };
}

export async function getOrdersAnalytics(shopkeeperId, { days = 30 } = {}) {
  const { data, error } = await supabase
    .from("orders")
    .select("payment_status, created_at")
    .eq("shopkeeper_id", shopkeeperId)
    .gte("created_at", daysAgoIso(days));

  if (error) throw error;

  const byStatus = { unpaid: 0, partially_paid: 0, fully_paid: 0 };
  for (const o of data || []) {
    if (byStatus[o.payment_status] !== undefined) byStatus[o.payment_status] += 1;
  }

  return { period_days: days, total_orders: (data || []).length, by_payment_status: byStatus };
}

export async function getCustomersAnalytics(shopkeeperId) {
  const { data, error } = await supabase
    .from("customers")
    .select("current_balance, tag")
    .eq("shopkeeper_id", shopkeeperId);

  if (error) throw error;

  const totalOutstanding = (data || [])
    .filter((c) => Number(c.current_balance) < 0)
    .reduce((sum, c) => sum + Math.abs(Number(c.current_balance)), 0);

  const byTag = {};
  for (const c of data || []) {
    const tag = c.tag || "Untagged";
    byTag[tag] = (byTag[tag] || 0) + 1;
  }

  return {
    total_customers: (data || []).length,
    total_outstanding_credit: totalOutstanding,
    by_tag: byTag,
  };
}

export async function getInventoryAnalytics(shopkeeperId) {
  const { data, error } = await supabase
    .from("inventory")
    .select("quantity_in_stock, min_stock_threshold, unit_price")
    .eq("shopkeeper_id", shopkeeperId)
    .eq("is_active", true);

  if (error) throw error;

  const lowStockItems = (data || []).filter(
    (i) => i.quantity_in_stock <= (i.min_stock_threshold ?? 5)
  ).length;

  const totalStockValue = (data || []).reduce(
    (sum, i) => sum + Number(i.quantity_in_stock || 0) * Number(i.unit_price || 0),
    0
  );

  return {
    total_items: (data || []).length,
    low_stock_items: lowStockItems,
    total_stock_value: totalStockValue,
  };
}

export async function getAiAnalytics(shopkeeperId, { days = 30 } = {}) {
  // No dedicated AI-usage tracking table exists. source/input_type are encoded
  // in the notes field prefix as [source:X][input:Y]. Decoded here in-memory.
  const { data, error } = await supabase
    .from("orders")
    .select("notes, created_at")
    .eq("shopkeeper_id", shopkeeperId)
    .gte("created_at", daysAgoIso(days));

  if (error) throw error;

  const orders = data || [];
  let voiceOrders = 0;
  let whatsappOrders = 0;

  for (const o of orders) {
    const { source, input_type } = parseNotesMeta(o.notes);
    if (input_type === "voice") voiceOrders++;
    if (source === "whatsapp") whatsappOrders++;
  }

  return {
    period_days: days,
    voice_parsed_orders: voiceOrders,
    whatsapp_originated_orders: whatsappOrders,
    note: "Derived from notes prefix encoding — no dedicated source/input_type columns in schema.",
  };
}

export async function getRecentActivities(shopkeeperId, { limit = 10 } = {}) {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      final_amount,
      payment_status,
      notes,
      created_at,
      customers (
        name,
        phone_number
      )
    `)
    .eq("shopkeeper_id", shopkeeperId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((order) => {
    const { source, input_type, cleanNotes } = parseNotesMeta(order.notes);
    return {
      id: order.id,
      customer: order.customers?.name || "Customer",
      phone: order.customers?.phone_number || "",
      message: cleanNotes || `Order ${order.id.slice(0, 8).toUpperCase()}`,
      amount: Number(order.final_amount),
      status: order.payment_status || "unpaid",
      source: input_type,   // frontend expects 'voice'|'text'|'image'
      created_at: order.created_at,
    };
  });
}
