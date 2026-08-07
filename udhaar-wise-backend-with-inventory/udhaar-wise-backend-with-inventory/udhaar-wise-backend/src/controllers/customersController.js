import * as customersService from "../services/customersService.js";
import * as aiService from "../services/aiService.js";
import { ok, fail } from "../utils/apiResponse.js";

export async function listCustomers(req, res) {
  try {
    const { search, filter, page, limit } = req.query;
    const data = await customersService.listCustomers(req.user.id, {
      search,
      filter,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return ok(res, data, "Customers fetched successfully");
  } catch (error) {
    console.error("Customers listCustomers Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function getCustomerById(req, res) {
  try {
    const data = await customersService.getCustomerProfile(req.user.id, req.params.id);
    return ok(res, data, "Customer fetched successfully");
  } catch (error) {
    console.error("Customers getCustomerById Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function createCustomer(req, res) {
  try {
    const data = await customersService.createCustomer(req.user.id, req.body);
    return ok(res, data, "Customer created successfully", 201);
  } catch (error) {
    console.error("Customers createCustomer Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function updateCustomer(req, res) {
  try {
    const data = await customersService.updateCustomer(req.user.id, req.params.id, req.body);
    return ok(res, data, "Customer updated successfully");
  } catch (error) {
    console.error("Customers updateCustomer Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function deleteCustomer(req, res) {
  try {
    const data = await customersService.softDeleteCustomer(req.user.id, req.params.id);
    return ok(res, data, "Customer deleted successfully");
  } catch (error) {
    console.error("Customers deleteCustomer Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function generatePromoController(req, res) {
  try {
    const customer = await customersService.getCustomerProfile(req.user.id, req.params.id);
    const message = await aiService.generatePersonalizedPromo(customer.name, customer.ai_memory);
    return ok(res, { message }, "Promo generated successfully");
  } catch (error) {
    console.error("generatePromoController Error:", error);
    return fail(res, error.message, error.status || 500);
  }
}


