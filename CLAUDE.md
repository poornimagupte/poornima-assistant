# CLAUDE.md — project memory

This file orients Claude Code on the project. Read it before making changes.

## What this is

"Poornima's Assistant" — a personal assistant dashboard for one user (sharing may be added
later). It brings calendar, tasks, writing, hobbies, and household finances into
one calm screen. Built with the owner over several sessions; this file captures
the decisions so work continues seamlessly.

## Design priorities (in the owner's own ranking)

1. **Polished glance / calm vibe** — the dashboard's job is to orient in two
   seconds. Quiet surfaces, hairline borders, one accent. Don't add visual noise.
2. **Speed / keyboard control** — quick capture, fast nav.
3. **AI assistance** — present but subtle (e.g. "expand this idea"), never a
   chatbot bolted on.
4. **Deep organisation — LAST.** Resist nesting and elaborate hierarchies. Flat
   tables, light tags. If a feature adds structure for its own sake, push back.

## Tech stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (tokens in `app/globals.css`, calm flat palette)
- Supabase: Postgres + Auth (Google OAuth) + the auto data API
- `@supabase/ssr` for auth (getAll/setAll cookie pattern; `await cookies()`)
- lucide-react for icons

## Conventions (follow these)

- **Auth/data:** server clients via `lib/supabase/server.ts`, browser via
  `lib/supabase/client.ts`. Always verify with `supabase.auth.getUser()` in
  server code, not just the cookie.
- **Mutations are server actions** in `app/actions.ts` (`"use server"`), each
  ending in `revalidatePath(...)`. Client components call them via `<form
  action={...}>` or inside `useTransition`.
- **Every table** carries `user_id` + RLS (owner-only), `deleted_at` for soft
  deletes, and timestamps. Adding a table means adding its RLS policy.
- **Derive, don't store** values that can be computed (calendar events aren't
  stored; loan balances are summed from a ledger). See the schema notes.
- **Dates:** store `timestamptz`. Compose due/scheduled times in the browser's
  timezone (client builds the ISO) to avoid server-vs-user tz drift.
- Keep formatting/UI minimal and flat; match existing components.

## Database

Migrations live in `supabase/migrations/` (run in order in the Supabase SQL
editor or via the CLI):

- `0001_init_schema.sql` — profiles, projects, tasks, reminders, captures,
  blog_posts. RLS + an updated_at trigger + auto-profile-on-signup.
- `0002_hobbies.sql` — books (reading + listening), crochet_items; widens the
  captures triage targets.
- `0003_household.sql` — staff + staff_transactions (money ledger) +
  `staff_balances` view (derived outstanding advances, security_invoker=true).

Key modelling choices: a blog "idea" is just a `blog_posts` row at `stage='idea'`;
reminders are attached to tasks (offset-based) not a separate hub; a task has BOTH
`due_at` (deadline) and `scheduled_at` (do-date, drives time-blocking).

## Status

Built:
- Slice 1 — shell, Google login + session middleware, Quick Capture inbox,
  Today panel. (`app/dashboard`, `app/login`, `app/auth/*`)
- Slice 2 — Tasks view with grouping + editor (due date, priority, project,
  recurrence, reminders) and a drag-to-schedule time-blocking Planner.
  (`app/tasks`, `app/plan`, `components/task-*`, `components/planner.tsx`)

Pending (rough order):
- Google Calendar integration — merge events into the Today rail. Seam is marked
  in `components/today-panel.tsx`. Needs offline OAuth + stored refresh token.
- Household finance module — `/household` page over `staff` + `staff_balances`,
  with actions to log salary / advance / repayment into `staff_transactions`.
- Blog pipeline UI; reading + crochet widgets; AI touches; PWA install.
- Recurrence: when a recurring task is completed, spawn the next instance (logic
  not yet written; RRULE is stored).

## Commands

- `npm run dev` — local dev
- `npm run typecheck` — `tsc --noEmit` (keep this clean)
- `npm run build` — production build

## Env

Copy `.env.local.example` to `.env.local`:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. See `SELF_HOSTING.md`
if running a self-hosted Supabase stack (the owner is considering this — only the
two env vars change; the app code is unaffected).
