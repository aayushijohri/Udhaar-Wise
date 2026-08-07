import * as ordersService from "../services/ordersService.js";
import { ok, fail } from "../utils/apiResponse.js";

export async function getOrders(req, res) {
  try {
    const data = await ordersService.listOrders(req.user.id, req.query);
    return ok(res, data, "Orders fetched successfully");
  } catch (error) {
    console.error("Orders getOrders Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function getOrderById(req, res) {
  try {
    const order = await ordersService.getOrderById(req.user.id, req.params.id);
    return ok(res, { order }, "Order fetched successfully");
  } catch (error) {
    console.error("Orders getOrderById Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function createOrder(req, res) {
  try {
    console.log('[API][STAGE3] /orders create called with body:', JSON.stringify(req.body));
    const order = await ordersService.createOrder(req.user.id, req.user.id, req.body);
    try { console.log('[API][STAGE5] Order returned by service:', JSON.stringify(order)); } catch (e) {}
    return ok(res, { order }, "Order created successfully", 201);
  } catch (error) {
    console.error("Orders createOrder Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function updateOrder(req, res) {
  try {
    const order = await ordersService.updateOrder(req.user.id, req.params.id, req.body);
    return ok(res, { order }, "Order updated successfully");
  } catch (error) {
    console.error("Orders updateOrder Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function deleteOrder(req, res) {
  try {
    const result = await ordersService.deleteOrder(req.user.id, req.params.id);
    return ok(res, result, "Order deleted successfully");
  } catch (error) {
    console.error("Orders deleteOrder Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function sendReminder(req, res) {
  try {
    const reminder = await ordersService.sendReminder(req.user.id, req.params.id, req.user.id, req.body);
    return ok(res, { reminder }, "Reminder sent successfully", 201);
  } catch (error) {
    console.error("Orders sendReminder Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function acceptOrder(req, res) {
  try {
    const triggerProduction = req.query.produce === "true";
    const order = await ordersService.acceptOrder(req.user.id, req.params.id, triggerProduction);
    return ok(res, { order }, "Order accepted successfully");
  } catch (error) {
    console.error("Orders acceptOrder Error:", error);
    if (error.code === "INSUFFICIENT_FINISHED_STOCK") {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details
      });
    }
    return fail(res, error.message, error.status || 400);
  }
}

export async function rejectOrder(req, res) {
  try {
    const order = await ordersService.rejectOrder(req.user.id, req.params.id);
    return ok(res, { order }, "Order rejected successfully");
  } catch (error) {
    console.error("Orders rejectOrder Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function completeOrder(req, res) {
  try {
    const order = await ordersService.completeOrder(req.user.id, req.params.id);
    return ok(res, { order }, "Order completed successfully");
  } catch (error) {
    console.error("Orders completeOrder Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}
