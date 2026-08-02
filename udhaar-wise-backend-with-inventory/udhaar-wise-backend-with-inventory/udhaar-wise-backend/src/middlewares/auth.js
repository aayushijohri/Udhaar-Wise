import { supabase } from "../config/supabase.js";
import logger from "../utils/logger.js";

/**
 * requireUser
 *
 * Centralized session-verification middleware for all protected routes.
 * Reuses the existing Supabase Auth client/session mechanism already used
 * by authController (signup/login/logout) — no separate auth system.
 *
 * Verifies the bearer token via supabase.auth.getUser(token) and attaches:
 *   req.user = { id, email }
 *
 * In this schema, `shopkeeper_id` on every business table IS the
 * authenticated user's id (users.id mirrors auth.users.id — see
 * src/database/schema.sql). There is no separate "business" entity, so
 * every module below scopes queries with `shopkeeperId = req.user.id`.
 */
export async function requireUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email,
    };

    next();
  } catch (err) {
    logger.error(`requireUser middleware error: ${err.message}`, err);
    return res.status(500).json({
      success: false,
      message: "Authentication check failed",
    });
  }
}
