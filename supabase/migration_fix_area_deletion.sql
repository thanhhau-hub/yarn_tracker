-- ============================================================
-- MIGRATION FIX: Fix Rack Deletion Logic
-- Run this file in Supabase Dashboard → SQL Editor
-- ============================================================

BEGIN;

-- Update the check_area_deletion trigger to only block deletion if there are ACTIVE yarn rolls.
-- Previously, it blocked deletion if ANY yarn roll (even deleted or consumed ones) was ever in this area.
CREATE OR REPLACE FUNCTION public.check_area_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there are any ACTIVE yarn rolls currently in this area
  -- An active yarn roll is one that is 'in_stock' and NOT marked as deleted.
  IF EXISTS (
    SELECT 1 FROM public.yarn_rolls 
    WHERE area_id = OLD.id 
      AND (is_deleted IS NULL OR is_deleted = false)
  ) THEN
    RAISE EXCEPTION 'Location can only be deleted when it contains zero active yarn rolls.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

COMMIT;
