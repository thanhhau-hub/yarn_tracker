-- ============================================================
-- YARN TRACKER — Supabase Database Setup
-- Run this entire file in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. AREAS TABLE
-- Represents physical storage zones on the factory floor.
-- You fill this once. Workers never add/remove areas.
create table if not exists areas (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,    -- e.g. "A1.1"
  label      text,                    -- e.g. "Rack A, Row 1, Slot 1"
  is_active  boolean default true
);

-- 2. YARN ROLLS TABLE
-- Each physical yarn roll in the factory.
-- area_id = where the roll is RIGHT NOW (this IS your live board state)
create table if not exists yarn_rolls (
  id          uuid primary key default gen_random_uuid(),
  yarn_code   text not null unique,
  color       text,
  type        text,
  area_id     uuid references areas(id) on delete set null,
  status      text default 'in_stock' check (status in ('in_stock', 'retrieved', 'consumed')),
  updated_at  timestamptz default now()
);

-- 3. MOVE LOGS TABLE
-- Append-only audit trail. Every move = one new row. Never update or delete.
create table if not exists move_logs (
  id            uuid primary key default gen_random_uuid(),
  yarn_roll_id  uuid references yarn_rolls(id) on delete cascade,
  from_area_id  uuid references areas(id) on delete set null,
  to_area_id    uuid references areas(id) on delete set null,
  moved_by      uuid references auth.users(id),
  moved_at      timestamptz default now(),
  note          text
);

-- ============================================================
-- ENABLE REAL-TIME
-- Run these so changes push to the mobile app instantly
-- ============================================================
alter publication supabase_realtime add table yarn_rolls;
alter publication supabase_realtime add table areas;

-- ============================================================
-- ============================================================
-- SEED AREAS (128 positions)
-- A1.1 -> A1.32
-- B1.1 -> B1.32
-- C1.1 -> C1.32
-- D1.1 -> D1.32
-- ============================================================

insert into areas (code, label)

-- A
select
  'A1.' || s,
  'Zone A1 Slot ' || s
from generate_series(1,32) s

union all

-- B
select
  'B1.' || s,
  'Zone B1 Slot ' || s
from generate_series(1,32) s

union all

-- C
select
  'C1.' || s,
  'Zone C1 Slot ' || s
from generate_series(1,32) s

union all

-- D
select
  'D1.' || s,
  'Zone D1 Slot ' || s
from generate_series(1,32) s

on conflict (code) do nothing;

-- ============================================================
-- OPTIONAL: Disable Row Level Security for internal MVP
-- (enable and configure it when you add proper user roles in V2)
-- ============================================================
alter table areas disable row level security;
alter table yarn_rolls disable row level security;
alter table move_logs disable row level security;
