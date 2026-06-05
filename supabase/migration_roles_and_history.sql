-- ============================================================
-- YARN TRACKER MIGRATION: Roles, RLS, and Durable LOT History
-- Assumed existing schema:
--   public.areas: id, code, label, is_active
--   public.yarn_rolls: id, yarn_code, area_id, status, updated_at
--   public.move_logs: id, yarn_roll_id, from_area_id, to_area_id, moved_by, moved_at, note
--
-- This migration intentionally does not add LOT metadata fields.
-- It adds only move_logs audit snapshot fields needed to preserve
-- history after a LOT row is deleted.
-- ============================================================

begin;

-- 1. Verify the baseline schema before making changes.
-- Data loss risk: none. This block only reads catalog metadata and stops
-- the migration if required tables or columns are missing.
do $$
declare
  missing_columns text[];
begin
  if to_regclass('public.areas') is null then
    raise exception 'Schema mismatch: public.areas table does not exist.';
  end if;

  if to_regclass('public.yarn_rolls') is null then
    raise exception 'Schema mismatch: public.yarn_rolls table does not exist.';
  end if;

  if to_regclass('public.move_logs') is null then
    raise exception 'Schema mismatch: public.move_logs table does not exist.';
  end if;

  with expected(table_name, column_name) as (
    values
      ('areas', 'id'),
      ('areas', 'code'),
      ('areas', 'label'),
      ('areas', 'is_active'),
      ('yarn_rolls', 'id'),
      ('yarn_rolls', 'yarn_code'),
      ('yarn_rolls', 'area_id'),
      ('yarn_rolls', 'status'),
      ('yarn_rolls', 'updated_at'),
      ('move_logs', 'id'),
      ('move_logs', 'yarn_roll_id'),
      ('move_logs', 'from_area_id'),
      ('move_logs', 'to_area_id'),
      ('move_logs', 'moved_by'),
      ('move_logs', 'moved_at'),
      ('move_logs', 'note')
  )
  select array_agg(expected.table_name || '.' || expected.column_name)
  into missing_columns
  from expected
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = expected.table_name
      and c.column_name = expected.column_name
  );

  if missing_columns is not null then
    raise exception 'Schema mismatch: missing required columns: %', array_to_string(missing_columns, ', ');
  end if;
end
$$;

-- 2. Create profiles for role management.
-- Data loss risk: none. CREATE TABLE IF NOT EXISTS preserves existing rows.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'worker',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('worker', 'supervisor'))
);

alter table public.profiles enable row level security;

-- 3. Helper functions.
-- Data loss risk: none. Functions are replaced in place.
create or replace function public.is_supervisor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'supervisor'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'worker'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      updated_at = now();

  return new;
end;
$$;

-- 4. Maintain profiles automatically.
-- Data loss risk: none. Existing profile roles are preserved by the backfill.
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'worker'
from auth.users u
on conflict (id) do update
set email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    updated_at = now();

-- 5. Add durable audit snapshot fields to move_logs.
-- Data loss risk: none. ADD COLUMN IF NOT EXISTS preserves existing rows.
-- These are audit fields on move_logs, not LOT fields on yarn_rolls.
alter table public.move_logs
  add column if not exists action text,
  add column if not exists yarn_code text,
  add column if not exists from_area_code text,
  add column if not exists to_area_code text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'move_logs_action_check'
      and conrelid = 'public.move_logs'::regclass
  ) then
    alter table public.move_logs
      add constraint move_logs_action_check
      check (
        action is null or action in (
          'CREATE',
          'MOVE',
          'EDIT',
          'DELETE',
          'ROLE_CHANGE',
          'AREA_CREATE',
          'AREA_DISABLE',
          'AREA_ENABLE'
        )
      ) not valid;
  end if;
end
$$;

alter table public.move_logs validate constraint move_logs_action_check;

-- 6. Backfill audit snapshots for existing history.
-- Data loss risk: none. This only fills null snapshot fields from existing joins.
update public.move_logs ml
set
  yarn_code = coalesce(ml.yarn_code, yr.yarn_code),
  from_area_code = coalesce(ml.from_area_code, fa.code),
  to_area_code = coalesce(ml.to_area_code, ta.code),
  action = coalesce(
    ml.action,
    case
      when ml.from_area_id is null and ml.to_area_id is not null then 'CREATE'
      when ml.from_area_id is not null and ml.to_area_id is null then 'DELETE'
      when ml.from_area_id is not null and ml.to_area_id is not null then 'MOVE'
      else null
    end
  )
from public.yarn_rolls yr
left join public.areas fa on fa.id = ml.from_area_id
left join public.areas ta on ta.id = ml.to_area_id
where ml.yarn_roll_id = yr.id;

update public.move_logs ml
set
  from_area_code = coalesce(
    ml.from_area_code,
    (select a.code from public.areas a where a.id = ml.from_area_id)
  ),
  to_area_code = coalesce(
    ml.to_area_code,
    (select a.code from public.areas a where a.id = ml.to_area_id)
  ),
  action = coalesce(
    ml.action,
    case
      when ml.from_area_id is null and ml.to_area_id is not null then 'CREATE'
      when ml.from_area_id is not null and ml.to_area_id is null then 'DELETE'
      when ml.from_area_id is not null and ml.to_area_id is not null then 'MOVE'
      else null
    end
  )
