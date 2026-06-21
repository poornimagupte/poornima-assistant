-- Google OAuth tokens for Calendar integration.
-- Stored per-user; upserted on every login that returns a refresh token.
create table google_credentials (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  access_token  text not null,
  refresh_token text not null,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_google_creds_updated
  before update on google_credentials
  for each row execute function set_updated_at();

alter table google_credentials enable row level security;

create policy "own google_credentials" on google_credentials
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Explicit grants required in newer Supabase local versions.
grant all on google_credentials to service_role;
grant all on google_credentials to authenticated;
grant all on google_credentials to anon;
