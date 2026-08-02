import * as notificationService from "../services/notificationService.js";
import { ok, fail } from "../utils/apiResponse.js";

function parseListParams(req) {
  const { is_read, limit, offset } = req.query;
  return {
    isRead: is_read === undefined ? undefined : is_read === "true",
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  };
}

export async function listAll(req, res) {
  try {
    const data = await notificationService.listNotifications(req.user.id, parseListParams(req));
    return ok(res, data);
  } catch (error) {
    console.error("Notifications listAll Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function listPayments(req, res) {
  try {
    const data = await notificationService.listByCategory(req.user.id, "payment", parseListParams(req));
    return ok(res, data);
  } catch (error) {
    console.error("Notifications listPayments Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function listOccasions(req, res) {
  try {
    const data = await notificationService.listByCategory(req.user.id, "occasion", parseListParams(req));
    return ok(res, data);
  } catch (error) {
    console.error("Notifications listOccasions Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function listInventory(req, res) {
  try {
    const data = await notificationService.listByCategory(req.user.id, "inventory", parseListParams(req));
    return ok(res, data);
  } catch (error) {
    console.error("Notifications listInventory Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function listAi(req, res) {
  try {
    const data = await notificationService.listByCategory(req.user.id, "ai", parseListParams(req));
    return ok(res, data);
  } catch (error) {
    console.error("Notifications listAi Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function listSubscriptions(req, res) {
  try {
    const data = await notificationService.listByCategory(req.user.id, "subscription", parseListParams(req));
    return ok(res, data);
  } catch (error) {
    console.error("Notifications listSubscriptions Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function listRecent(req, res) {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const data = await notificationService.listRecent(req.user.id, { limit });
    return ok(res, data);
  } catch (error) {
    console.error("Notifications listRecent Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function markAllRead(req, res) {
  try {
    const data = await notificationService.markAllRead(req.user.id);
    return ok(res, data, "All notifications marked as read");
  } catch (error) {
    console.error("Notifications markAllRead Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function markRead(req, res) {
  try {
    const data = await notificationService.markRead(req.user.id, req.params.notificationId);
    return ok(res, data, "Notification marked as read");
  } catch (error) {
    console.error("Notifications markRead Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function dismiss(req, res) {
  try {
    const data = await notificationService.dismiss(req.user.id, req.params.notificationId);
    return ok(res, data, "Notification dismissed");
  } catch (error) {
    console.error("Notifications dismiss Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function listPreferences(req, res) {
  try {
    const data = await notificationService.listPreferences(req.user.id);
    return ok(res, data);
  } catch (error) {
    console.error("Notifications listPreferences Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function updatePreference(req, res) {
  try {
    const data = await notificationService.updatePreference(req.user.id, req.params.category, req.body);
    return ok(res, data, "Preference updated");
  } catch (error) {
    console.error("Notifications updatePreference Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}

export async function generate(req, res) {
  try {
    const data = await notificationService.generateReminders(req.user.id);
    return ok(res, data, "Reminder generation run complete");
  } catch (error) {
    console.error("Notifications generate Error:", error);
    return fail(res, error.message, error.status || 400);
  }
}