where ml.from_area_code is null
   or ml.to_area_code is null
   or ml.action is null;

-- 7. Preserve move_logs when a LOT is deleted.
-- Data loss risk: none to move_logs; this removes cascade-delete behavior.
alter table public.move_logs drop constraint if exists move_logs_yarn_roll_id_fkey;
alter table public.move_logs
  add constraint move_logs_yarn_roll_id_fkey
  foreign key (yarn_roll_id)
  references public.yarn_rolls(id)
  on delete set null;

-- 8. Enforce worker vs supervisor permissions on LOT updates.
-- Workers may move LOTs by changing area_id. Supervisors have full LOT access.
-- Data loss risk: none. This rejects unauthorized future updates.
create or replace function public.enforce_lot_update_permissions()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.area_id is not null and not exists (
    select 1
    from public.areas
    where id = new.area_id
      and is_active = true
  ) then
    raise exception 'Cannot move LOT to an inactive or missing area.';
  end if;

  if not public.is_supervisor() then
    if old.yarn_code is distinct from new.yarn_code
       or old.status is distinct from new.status then
      raise exception 'Permission denied: workers can only move LOTs.';
    end if;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists check_yarn_roll_update on public.yarn_rolls;
create trigger check_yarn_roll_update
  before update on public.yarn_rolls
  for each row execute function public.enforce_lot_update_permissions();

-- 9. RLS policies.
-- Data loss risk: none. RLS changes access control only.
alter table public.areas enable row level security;
alter table public.yarn_rolls enable row level security;
alter table public.move_logs enable row level security;

drop policy if exists "profiles_select_self_or_supervisor" on public.profiles;
drop policy if exists "profiles_update_supervisor" on public.profiles;
drop policy if exists "profiles_insert_supervisor" on public.profiles;
drop policy if exists "profiles_delete_supervisor" on public.profiles;
drop policy if exists "Users can view own profile or supervisors can view all" on public.profiles;
drop policy if exists "Anyone can view profiles" on public.profiles;
drop policy if exists "Supervisors can manage user profiles" on public.profiles;

create policy "profiles_select_self_or_supervisor"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_supervisor());

create policy "profiles_update_supervisor"
  on public.profiles for update
  to authenticated
  using (public.is_supervisor())
  with check (public.is_supervisor());

create policy "profiles_insert_supervisor"
  on public.profiles for insert
  to authenticated
  with check (public.is_supervisor());

create policy "profiles_delete_supervisor"
  on public.profiles for delete
  to authenticated
  using (public.is_supervisor());

drop policy if exists "areas_select_authenticated" on public.areas;
drop policy if exists "areas_insert_supervisor" on public.areas;
drop policy if exists "areas_update_supervisor" on public.areas;
drop policy if exists "areas_delete_supervisor" on public.areas;
drop policy if exists "Anyone can select areas" on public.areas;
drop policy if exists "Supervisors can manage areas" on public.areas;

create policy "areas_select_authenticated"
  on public.areas for select
  to authenticated
  using (true);

create policy "areas_insert_supervisor"
  on public.areas for insert
  to authenticated
  with check (public.is_supervisor());

create policy "areas_update_supervisor"
  on public.areas for update
  to authenticated
  using (public.is_supervisor())
  with check (public.is_supervisor());

create policy "areas_delete_supervisor"
  on public.areas for delete
  to authenticated
  using (public.is_supervisor());

drop policy if exists "yarn_rolls_select_authenticated" on public.yarn_rolls;
drop policy if exists "yarn_rolls_insert_supervisor" on public.yarn_rolls;
drop policy if exists "yarn_rolls_update_authenticated" on public.yarn_rolls;
drop policy if exists "yarn_rolls_delete_supervisor" on public.yarn_rolls;
drop policy if exists "Anyone can select yarn rolls" on public.yarn_rolls;
drop policy if exists "Supervisors can insert yarn rolls" on public.yarn_rolls;
drop policy if exists "Supervisors can delete yarn rolls" on public.yarn_rolls;
drop policy if exists "Authenticated users can update yarn rolls" on public.yarn_rolls;

create policy "yarn_rolls_select_authenticated"
  on public.yarn_rolls for select
  to authenticated
  using (true);

create policy "yarn_rolls_insert_supervisor"
  on public.yarn_rolls for insert
  to authenticated
  with check (public.is_supervisor());

create policy "yarn_rolls_update_authenticated"
  on public.yarn_rolls for update
  to authenticated
  using (true)
  with check (true);

create policy "yarn_rolls_delete_supervisor"
  on public.yarn_rolls for delete
  to authenticated
  using (public.is_supervisor());

drop policy if exists "move_logs_select_authenticated" on public.move_logs;
drop policy if exists "move_logs_insert_authenticated" on public.move_logs;
drop policy if exists "Anyone can select move logs" on public.move_logs;
drop policy if exists "Authenticated users can insert move logs" on public.move_logs;

create policy "move_logs_select_authenticated"
  on public.move_logs for select
  to authenticated
  using (true);

create policy "move_logs_insert_authenticated"
  on public.move_logs for insert
  to authenticated
  with check (true);

-- No update/delete policy is created for move_logs. Audit rows are append-only.

commit;
