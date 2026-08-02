import { supabaseAdmin as supabase } from "../config/supabase.js";

/**
 * Inventory administration layer.
 *
 * Scope: read/administer rows in the existing `inventory` table only.
 *
 * Explicitly OUT of scope here (already implemented elsewhere — do not
 * duplicate):
 *   - Stock deduction on order create/update  -> ordersService.deductStockForItems
 *   - Stock restoration on cancel/delete/edit -> ordersService.restockItems
 *   - Low-stock / out-of-stock detection       -> notificationDetectors.detectInventoryAlerts
 *   - Inventory analytics / dashboard rollups  -> dashboardService.getInventoryAnalytics, getOverview
 *
 * The Orders module remains the sole writer of `quantity_in_stock` during
 * order lifecycle events. The one exception is `restockInventory` below,
 * which is a deliberate, manual, admin-initiated stock addition (e.g.
 * "received 50 units from supplier") — conceptually different from the
 * automatic deduct/restock that happens as a side effect of order state
 * changes, and not something the Orders module has any reason to expose.
 */

const SELECT_FIELDS =
  "id, item_name, sku, description, quantity_in_stock, unit_price, cost_price, min_stock_threshold, is_active, created_at, updated_at";

// Owner-controlled fields including direct stock quantity edits.
const UPDATABLE_FIELDS = ["item_name", "sku", "description", "unit_price", "cost_price", "min_stock_threshold", "is_active", "quantity_in_stock"];

export async function createInventory(shopkeeperId, payload) {
  const { item_name, sku, description, unit_price, cost_price, min_stock_threshold, quantity_in_stock } = payload;

  if (!item_name) {
    const err = new Error("item_name is required");
    err.status = 400;
    throw err;
  }

  if (unit_price !== undefined && Number(unit_price) < 0) {
    const err = new Error("unit_price cannot be negative");
    err.status = 400;
    throw err;
  }

  const insertPayload = {
    shopkeeper_id: shopkeeperId,
    item_name,
    sku: sku || null,
    description: description || null,
    unit_price: Number(unit_price || 0),
    cost_price: cost_price !== undefined ? Number(cost_price) : null,
    min_stock_threshold: min_stock_threshold !== undefined ? Number(min_stock_threshold) : 5,
    quantity_in_stock: quantity_in_stock !== undefined ? Math.max(0, Number(quantity_in_stock)) : 0,
    is_active: true,
  };

  const { data, error } = await supabase
    .from("inventory")
    .insert([insertPayload])
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    const err = new Error("Failed to create inventory item: " + error.message);
    err.status = 500;
    throw err;
  }

  return data;
}

export async function listInventory(shopkeeperId, { search, status = "active", lowStockOnly, page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  let query = supabase.from("inventory").select(SELECT_FIELDS, { count: "exact" }).eq("shopkeeper_id", shopkeeperId);

  if (status === "active") query = query.eq("is_active", true);
  else if (status === "inactive") query = query.eq("is_active", false);
  // status === "all" -> no is_active filter

  if (search) {
    query = query.or(`item_name.ilike.%${search}%,sku.ilike.%${search}%`);
  }

  const { data, count, error } = await query.order("item_name", { ascending: true }).range(offset, offset + limit - 1);

  if (error) {
    const err = new Error("Failed to fetch inventory: " + error.message);
    err.status = 500;
    throw err;
  }

  // Low-stock filtering compares two columns on the same row
  // (quantity_in_stock vs min_stock_threshold), which Supabase-JS can't
  // express as a single .lte() filter — matches the same client-side
  // approach already used in dashboardService.getInventoryAnalytics.
  let items = data || [];
  if (lowStockOnly) {
    items = items.filter((i) => i.quantity_in_stock <= (i.min_stock_threshold ?? 5));
  }

  return {
    items,
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  };
}

export async function getInventoryById(shopkeeperId, inventoryId) {
  const { data, error } = await supabase
    .from("inventory")
    .select(SELECT_FIELDS)
    .eq("shopkeeper_id", shopkeeperId)
    .eq("id", inventoryId)
    .maybeSingle();

  if (error) {
    const err = new Error("Failed to fetch inventory item: " + error.message);
    err.status = 500;
    throw err;
  }
  if (!data) {
    const err = new Error("Inventory item not found");
    err.status = 404;
    throw err;
  }
  return data;
}

export async function updateInventory(shopkeeperId, inventoryId, payload) {
  // Ensure the row belongs to this shopkeeper before touching it.
  await getInventoryById(shopkeeperId, inventoryId);

  const patch = {};
  for (const key of UPDATABLE_FIELDS) {
    if (payload[key] !== undefined) patch[key] = payload[key];
  }

  if (Object.keys(patch).length === 0) {
    const err = new Error("No updatable fields provided");
    err.status = 400;
    throw err;
  }

  if (patch.unit_price !== undefined && Number(patch.unit_price) < 0) {
    const err = new Error("unit_price cannot be negative");
    err.status = 400;
    throw err;
  }
  if (patch.min_stock_threshold !== undefined && Number(patch.min_stock_threshold) < 0) {
    const err = new Error("min_stock_threshold cannot be negative");
    err.status = 400;
    throw err;
  }
  if (patch.quantity_in_stock !== undefined && Number(patch.quantity_in_stock) < 0) {
    const err = new Error("quantity_in_stock cannot be negative");
    err.status = 400;
    throw err;
  }

  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("inventory")
    .update(patch)
    .eq("shopkeeper_id", shopkeeperId)
    .eq("id", inventoryId)
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    const err = new Error("Failed to update inventory item: " + error.message);
    err.status = 500;
    throw err;
  }
  return data;
}

// Manual, admin-initiated stock adjustment (positive = increase, negative = decrease).
export async function restockInventory(shopkeeperId, inventoryId, { quantity, reason } = {}) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty === 0) {
    const err = new Error("quantity must be a non-zero number");
    err.status = 400;
    throw err;
  }

  const existing = await getInventoryById(shopkeeperId, inventoryId);
  const newQuantity = Math.max(0, Number(existing.quantity_in_stock || 0) + qty);

  const { data, error } = await supabase
    .from("inventory")
    .update({ quantity_in_stock: newQuantity, updated_at: new Date().toISOString() })
    .eq("shopkeeper_id", shopkeeperId)
    .eq("id", inventoryId)
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    const err = new Error("Failed to restock inventory item: " + error.message);
    err.status = 500;
    throw err;
  }

  return { item: data, added: qty, previous_quantity: existing.quantity_in_stock, reason: reason || null };
}

export async function deleteInventory(shopkeeperId, inventoryId) {
  await getInventoryById(shopkeeperId, inventoryId);

  const { data, error } = await supabase
    .from("inventory")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("shopkeeper_id", shopkeeperId)
    .eq("id", inventoryId)
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    const err = new Error("Failed to delete inventory item: " + error.message);
    err.status = 500;
    throw err;
  }
  return data;
}
