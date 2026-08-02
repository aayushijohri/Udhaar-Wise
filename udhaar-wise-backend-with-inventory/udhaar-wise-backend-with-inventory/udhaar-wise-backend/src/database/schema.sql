-- Udhaar Wise Database Schema SQL
-- A digital ledger (udhaar) platform schema for small shopkeepers.
-- Optimized for PostgreSQL and Supabase.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------
-- 1. USERS TABLE (Shopkeepers / Merchants)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY, -- REFERENCES auth.users(id) in Supabase Auth
    business_name TEXT NOT NULL,
    phone_number TEXT UNIQUE NOT NULL,
    email TEXT,
    address TEXT,
    currency VARCHAR(10) DEFAULT 'INR',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments for documentation
COMMENT ON TABLE public.users IS 'Stores the profiles of shopkeepers setting up they digital credit ledger.';

-- ----------------------------------------------------
-- 2. CUSTOMERS TABLE (Borrowers / Buyers)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopkeeper_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT,
    max_credit_limit NUMERIC(12, 2) DEFAULT 10000.00,
    current_balance NUMERIC(12, 2) DEFAULT 0.00, -- Negative balance means customer owes money (Credit), Positive means they paid advance (Debit/Advance)
    reminder_frequency_days INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: A shopkeeper cannot have two active customers with the same phone number
    CONSTRAINT unique_customer_phone_per_shopkeeper UNIQUE (shopkeeper_id, phone_number)
);

COMMENT ON COLUMN public.customers.current_balance IS 'Current outstanding balance. Negative = customer owes money (udhaar). Positive = customer prepayments/advance.';

-- ----------------------------------------------------
-- 3. INVENTORY TABLE (Items stocked by the Shopkeeper)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopkeeper_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    sku TEXT,
    description TEXT,
    quantity_in_stock INTEGER DEFAULT 0,
    unit_price NUMERIC(12, 2) NOT NULL,
    cost_price NUMERIC(12, 2),
    min_stock_threshold INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------
-- 4. ORDERS TABLE (Sales logs)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopkeeper_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL, -- Can be NULL for guest/walk-in cash sales
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    final_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- total_amount - discount + tax
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(20) CHECK (payment_status IN ('unpaid', 'partially_paid', 'fully_paid')) DEFAULT 'unpaid',
    order_status VARCHAR(20) CHECK (order_status IN ('pending', 'accepted', 'rejected', 'completed')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auxiliary table connecting orders to inventory (Order Line Items)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL -- quantity * unit_price
);

-- ----------------------------------------------------
-- 5. TRANSACTIONS TABLE (Core credit ledger / Udhaar history)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopkeeper_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL, -- Optional link if transaction is direct result of order
    type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'payment')), -- credit = customer borrowed more money (udhaar), payment = customer paid back cash
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    balance_after NUMERIC(12, 2), -- Balance snapshot immediately after this action
    payment_method VARCHAR(30) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'adjustment')),
    description TEXT,
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN public.transactions.type IS 'credit: shopkeeper gave products/services on loan. payment: customer settled loan/made payment.';

-- ----------------------------------------------------
-- 6. SCHEMES TABLE (Credit campaigns / Payment incentives)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schemes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopkeeper_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type VARCHAR(30) NOT NULL CHECK (type IN ('early_payment_discount', 'late_payment_penalty', 'interest_free_period', 'loyalty_cashback')),
    reward_value NUMERIC(10, 2) NOT NULL,
    reward_type VARCHAR(20) NOT NULL CHECK (reward_type IN ('percentage', 'fixed_amount')) DEFAULT 'percentage',
    durational_days INTEGER, -- e.g. pay within 7 days for discount
    terms_conditions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ----------------------------------------------------
-- Fast lookups of customer lists per shopkeeper
CREATE INDEX IF NOT EXISTS idx_customers_shopkeeper ON public.customers(shopkeeper_id);
-- Fast searches by name or phone
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone_number);
-- Fast lookup of inventory items per shopkeeper
CREATE INDEX IF NOT EXISTS idx_inventory_shopkeeper ON public.inventory(shopkeeper_id);
-- Fast loading of transactions ledger for a customer
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_shopkeeper_customer ON public.transactions(shopkeeper_id, customer_id);
-- Speed up calculations ordered by date
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date DESC);
-- Fast checks for open orders per shopkeeper/customer
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);

-- ----------------------------------------------------
-- AUTOMATION TRIGGER: AUTO UPDATE CUSTOMER BALANCE
-- ----------------------------------------------------
-- This trigger automatically updates the 'current_balance' in the customers table
-- whenever a credit or payment transaction is registered.
-- If type is 'credit', student owes MORE money: balance goes further negative (e.g. current_balance = current_balance - amount).
-- If type is 'payment', student pays BACK money: balance approaches 0 or goes positive (current_balance = current_balance + amount).

CREATE OR REPLACE FUNCTION public.fn_update_customer_balance()
RETURNS TRIGGER AS $$
DECLARE
    delta NUMERIC(12, 2);
BEGIN
    -- Determine impact on balance
    IF NEW.type = 'credit' THEN
        delta := -NEW.amount;
    ELSIF NEW.type = 'payment' THEN
        delta := NEW.amount;
    ELSE
        delta := 0;
    END IF;

    -- Update database
    UPDATE public.customers
    SET current_balance = current_balance + delta,
        updated_at = NOW()
    WHERE id = NEW.customer_id;

    -- Record snapshot of new balance after transaction is completed
    NEW.balance_after := (SELECT current_balance FROM public.customers WHERE id = NEW.customer_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_on_transaction_insert
    BEFORE INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_update_customer_balance();

-- Function to recreate timestamps on updates
CREATE OR REPLACE FUNCTION public.fn_update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_modify BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.fn_update_modified_column();
CREATE OR REPLACE TRIGGER trg_customers_modify BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.fn_update_modified_column();
CREATE OR REPLACE TRIGGER trg_inventory_modify BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.fn_update_modified_column();
CREATE OR REPLACE TRIGGER trg_orders_modify BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.fn_update_modified_column();
CREATE OR REPLACE TRIGGER trg_schemes_modify BEFORE UPDATE ON public.schemes FOR EACH ROW EXECUTE FUNCTION public.fn_update_modified_column();
