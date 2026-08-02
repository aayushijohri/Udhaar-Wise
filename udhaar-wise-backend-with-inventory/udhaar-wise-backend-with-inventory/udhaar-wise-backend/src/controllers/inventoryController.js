import * as inventoryService from "../services/inventoryService.js";
import { ok, fail } from "../utils/apiResponse.js";

export async function createInventory(req, res) {
  try {
    const data = await inventoryService.createInventory(req.user.id, req.body);
    return ok(res, data, "Inventory item created successfully");
  } catch (error) {
    console.error("Inventory createInventory Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function listInventory(req, res) {
  try {
    const { search, status, lowStockOnly, page, limit } = req.query;
    const data = await inventoryService.listInventory(req.user.id, {
      search,
      status,
      lowStockOnly: lowStockOnly === "true",
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return ok(res, data, "Inventory fetched successfully");
  } catch (error) {
    console.error("Inventory listInventory Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function getInventoryById(req, res) {
  try {
    const data = await inventoryService.getInventoryById(req.user.id, req.params.id);
    return ok(res, data, "Inventory item fetched successfully");
  } catch (error) {
    console.error("Inventory getInventoryById Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function updateInventory(req, res) {
  try {
    const data = await inventoryService.updateInventory(req.user.id, req.params.id, req.body);
    return ok(res, data, "Inventory item updated successfully");
  } catch (error) {
    console.error("Inventory updateInventory Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function restockInventory(req, res) {
  try {
    const data = await inventoryService.restockInventory(req.user.id, req.params.id, req.body);
    return ok(res, data, "Inventory item restocked successfully");
  } catch (error) {
    console.error("Inventory restockInventory Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function deleteInventory(req, res) {
  try {
    const data = await inventoryService.deleteInventory(req.user.id, req.params.id);
    return ok(res, data, "Inventory item deleted successfully");
  } catch (error) {
    console.error("Inventory deleteInventory Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}
