-- Migration: Add payment_claims table
-- Purpose: Stores pending payment claims sent via WhatsApp.
--          The shopkeeper must approve or reject each claim from the dashboard.
-- Run this manually in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/kfdgsarqkaozvabhmtxy/sql

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Create the payment_claims table
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_claims (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopkeeper_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount          NUMERIC(12, 2) NOT NULL,
  payment_mode    TEXT DEFAULT 'cash',
  raw_message     TEXT,
  status          TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  approved_at     TIMESTAMPTZ,
  rejected_at     TIMESTAMPTZ,
  notes           TEXT
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Performance indexes
-- ──────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payment_claims_shopkeeper
  ON public.payment_claims(shopkeeper_id);

CREATE INDEX IF NOT EXISTS idx_payment_claims_customer
  ON public.payment_claims(customer_id);

CREATE INDEX IF NOT EXISTS idx_payment_claims_status
  ON public.payment_claims(shopkeeper_id, status);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Row Level Security (RLS) — optional but recommended for Supabase projects
-- ──────────────────────────────────────────────────────────────────────────────
-- ALTER TABLE public.payment_claims ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Shopkeeper can manage their own claims"
--   ON public.payment_claims
--   USING (shopkeeper_id = auth.uid());
