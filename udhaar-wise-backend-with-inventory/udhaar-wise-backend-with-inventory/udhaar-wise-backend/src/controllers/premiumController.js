import * as premiumService from "../services/premiumService.js";
import { ok, fail } from "../utils/apiResponse.js";

export async function listPlans(req, res) {
  try {
    const data = await premiumService.listPlans();
    return ok(res, data);
  } catch (error) {
    console.error("Premium listPlans Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function getCurrentSubscription(req, res) {
  try {
    const data = await premiumService.getCurrentSubscription(req.user.id);
    return ok(res, data);
  } catch (error) {
    console.error("Premium getCurrentSubscription Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function upgradeSubscription(req, res) {
  try {
    const data = await premiumService.upgradeSubscription(req.user.id, req.body);
    return ok(res, data, "Subscription upgraded successfully");
  } catch (error) {
    console.error("Premium upgradeSubscription Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function cancelSubscription(req, res) {
  try {
    const data = await premiumService.cancelSubscription(req.user.id);
    return ok(res, data, "Subscription cancelled successfully");
  } catch (error) {
    console.error("Premium cancelSubscription Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function getFeatureAccess(req, res) {
  try {
    const data = await premiumService.getFeatureAccess(req.user.id);
    return ok(res, data);
  } catch (error) {
    console.error("Premium getFeatureAccess Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}
