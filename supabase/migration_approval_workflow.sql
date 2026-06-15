-- 1. Drop existing constraints
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop constraint if exists profiles_status_check;

-- 2. Add columns
alter table public.profiles add column if not exists status text default 'pending';

-- 3. Backfill data
update public.profiles set role = 'user' where role = 'worker';
update public.profiles set status = 'active' where status is null;

-- 4. Re-add constraints
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'supervisor'));
alter table public.profiles add constraint profiles_status_check check (status in ('pending', 'active', 'rejected'));

-- 5. Update handle_new_user trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'user',
    'pending'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      updated_at = now();

  return new;
end;
$$;

-- 6. RLS Policies for Profiles status management
-- Allow supervisors to select all profiles
drop policy if exists "profiles_select_self_or_supervisor" on public.profiles;
create policy "profiles_select_self_or_supervisor"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_supervisor());

-- Supervisors can update profiles (including status and role)
drop policy if exists "profiles_update_supervisor" on public.profiles;
create policy "profiles_update_supervisor"
  on public.profiles for update
  to authenticated
  using (public.is_supervisor())
  with check (public.is_supervisor());

-- Workers cannot update their own profiles (if you want to allow them to update their name, you'd need a separate policy ensuring status/role are untouched, but current setup already restricts updates to supervisors).
