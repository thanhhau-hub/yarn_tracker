-- ============================================================
-- MIGRATION: Simplify yarn_rolls table
-- Remove: color, type columns (not needed for lot-based tracking)
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE yarn_rolls
  DROP COLUMN IF EXISTS color,
  DROP COLUMN IF EXISTS type;

-- Ensure status defaults to 'in_stock' for new rolls
ALTER TABLE yarn_rolls ALTER COLUMN status SET DEFAULT 'in_stock';
