import * as settingsService from "../services/settingsService.js";
import { ok, fail } from "../utils/apiResponse.js";

export async function getProfile(req, res) {
  try {
    const data = await settingsService.getProfile(req.user.id);
    return ok(res, data);
  } catch (error) {
    console.error("Settings getProfile Error:", error);
    return fail(res, error.message, 400);
  }
}

export async function updateProfile(req, res) {
  try {
    const data = await settingsService.updateProfile(req.user.id, req.body);
    return ok(res, data, "Profile updated successfully");
  } catch (error) {
    console.error("Settings updateProfile Error:", error);
    return fail(res, error.message, 400);
  }
}

export async function getBilling(req, res) {
  try {
    const data = await settingsService.getBilling(req.user.id);
    return ok(res, data);
  } catch (error) {
    console.error("Settings getBilling Error:", error);
    return fail(res, error.message, 400);
  }
}

export async function getPreferences(req, res) {
  try {
    const data = await settingsService.getPreferences(req.user.id);
    return ok(res, data);
  } catch (error) {
    console.error("Settings getPreferences Error:", error);
    return fail(res, error.message, 400);
  }
}

export async function updatePreferences(req, res) {
  try {
    const data = await settingsService.updatePreferences(req.user.id, req.body);
    return ok(res, data, "Preferences updated successfully");
  } catch (error) {
    console.error("Settings updatePreferences Error:", error);
    return fail(res, error.message, 400);
  }
}
