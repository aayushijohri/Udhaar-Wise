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
    inventoryRes,
    allOrders,
    thisMonthOrders,
    unpaidOrdersRes,
    customersRes,
    { count: pendingClaims },
  ] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("shopkeeper_id", shopkeeperId),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("shopkeeper_id", shopkeeperId),
    supabase
      .from("inventory")
      .select("quantity_in_stock, min_stock_threshold")
      .eq("shopkeeper_id", shopkeeperId)
      .eq("is_active", true),
    // Revenue = actual paid amounts (not billed amounts)
    supabase.from("orders").select("paid_amount").eq("shopkeeper_id", shopkeeperId),
    supabase
      .from("orders")
      .select("id, paid_amount", { count: "exact" })
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
    supabase
      .from("payment_claims")
      .select("id", { count: "exact", head: true })
      .eq("shopkeeper_id", shopkeeperId)
      .eq("status", "pending"),
  ]);

  // Revenue = sum of what was actually paid (not just billed)
  const totalRevenue = (allOrders.data || []).reduce((sum, o) => sum + Number(o.paid_amount || 0), 0);
  const monthlyRevenue = (thisMonthOrders.data || []).reduce((sum, o) => sum + Number(o.paid_amount || 0), 0);
  const ordersThisMonth = thisMonthOrders.count || 0;
  const lowStock = (inventoryRes.data || []).filter((i) => i.quantity_in_stock <= (i.min_stock_threshold ?? 5)).length;
  const unpaidOrders = unpaidOrdersRes.count || 0;

  // pending_udhaar = total outstanding negative balance across all customers
  const pendingUdhaar = (customersRes.data || [])
    .filter((c) => Number(c.current_balance) < 0)
    .reduce((sum, c) => sum + Math.abs(Number(c.current_balance)), 0);

  // Multi-factor loan eligibility score: 0–100
  const repaymentRatio = totalOrders ? 1 - unpaidOrders / totalOrders : 1;
  const revenueScore = Math.min(25, Math.round((totalRevenue / 200000) * 25));
  const repaymentScore = Math.round(repaymentRatio * 30);
  const retentionScore = totalCustomers > 0
    ? Math.min(20, Math.round(((customersRes.data || []).filter(c => Number(c.current_balance) < 0).length / totalCustomers) * 20))
    : 0;
  const growthScore = Math.min(15, Math.round((ordersThisMonth / Math.max(totalOrders / 12, 1)) * 15));
  const duesPenalty = pendingUdhaar > 50000 ? -10 : pendingUdhaar > 20000 ? -5 : 0;
  const loanEligibilityScore = Math.max(0, Math.min(100,
    revenueScore + repaymentScore + retentionScore + growthScore + duesPenalty + 10
  ));

  const loanScoreBreakdown = [
    { factor: "Revenue Strength", score: revenueScore, max: 25, description: `₹${Math.round(totalRevenue).toLocaleString("en-IN")} total revenue` },
    { factor: "Repayment Rate", score: repaymentScore, max: 30, description: `${Math.round(repaymentRatio * 100)}% orders paid on time` },
    { factor: "Customer Retention", score: retentionScore, max: 20, description: `${totalCustomers} active customers` },
    { factor: "Business Growth", score: growthScore, max: 15, description: `${ordersThisMonth} orders this month` },
    { factor: "Outstanding Dues", score: Math.abs(duesPenalty), max: 10, description: duesPenalty < 0 ? `₹${Math.round(pendingUdhaar).toLocaleString("en-IN")} pending (penalty)` : "No excessive dues", isPositive: duesPenalty >= 0 },
  ];

  return {
    // Legacy fields (kept for backward compatibility)
    total_orders: totalOrders || 0,
    total_customers: totalCustomers || 0,
    total_revenue: totalRevenue,
    low_stock_items: lowStock,
    // Fields used by the frontend dashboard cards
    monthly_revenue: monthlyRevenue,
    orders_this_month: ordersThisMonth,
    unpaid_orders: unpaidOrders,
    pending_udhaar: pendingUdhaar,
    loan_eligibility_score: loanEligibilityScore,
    loan_score_breakdown: loanScoreBreakdown,
    pending_payment_claims: pendingClaims || 0,
  };
}

export async function getRevenueAnalytics(shopkeeperId, { days = 30 } = {}) {
  const { data, error } = await supabase
    .from("orders")
    .select("paid_amount, created_at")
    .eq("shopkeeper_id", shopkeeperId)
    .gte("created_at", daysAgoIso(days))
    .order("created_at", { ascending: true });

  if (error) throw error;

  const byDay = {};
  for (const order of data || []) {
    const paid = Number(order.paid_amount || 0);
    if (paid <= 0) continue; // only count actual payments received
    const day = order.created_at.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + paid;
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
