-- ============================================================
-- MIGRATION: Remove 'status' column from yarn_rolls
-- Run this file in Supabase Dashboard → SQL Editor
-- ============================================================

BEGIN;

-- 1. Recreate trigger function to remove status check
CREATE OR REPLACE FUNCTION public.enforce_lot_update_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.area_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.areas
    WHERE id = NEW.area_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Cannot move LOT to an inactive or missing area.';
  END IF;

  IF NOT public.is_supervisor() THEN
    IF OLD.yarn_code IS DISTINCT FROM NEW.yarn_code THEN
      RAISE EXCEPTION 'Permission denied: workers can only move LOTs.';
    END IF;
  END IF;

  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2. Update check_area_deletion to not rely on status
CREATE OR REPLACE FUNCTION public.check_area_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there are any ACTIVE yarn rolls currently in this area
  -- An active yarn roll is one that is NOT marked as deleted.
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

-- 3. Drop the status column from yarn_rolls
ALTER TABLE public.yarn_rolls DROP COLUMN IF EXISTS status;

COMMIT;
