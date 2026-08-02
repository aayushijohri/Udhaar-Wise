import * as dashboardService from "../services/dashboardService.js";
import { ok, fail } from "../utils/apiResponse.js";

function withDays(req) {
  const days = parseInt(req.query.days, 10);
  return Number.isFinite(days) && days > 0 ? { days } : {};
}

export async function getOverview(req, res) {
  try {
    const data = await dashboardService.getOverview(req.user.id);
    return ok(res, data);
  } catch (error) {
    console.error("Dashboard getOverview Error:", error);
    return fail(res, error.message, 400);
  }
}

export async function getRevenueAnalytics(req, res) {
  try {
    const data = await dashboardService.getRevenueAnalytics(req.user.id, withDays(req));
    return ok(res, data);
  } catch (error) {
    console.error("Dashboard getRevenueAnalytics Error:", error);
    return fail(res, error.message, 400);
  }
}

export async function getOrdersAnalytics(req, res) {
  try {
    const data = await dashboardService.getOrdersAnalytics(req.user.id, withDays(req));
    return ok(res, data);
  } catch (error) {
    console.error("Dashboard getOrdersAnalytics Error:", error);
    return fail(res, error.message, 400);
  }
}

export async function getCustomersAnalytics(req, res) {
  try {
    const data = await dashboardService.getCustomersAnalytics(req.user.id);
    return ok(res, data);
  } catch (error) {
    console.error("Dashboard getCustomersAnalytics Error:", error);
    return fail(res, error.message, 400);
  }
}

export async function getInventoryAnalytics(req, res) {
  try {
    const data = await dashboardService.getInventoryAnalytics(req.user.id);
    return ok(res, data);
  } catch (error) {
    console.error("Dashboard getInventoryAnalytics Error:", error);
    return fail(res, error.message, 400);
  }
}

export async function getAiAnalytics(req, res) {
  try {
    const data = await dashboardService.getAiAnalytics(req.user.id, withDays(req));
    return ok(res, data);
  } catch (error) {
    console.error("Dashboard getAiAnalytics Error:", error);
    return fail(res, error.message, 400);
  }
}

export async function getRecentActivities(req, res) {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const data = await dashboardService.getRecentActivities(req.user.id, { limit });
    return ok(res, data);
  } catch (error) {
    console.error("Dashboard getRecentActivities Error:", error);
    return fail(res, error.message, 400);
  }
}
