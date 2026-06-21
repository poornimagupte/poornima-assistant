# Command — personal dashboard (slice 1)

A calm, single-screen personal assistant: calendar, tasks, writing, and hobbies.
Slices 1–2 ship the **shell, Google login, Quick Capture inbox, Today panel,
a full Tasks view, and drag-to-schedule time-blocking** — wired to the Supabase
schema in `0001_init_schema.sql` and `0002_hobbies.sql`.

## What works now

- Google sign-in (Supabase Auth), with middleware gating every page.
- Quick Capture — dump any thought; it lands in your `captures` inbox.
- Inbox — triage a capture into a task, or archive it.
- Today — tasks due or time-blocked for today, on one rail.
- Tasks (`/tasks`) — create tasks; group by due bucket (overdue/today/this
  week/later/no date); edit due date, priority, project, recurrence, notes;
  add/remove reminders; soft-delete.
- Plan (`/plan`) — time-blocking. Drag a task from the unscheduled tray onto an
  hour to set its do-date; drag between hours to reschedule; x to unschedule.
- A marked seam in `components/today-panel.tsx` where Google Calendar plugs in.

## Setup

1. **Create a Supabase project**, then run both migrations in the SQL editor:
   `0001_init_schema.sql`, then `0002_hobbies.sql`.

2. **Enable Google auth**: Supabase dashboard → Authentication → Providers →
   Google. Add your Google OAuth client ID/secret, and add
   `https://YOUR-PROJECT.supabase.co/auth/v1/callback` as an authorized redirect
   URI in the Google Cloud console.

3. **Environment**: copy `.env.local.example` to `.env.local` and fill in your
   project URL and anon (or publishable) key.

4. **Install & run**:
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:3000 — you'll be redirected to /login.

## Project shape

```
app/
  dashboard/page.tsx     server component: fetches today's tasks + inbox
  login/page.tsx         Google sign-in
  auth/callback          OAuth code exchange
  auth/signout           sign out
  actions.ts             server actions (capture, triage, toggle task)
components/               sidebar, quick-capture, inbox, today rail, task row
lib/supabase/            browser + server clients, session middleware
lib/types.ts             types mirroring the SQL schema
lib/date.ts              timezone-aware "today" range
```

## Next slices

2. ✅ Tasks view + drag-to-schedule time-blocking (done)
3. Google Calendar integration into the Today seam
4. Blog pipeline (then wire the Blogger API as the publish step)
5. Reading + crochet widgets
6. AI touches (expand idea, summarise day) + PWA install

### Notes on slice 2
- Time-blocking uses native HTML5 drag-and-drop (no extra deps). It's
  desktop-first; swap in `@dnd-kit` later if you want polished touch dragging.
- The planner fetches all open tasks and filters by day on the client, so the
  selected day always matches your own timezone.
- Recurrence is stored as an iCal RRULE string. Spawning the next instance when
  a recurring task is completed is app logic still to add.

> Note: package versions in `package.json` are recent at time of writing —
> `npm install` will resolve the latest compatible patches. The Google Calendar
> and Blogger integrations need a stored refresh token (request offline access
> at sign-in); that's the deliberate next step, not wired here.
