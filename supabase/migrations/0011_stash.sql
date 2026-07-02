-- ============================================================
-- Stash — a flat, searchable, taggable collection of snippets.
-- Not a notes app: no folders, no hierarchy. "Things I want to
-- find again." Evernote imports land here too.
-- ============================================================

create table stash_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  body        text,                       -- markdown
  source_url  text,                       -- where it came from (optional)
  tags        text[] not null default '{}',
  source      text not null default 'manual'
                check (source in ('manual', 'capture', 'evernote')),
  -- Full-text search over title + body; searched via .textSearch("fts", …)
  fts         tsvector generated always as (
                to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))
              ) stored,
  created_at  timestamptz not null default now(),   -- import preserves Evernote dates
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create trigger trg_stash_updated
  before update on stash_items
  for each row execute function set_updated_at();

create index idx_stash_user   on stash_items (user_id, created_at desc) where deleted_at is null;
create index idx_stash_fts    on stash_items using gin (fts);
create index idx_stash_tags   on stash_items using gin (tags);

alter table stash_items enable row level security;
create policy "own stash_items" on stash_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.stash_items to authenticated, anon, service_role;

-- Teach the capture inbox to triage into the stash.
alter table captures drop constraint if exists captures_converted_to_check;
alter table captures add constraint captures_converted_to_check
  check (converted_to in ('task', 'blog_post', 'book', 'crochet_item', 'stash'));
