-- Migration: Add order_status column to orders table
-- This enables the order acceptance/rejection flow
-- Run this in Supabase SQL Editor or via migration tool

-- Add order_status column with default value for existing rows
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_status VARCHAR(20) 
CHECK (order_status IN ('pending', 'accepted', 'rejected', 'completed')) 
DEFAULT 'pending';

-- Update existing orders to have appropriate status based on payment_status
UPDATE public.orders 
SET order_status = CASE 
  WHEN payment_status = 'fully_paid' THEN 'completed'
  ELSE 'pending'
END
WHERE order_status IS NULL OR order_status = 'pending';
