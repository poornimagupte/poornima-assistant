# Self-hosting your dashboard's backend (Supabase stack)

This moves your data onto hardware you control **without rewriting the app**.
You self-host the whole Supabase stack (Postgres + Auth + the data API), so
`auth.uid()`, your RLS policies, and every `supabase.from(...)` call keep
working. The only app change is two env vars.

> Why the whole stack and not bare Postgres? Your app depends on GoTrue (Google
> login) and PostgREST (the data API). Bare Postgres alone would mean rebuilding
> auth and rewriting all queries — a real rewrite. The full stack avoids that.

---

## 0. What you need

- A machine you control: a small VPS, or a home mini-PC/server.
  Minimum ~4 GB RAM / 2 cores; 8 GB / 4 cores is comfortable.
- Docker Engine 20.10+ and Docker Compose v2+.
- A domain name with HTTPS (Google OAuth rejects non-HTTPS callbacks).
  For a home box, a tunnel (Tailscale, Cloudflare Tunnel) can provide this.

Optional first step — try it on your laptop before committing to a server:
the Supabase CLI (`supabase start`) spins up the same stack locally via Docker.
Good for validating the app against a self-hosted backend. It's dev-only; don't
run it as your real instance.

---

## 1. Get and configure the stack

Follow the official guide as the source of truth (commands shift between
versions): https://supabase.com/docs/guides/self-hosting/docker

The shape of it:

```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env

# CRITICAL: generate your own secrets. Never boot with the placeholder
# values from .env.example — that's the #1 self-hosting security mistake.
# Use the repo's key-generation script (see the guide), then confirm these
# are all unique in .env:
#   POSTGRES_PASSWORD   (letters + numbers only, no special chars)
#   JWT_SECRET          (must be identical across all services)
#   ANON_KEY            (your app uses this)
#   SERVICE_ROLE_KEY    (server-only; never ship to the browser)
#   DASHBOARD_PASSWORD  (protects Studio; must contain a letter)
```

Set your URLs in `.env` to your real domain (all HTTPS):

```
SUPABASE_PUBLIC_URL=https://db.yourdomain.com
API_EXTERNAL_URL=https://db.yourdomain.com
SITE_URL=https://app.yourdomain.com      # where your Next.js app lives
```

---

## 2. Configure Google sign-in (moves from dashboard to env)

Self-hosted has no dashboard toggle for OAuth — you set it via environment
variables on the auth service. Add to `.env` (and the matching
`GOTRUE_EXTERNAL_GOOGLE_*` lines in `docker-compose.yml`, which ship commented
out):

```
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=your-google-client-id
GOTRUE_EXTERNAL_GOOGLE_SECRET=your-google-client-secret
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://db.yourdomain.com/auth/v1/callback
```

Then in the Google Cloud Console, set that exact callback URL as an Authorized
redirect URI on your OAuth client. (It now points at *your* domain, not
supabase.co.)

---

## 3. Start it and load your schema

```bash
docker compose up -d        # from the supabase/docker directory
docker compose ps           # wait until services are "Up (healthy)"
```

Open Studio at your domain (HTTP basic auth: DASHBOARD_USERNAME /
DASHBOARD_PASSWORD), go to the SQL Editor, and run your migrations in order:

1. `0001_init_schema.sql`
2. `0002_hobbies.sql`
3. `0003_household.sql`

(Or via psql against the db container — whichever you prefer.)

---

## 4. Point the app at your instance

The only change to the Next.js app. In `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://db.yourdomain.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=<the ANON_KEY you generated in step 1>
```

Restart `npm run dev` (env is only read at startup). Everything else — the
clients, RLS, the queries — is unchanged.

---

## 5. Security checklist (do not skip)

- Expose ONLY the Kong gateway (ports 8000/8443) behind an HTTPS reverse proxy
  (Caddy and Traefik both do automatic HTTPS). Never expose Postgres (5432),
  GoTrue (9999), or PostgREST (3000) to the internet.
- Firewall everything else. The database should not be reachable from outside.
- Strong, unique `DASHBOARD_PASSWORD` and `POSTGRES_PASSWORD`.
- Keep `SERVICE_ROLE_KEY` server-side only — it bypasses RLS.

---

## 6. Backups — this is now YOUR job

Managed Supabase did automatic backups and point-in-time recovery. Self-hosted
does not. For records you care about (especially the household finances), set up
your own. A daily dump, gzipped, copied off the box:

```bash
# backup.sh — schedule via cron, e.g. 0 2 * * *  (2am daily)
STAMP=$(date +%F)
docker exec -t supabase-db pg_dump -U postgres -d postgres \
  | gzip > "/backups/dashboard-$STAMP.sql.gz"

# Then copy /backups off the machine (rclone to encrypted cloud storage,
# another disk, etc.) and prune old files.
```

Two rules everyone learns the hard way:
- A backup you've never restored is not a backup — test a restore.
- `docker compose down -v` deletes the data volume. The `-v` wipes everything.
  Use plain `docker compose down` to stop without data loss.

---

## What you give up vs managed Supabase

Automatic managed backups / PITR, the dashboard OAuth config UI, branching, and
advanced platform metrics. In exchange you get full ownership of where the data
lives. That trade is the whole point — just go in knowing backups and uptime are
now yours to run.
