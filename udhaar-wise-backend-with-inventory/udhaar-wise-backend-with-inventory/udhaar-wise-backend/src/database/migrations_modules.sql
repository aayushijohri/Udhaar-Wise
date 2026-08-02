-- ============================================================
-- Udhaar Wise — Additive migration for Orders/Customers extension,
-- Settings, Premium, Dashboard, Notifications modules.
--
-- This migration is PURELY ADDITIVE:
--   - No existing table is dropped or renamed.
--   - No new "businesses" table (users.id IS the shopkeeper/business id).
--   - Orders/Customers keep their existing schema; only a few nullable
--     columns are added where a new module genuinely needs them.
-- Safe to run against a database that already has schema.sql applied.
-- ============================================================

-- ----------------------------------------------------
-- 1. EXTEND ORDERS (nullable, backward-compatible)
-- ----------------------------------------------------
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS order_number TEXT,
    ADD COLUMN IF NOT EXISTS source VARCHAR(20) CHECK (source IN ('whatsapp','manual_entry','application')) DEFAULT 'manual_entry',
    ADD COLUMN IF NOT EXISTS input_type VARCHAR(20) CHECK (input_type IN ('voice','text','image')) DEFAULT 'text',
    ADD COLUMN IF NOT EXISTS order_status VARCHAR(20)
        CHECK (order_status IN ('pending','preparing','packed','delivered','completed','cancelled'))
        DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_order_number_per_shopkeeper
    ON public.orders (shopkeeper_id, order_number) WHERE order_number IS NOT NULL;

ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS item_name TEXT,
    ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'pcs',
    ADD COLUMN IF NOT EXISTS stock_deducted_quantity INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS stock_status VARCHAR(20)
        CHECK (stock_status IN ('in_stock','insufficient_stock','not_tracked'))
        DEFAULT 'not_tracked';
-- NOTE: orders-module's `inventory_item_id` and `subtotal` map to this
-- schema's pre-existing `inventory_id` and `total_price` columns — reused
-- rather than duplicated.

CREATE TABLE IF NOT EXISTS public.order_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    shopkeeper_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp','sms','call')),
    status VARCHAR(20) NOT NULL DEFAULT 'queued',
    message_snapshot TEXT NOT NULL,
    sent_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------
-- 2. EXTEND CUSTOMERS (nullable, backward-compatible)
-- ----------------------------------------------------
ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS tag VARCHAR(20) CHECK (tag IN ('VIP','Loyal','Growing')),
    ADD COLUMN IF NOT EXISTS tag_is_manual BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS preferred_payment_method VARCHAR(30),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ----------------------------------------------------
-- 3. SETTINGS MODULE — preferences (business_profiles reuses `users`)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopkeeper_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,

    language VARCHAR(20) NOT NULL DEFAULT 'english',
    theme VARCHAR(20) NOT NULL DEFAULT 'system',
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    voice_auto_parse BOOLEAN NOT NULL DEFAULT TRUE,
    screenshot_auto_parse BOOLEAN NOT NULL DEFAULT TRUE,
    auto_create_orders BOOLEAN NOT NULL DEFAULT FALSE,
    human_review_required BOOLEAN NOT NULL DEFAULT TRUE,
    confidence_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.80,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------
-- 4. PREMIUM MODULE — plans + subscriptions
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,

    monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    yearly_price NUMERIC(10,2) NOT NULL DEFAULT 0,

    max_orders INTEGER NOT NULL DEFAULT 0,       -- 0 = unlimited
    max_customers INTEGER NOT NULL DEFAULT 0,
    max_ai_requests INTEGER NOT NULL DEFAULT 0,
    max_voice_notes INTEGER NOT NULL DEFAULT 0,

    analytics_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    priority_support BOOLEAN NOT NULL DEFAULT FALSE,
    inventory_predictions BOOLEAN NOT NULL DEFAULT FALSE,
    custom_branding BOOLEAN NOT NULL DEFAULT FALSE,

    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopkeeper_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),

    status VARCHAR(20) NOT NULL CHECK (status IN ('active','cancelled','expired','trialing')) DEFAULT 'trialing',
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly','yearly')) DEFAULT 'monthly',

    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expiry_date TIMESTAMPTZ NOT NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_shopkeeper ON public.subscriptions (shopkeeper_id);

-- ----------------------------------------------------
-- 5. NOTIFICATIONS & REMINDERS MODULE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopkeeper_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    category VARCHAR(20) NOT NULL CHECK (category IN ('payment','occasion','inventory','ai','subscription')),
    type VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info','warning','critical')) DEFAULT 'info',

    reference_type VARCHAR(50),
    reference_id UUID,

    dedupe_key TEXT NOT NULL,
    metadata JSONB,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    dismissed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_notification_dedupe UNIQUE (shopkeeper_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_notifications_shopkeeper ON public.notifications (shopkeeper_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications (shopkeeper_id, category);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (shopkeeper_id, is_read) WHERE is_dismissed = FALSE;

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopkeeper_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category VARCHAR(20) NOT NULL CHECK (category IN ('payment','occasion','inventory','ai','subscription')),

    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_notification_pref UNIQUE (shopkeeper_id, category)
);

-- ----------------------------------------------------
-- Reuse existing fn_update_modified_column() trigger for updated_at
-- ----------------------------------------------------
CREATE OR REPLACE TRIGGER trg_preferences_modify BEFORE UPDATE ON public.preferences FOR EACH ROW EXECUTE FUNCTION public.fn_update_modified_column();
CREATE OR REPLACE TRIGGER trg_subscription_plans_modify BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.fn_update_modified_column();
CREATE OR REPLACE TRIGGER trg_subscriptions_modify BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.fn_update_modified_column();
CREATE OR REPLACE TRIGGER trg_notifications_modify BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.fn_update_modified_column();
CREATE OR REPLACE TRIGGER trg_notification_preferences_modify BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.fn_update_modified_column();
