/**
 * Idempotent seed script for the default plan catalogue.
 * Ported from premium_module/scripts/seed_default_plans.py — uses
 * get-or-create by plan name, safe to re-run.
 *
 * Run with: node src/database/seedPlans.js
 */
import { supabase } from "../config/supabase.js";
import logger from "../utils/logger.js";

const UNLIMITED = 0; // matches migrations_modules.sql comment: 0 = unlimited

const DEFAULT_PLANS = [
  {
    name: "Free",
    description: "Basic access for getting started — limited usage caps.",
    monthly_price: 0,
    yearly_price: 0,
    max_orders: 50,
    max_customers: 50,
    max_ai_requests: 20,
    max_voice_notes: 10,
    analytics_enabled: false,
    priority_support: false,
    inventory_predictions: false,
    custom_branding: false,
    active: true,
  },
  {
    name: "Starter",
    description: "For growing home businesses — more orders, AI parsing, and analytics.",
    monthly_price: 299,
    yearly_price: 2999,
    max_orders: 500,
    max_customers: 500,
    max_ai_requests: 300,
    max_voice_notes: 150,
    analytics_enabled: true,
    priority_support: false,
    inventory_predictions: false,
    custom_branding: false,
    active: true,
  },
  {
    name: "Pro",
    description: "For established sellers — inventory predictions and priority support.",
    monthly_price: 799,
    yearly_price: 7999,
    max_orders: UNLIMITED,
    max_customers: UNLIMITED,
    max_ai_requests: UNLIMITED,
    max_voice_notes: UNLIMITED,
    analytics_enabled: true,
    priority_support: true,
    inventory_predictions: true,
    custom_branding: false,
    active: true,
  },
  {
    name: "Business",
    description: "For multi-channel businesses — everything in Pro plus custom branding.",
    monthly_price: 1499,
    yearly_price: 14999,
    max_orders: UNLIMITED,
    max_customers: UNLIMITED,
    max_ai_requests: UNLIMITED,
    max_voice_notes: UNLIMITED,
    analytics_enabled: true,
    priority_support: true,
    inventory_predictions: true,
    custom_branding: true,
    active: true,
  },
];

async function seed() {
  for (const plan of DEFAULT_PLANS) {
    const { data: existing } = await supabase
      .from("subscription_plans")
      .select("id")
      .eq("name", plan.name)
      .maybeSingle();

    if (existing) {
      logger.info(`Plan "${plan.name}" already exists, skipping.`);
      continue;
    }

    const { error } = await supabase.from("subscription_plans").insert([plan]);
    if (error) {
      logger.error(`Failed to seed plan "${plan.name}": ${error.message}`);
    } else {
      logger.info(`Seeded plan "${plan.name}".`);
    }
  }
}

seed()
  .then(() => {
    logger.info("Plan seeding complete.");
    process.exit(0);
  })
  .catch((err) => {
    logger.error("Plan seeding failed.", err);
    process.exit(1);
  });
