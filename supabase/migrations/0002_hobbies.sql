-- ============================================================
-- Personal Assistant Dashboard — migration 0002
-- Adds hobby tracking: books (reading + listening) and crochet.
-- Run AFTER 0001_init_schema.sql.
-- ============================================================

-- ------------------------------------------------------------
-- books  (reading + listening unified; format distinguishes)
--   status : want -> reading -> finished (or abandoned)
--   narrator: only meaningful for audiobooks (nullable)
--   link    : Goodreads / Audible / Open Library / wherever
-- ------------------------------------------------------------
create table books (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  author       text,
  format       text not null default 'print'
                 check (format in ('print','ebook','audiobook')),
  status       text not null default 'want'
                 check (status in ('want','reading','finished','abandoned')),
  rating       integer check (rating between 1 and 5),  -- nullable until rated
  narrator     text,
  link         text,
  notes        text,
  tags         text[] not null default '{}',
  started_at   timestamptz,
  finished_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create trigger trg_books_updated
  before update on books
  for each row execute function set_updated_at();

create index idx_books_user   on books (user_id) where deleted_at is null;
create index idx_books_status on books (user_id, status) where deleted_at is null;

-- ------------------------------------------------------------
-- crochet_items  (patterns, ideas, and projects in one table)
--   kind   : pattern (a saved reference) | idea | project
--   status : saved -> queued -> making -> finished
--   pattern_id : optional self-reference — a project made from a saved pattern
--   source_url : the link to the pattern/tutorial
-- ------------------------------------------------------------
create table crochet_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  kind         text not null default 'idea'
                 check (kind in ('pattern','idea','project')),
  status       text not null default 'saved'
                 check (status in ('saved','queued','making','finished')),
  source_url   text,
  notes        text,
  yarn         text,        -- e.g. "stash wool, worsted"
  hook_size    text,        -- e.g. "4mm"
  image_url    text,        -- reference / progress photo
  pattern_id   uuid references crochet_items (id) on delete set null,
  tags         text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create trigger trg_crochet_updated
  before update on crochet_items
  for each row execute function set_updated_at();

create index idx_crochet_user   on crochet_items (user_id) where deleted_at is null;
create index idx_crochet_status on crochet_items (user_id, kind, status) where deleted_at is null;

-- ------------------------------------------------------------
-- Teach the capture inbox to triage into books and crochet too.
-- (Replaces the converted_to check from 0001.)
-- ------------------------------------------------------------
alter table captures drop constraint if exists captures_converted_to_check;
alter table captures add constraint captures_converted_to_check
  check (converted_to in ('task','blog_post','book','crochet_item'));

-- ------------------------------------------------------------
-- Row Level Security — owner only, same pattern as 0001
-- ------------------------------------------------------------
alter table books         enable row level security;
alter table crochet_items enable row level security;

create policy "own books" on books
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own crochet_items" on crochet_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.books         to authenticated, anon, service_role;
grant select, insert, update, delete on public.crochet_items to authenticated, anon, service_role;
