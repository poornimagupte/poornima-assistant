# Project status — Command (personal dashboard)

A calm, single-screen personal assistant for one user (sharing may come later):
calendar, tasks, writing, hobbies, and household finances in one place.

## Stack & conventions

- Next.js 15 (App Router) + React 19 + TypeScript; Tailwind v4 (tokens in
  `app/globals.css`); Supabase (Postgres + Auth + auto data API); `@supabase/ssr`;
  lucide-react.
- Mutations are server actions in `app/actions.ts` (`"use server"` +
  `revalidatePath`). Server code verifies auth with `supabase.auth.getUser()`.
- Every table has `user_id` + RLS (owner-only), `deleted_at` soft delete, and
  timestamps. New table ⇒ new RLS policy.
- Derive, don't store, anything computable (calendar isn't stored; loan balances
  are summed from a ledger). Dates are `timestamptz`, composed into ISO in the
  browser's timezone to avoid drift.
- Design priority order, set by the owner: glance/calm first, then
  speed/keyboard, then subtle AI, with deep organisation LAST (keep it flat —
  resist nesting and elaborate hierarchies).

## Done

**Database** (migrations in `supabase/migrations/`, run in order):
- `0001` — profiles, projects, tasks, reminders, captures, blog_posts; RLS,
  updated_at trigger, auto-profile-on-signup.
- `0002` — books (reading + listening), crochet_items; widens capture triage.
- `0003` — staff, staff_transactions (money ledger), staff_balances view
  (derived outstanding advances, security_invoker=true).

**Slice 1 — shell + capture + today**
- Google login via Supabase Auth; `middleware.ts` gates every route.
- Quick Capture inbox: capture anything → triage into a task or archive.
- Today panel: tasks due or time-blocked for today on one rail.
- A marked seam in `components/today-panel.tsx` for Google Calendar.

**Slice 2 — tasks + time-blocking**
- Tasks view (`/tasks`): inline create; grouped by due bucket
  (overdue/today/this week/later/no date); editor with due date+time, all-day,
  priority, project, recurrence (RRULE), notes, add/remove reminders; soft delete.
- Plan view (`/plan`): drag tasks from an unscheduled tray onto an hour grid to
  set `scheduled_at` (the do-date); drag to reschedule; x to unschedule; day nav.

**Repo** is git-initialised with an initial commit; `npm run typecheck` is clean
and `npm run build` passes.

## Planned (rough order)

1. **Household finance module** — schema done (`0003`), UI not built. A
   `/household` roster over `staff` + `staff_balances`, actions to log
   salary/advance/repayment into `staff_transactions`, an activity ledger, and a
   per-person detail/edit view. (A step-by-step prompt runway exists for this.)
2. **Google Calendar integration** — merge real events into the Today rail at the
   seam in `today-panel.tsx`. Needs offline Google OAuth and a stored refresh
   token (a small `google_credentials` table or Supabase Vault).
3. **Blog pipeline UI** — idea → outlining → drafting → editing → published, then
   wire the Blogger API as the publish step.
4. **Reading + crochet widgets** — `books` and `crochet_items` already exist in
   the schema; build the dashboard cards and management views.
5. **AI touches** — "expand this idea" on blog ideas, "summarise my day". Subtle,
   not a chatbot.
6. **PWA install** — make it installable on desktop and phone; optionally wrap in
   Tauri later for a native desktop window.

## Known gaps / follow-ups

- **Reminders delivery isn't built.** Plan: email as the reliable backbone, web
  push on top, dispatched by a scheduled job (Supabase cron/edge function) that
  scans for due, unsent reminders.
- **Recurrence is stored but not acted on** — when a recurring task is completed,
  spawn the next instance from its RRULE. Logic still to write.

## Open decisions

- **Self-hosting:** the owner is considering self-hosting the full Supabase stack
  for data ownership (see `SELF_HOSTING.md`). Only the two env vars change; app
  code is unaffected. Recommended to validate locally with `supabase start` first.
- **Sensitive-section gate:** optionally put `/household` behind a quick re-auth
  or PIN, since it holds employee financial records.

## Commands

`npm run dev` · `npm run typecheck` (keep clean) · `npm run build`
