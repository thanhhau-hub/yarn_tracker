-- ============================================================
-- MIGRATION FIX: Fix Account Creation and Admin roles
-- Run this file in Supabase Dashboard → SQL Editor
-- ============================================================

BEGIN;

-- 1. Fix role check constraint to match frontend ('worker', 'supervisor', 'admin')
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
UPDATE public.profiles SET role = 'worker' WHERE role = 'user';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('worker', 'supervisor', 'admin'));

-- 2. Fix the handle_new_user trigger. 
-- Earlier migrations dropped the 'status' column but the trigger was still trying to insert into it.
-- This caused new user signups to fail and rollback entirely.
-- We also allow assigning the role from metadata so the Admin screen works properly.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role text;
BEGIN
  -- Use the role provided in metadata if it is valid, otherwise default to 'worker'
  IF new.raw_user_meta_data->>'role' IN ('worker', 'supervisor', 'admin') THEN
    assigned_role := new.raw_user_meta_data->>'role';
  ELSE
    assigned_role := 'worker';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', SPLIT_PART(new.email, '@', 1)),
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      updated_at = NOW();

  RETURN new;
END;
$$;

-- 3. Just in case there is no admin in the system at all, 
-- You can run the following script (commented out) to elevate your own account to admin:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your_email@example.com';

COMMIT;
