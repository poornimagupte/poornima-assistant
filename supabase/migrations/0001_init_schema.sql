-- ============================================================
-- Personal Assistant Dashboard — initial schema
-- Target: Supabase (Postgres 15+)
--
-- Design principles
--   * Single user now, shareable later  -> every row carries user_id + RLS
--   * Keep org light                     -> flat tables, tags as text[] arrays
--   * Capture-first                      -> captures inbox feeds tasks/posts
--   * Calendar is NOT stored             -> fetched live from Google Calendar API;
--                                           only tasks.scheduled_at (the "do date") lives here
-- Run this in the Supabase SQL editor, or as a migration file.
-- ============================================================

create extension if not exists "pgcrypto";  -- for gen_random_uuid()

-- ------------------------------------------------------------
-- Reusable: keep updated_at fresh on every UPDATE
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- profiles  (1:1 with auth.users — display prefs + timezone)
-- timezone matters: reminders are scheduled against it.
-- ------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  timezone      text not null default 'Asia/Kolkata',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_profiles_updated
  before update on profiles
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- projects  (flat — no nesting)
-- ------------------------------------------------------------
create table projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  color       text,                       -- hex or token name for the UI
  status      text not null default 'active'
                check (status in ('active','archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz                 -- soft delete
);

create trigger trg_projects_updated
  before update on projects
  for each row execute function set_updated_at();

create index idx_projects_user on projects (user_id) where deleted_at is null;

-- ------------------------------------------------------------
-- tasks
--   due_at       = the DEADLINE (when it's owed)        [nullable]
--   scheduled_at = the DO DATE  (when you'll work on it) [nullable, powers time-blocking]
--   is_all_day   = true -> ignore the time component of due_at
--   recurrence   = iCal RRULE string, e.g. 'FREQ=WEEKLY;BYDAY=SU' [nullable]
-- ------------------------------------------------------------
create table tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  project_id    uuid references projects (id) on delete set null,
  title         text not null,
  notes         text,
  status        text not null default 'open'
                  check (status in ('open','done')),
  priority      text check (priority in ('low','med','high')),  -- nullable = unset
  due_at        timestamptz,
  is_all_day    boolean not null default false,
  scheduled_at  timestamptz,
  recurrence    text,
  tags          text[] not null default '{}',
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create trigger trg_tasks_updated
  before update on tasks
  for each row execute function set_updated_at();

create index idx_tasks_user        on tasks (user_id) where deleted_at is null;
create index idx_tasks_due         on tasks (user_id, due_at) where deleted_at is null and status = 'open';
create index idx_tasks_scheduled   on tasks (user_id, scheduled_at) where deleted_at is null;
create index idx_tasks_project     on tasks (project_id) where deleted_at is null;

-- ------------------------------------------------------------
-- reminders  (attached to a task — NOT a separate user-facing feature)
--   Provide EITHER offset_minutes (relative to task.due_at, the common case)
--   OR remind_at (absolute) — never both, never neither.
--   A scheduled job scans for due, unsent reminders and dispatches them.
-- ------------------------------------------------------------
create table reminders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  task_id         uuid not null references tasks (id) on delete cascade,
  offset_minutes  integer,        -- e.g. 1440 = "1 day before", 30 = "30 min before"
  remind_at       timestamptz,    -- absolute alternative
  channel         text not null default 'email'
                    check (channel in ('email','push','both')),
  status          text not null default 'pending'
                    check (status in ('pending','sent','cancelled')),
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),
  constraint reminder_one_anchor check (
    (offset_minutes is not null and remind_at is null) or
    (offset_minutes is null     and remind_at is not null)
  )
);

create index idx_reminders_due on reminders (status, remind_at);
create index idx_reminders_task on reminders (task_id);

-- ------------------------------------------------------------
-- captures  (the quick-capture inbox / single dump box)
--   Triaged into a task or a blog post. converted_to + converted_id is a
--   loose polymorphic pointer (no hard FK, since target table varies).
-- ------------------------------------------------------------
create table captures (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  content       text not null,
  status        text not null default 'inbox'
                  check (status in ('inbox','triaged','archived')),
  converted_to  text check (converted_to in ('task','blog_post')),  -- null until triaged
  converted_id  uuid,
  created_at    timestamptz not null default now(),
  triaged_at    timestamptz,
  deleted_at    timestamptz
);

create index idx_captures_inbox on captures (user_id, created_at)
  where status = 'inbox' and deleted_at is null;

-- ------------------------------------------------------------
-- blog_posts  (one row per piece; an "idea" is just stage = 'idea')
--   blogger_post_id / blogger_url are set when pushed live via the Blogger API.
-- ------------------------------------------------------------
create table blog_posts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  title            text not null,
  body             text,                  -- markdown; empty for early-stage ideas
  stage            text not null default 'idea'
                     check (stage in ('idea','outlining','drafting','editing','published')),
  tags             text[] not null default '{}',
  blogger_post_id  text,                  -- set once exported to Blogger
  blogger_url      text,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create trigger trg_blog_posts_updated
  before update on blog_posts
  for each row execute function set_updated_at();

create index idx_blog_posts_stage on blog_posts (user_id, stage) where deleted_at is null;

-- ============================================================
-- Row Level Security
-- Owner-only access today. To share later, add a memberships table
-- and widen these USING clauses — no schema rewrite needed.
-- ============================================================
alter table profiles    enable row level security;
alter table projects    enable row level security;
alter table tasks       enable row level security;
alter table reminders   enable row level security;
alter table captures    enable row level security;
alter table blog_posts  enable row level security;

create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own projects" on projects
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own tasks" on tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own reminders" on reminders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own captures" on captures
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own blog_posts" on blog_posts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up
-- ------------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Explicit grants required in Supabase local (auto-expose is disabled by default).
grant select, insert, update, delete on public.profiles    to authenticated, anon, service_role;
grant select, insert, update, delete on public.projects    to authenticated, anon, service_role;
grant select, insert, update, delete on public.tasks       to authenticated, anon, service_role;
grant select, insert, update, delete on public.reminders   to authenticated, anon, service_role;
grant select, insert, update, delete on public.captures    to authenticated, anon, service_role;
grant select, insert, update, delete on public.blog_posts  to authenticated, anon, service_role;
