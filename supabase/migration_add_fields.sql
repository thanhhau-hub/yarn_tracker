-- ============================================================
-- ADD QUANTITY AND NOTES COLUMNS TO YARN_ROLLS
-- Run this SQL in Supabase Dashboard -> SQL Editor
-- ============================================================

ALTER TABLE yarn_rolls ADD COLUMN IF NOT EXISTS quantity text;
ALTER TABLE yarn_rolls ADD COLUMN IF NOT EXISTS notes text;
