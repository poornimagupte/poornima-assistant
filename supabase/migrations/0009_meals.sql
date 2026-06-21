-- ============================================================
-- Personal Assistant Dashboard — migration 0009
-- Meal planner: a recipe library + daily meal plans.
-- Run AFTER 0008_writing.sql.
-- ============================================================

-- ------------------------------------------------------------
-- recipes — the household dish library
--   meal_types : which meals this dish fits (breakfast, lunch, dinner)
--   cuisine    : south_indian, north_indian, continental, chinese_indian, other
--   category   : dal, sabzi, rice, roti, curry, snack, sweet, main, side
--   effort     : quick, regular, elaborate
-- ------------------------------------------------------------
create table recipes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  meal_types   text[] not null default '{lunch,dinner}',
  cuisine      text not null default 'south_indian'
                 check (cuisine in ('south_indian','north_indian','maharashtrian','continental','chinese_indian','other')),
  category     text not null default 'main'
                 check (category in ('dal','sabzi','rice','roti','curry','snack','sweet','main','side','breakfast','chutney','raita','other')),
  effort       text not null default 'regular'
                 check (effort in ('quick','regular','elaborate')),
  is_veg       boolean not null default true,
  notes        text,
  tags         text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create trigger trg_recipes_updated
  before update on recipes
  for each row execute function set_updated_at();

create index idx_recipes_user on recipes (user_id) where deleted_at is null;

-- ------------------------------------------------------------
-- meal_plans — one row per user per day
--   breakfast, lunch, dinner are free text (e.g. "Dal, Roti, Raita")
--   This is intentionally flat — dish names as text, not FK to recipes.
--   Lets you quickly type "leftover dal + roti" without needing
--   every dish in the library.
-- ------------------------------------------------------------
create table meal_plans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  date         date not null,
  breakfast    text,
  snacks       text,
  lunch        text,
  dinner       text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, date)
);

create trigger trg_meal_plans_updated
  before update on meal_plans
  for each row execute function set_updated_at();

create index idx_meal_plans_user_date on meal_plans (user_id, date desc);

-- ------------------------------------------------------------
-- Row Level Security — owner only
-- ------------------------------------------------------------
alter table recipes    enable row level security;
alter table meal_plans enable row level security;

create policy "own recipes" on recipes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own meal_plans" on meal_plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.recipes    to authenticated, anon, service_role;
grant select, insert, update, delete on public.meal_plans to authenticated, anon, service_role;
