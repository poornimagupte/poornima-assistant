-- ============================================================
-- Personal Assistant Dashboard — migration 0010
-- Routines & daily habits with journal entries.
-- Run AFTER 0009_meals.sql.
-- ============================================================

-- ------------------------------------------------------------
-- routines — the habits to track
--   type  : 'check' (simple checkbox) or 'journal' (has text entry)
--   time_of_day : morning, evening, anytime
--   prompt : text shown for journal-type routines
-- ------------------------------------------------------------
create table routines (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  emoji        text not null default '✅',
  time_of_day  text not null default 'morning'
                 check (time_of_day in ('morning', 'evening', 'anytime')),
  type         text not null default 'check'
                 check (type in ('check', 'journal')),
  prompt       text,  -- e.g. "3 things I'm grateful for today"
  sort_order   integer not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_routines_updated
  before update on routines
  for each row execute function set_updated_at();

create index idx_routines_user on routines (user_id, sort_order) where active = true;

-- ------------------------------------------------------------
-- routine_logs — one entry per routine per day
--   completed : did the user do it?
--   entry     : journal text (only for 'journal' type routines)
-- ------------------------------------------------------------
create table routine_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  routine_id   uuid not null references routines (id) on delete cascade,
  date         date not null,
  completed    boolean not null default false,
  entry        text,  -- journal text
  created_at   timestamptz not null default now(),
  unique (routine_id, date)
);

create index idx_routine_logs_date on routine_logs (user_id, date desc);
create index idx_routine_logs_routine on routine_logs (routine_id, date desc);

-- ------------------------------------------------------------
-- Row Level Security — owner only
-- ------------------------------------------------------------
alter table routines     enable row level security;
alter table routine_logs enable row level security;

create policy "own routines" on routines
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own routine_logs" on routine_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.routines     to authenticated, anon, service_role;
grant select, insert, update, delete on public.routine_logs to authenticated, anon, service_role;
