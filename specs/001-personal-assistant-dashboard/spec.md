# Feature Specification: Personal Assistant Dashboard

**Feature Branch**: `001-personal-assistant-dashboard`

**Created**: 2026-06-27

**Status**: Implemented (retrospective spec)

**Input**: User description: "Document the full personal assistant dashboard as currently implemented — a calm, single-screen personal command center that brings calendar, tasks, writing, meals, crochet, household staff management, and quick capture into one place for a single user."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Glanceable Daily Overview (Priority: P1)

The user opens the dashboard and within two seconds understands what their day looks like: tasks due or time-blocked for today, pending inbox captures, today's calendar events pulled from Google Calendar, and today's meal plan — all on one calm screen with a personalised greeting.

**Why this priority**: This is the core value proposition — orient the user fast. Every other module feeds into or is navigated from this screen.

**Independent Test**: Can be fully tested by logging in and verifying the dashboard loads with today's tasks, inbox items, calendar events, and meal card visible. Delivers immediate daily orientation.

**Acceptance Scenarios**:

1. **Given** the user is signed in and has tasks due today, **When** they open `/dashboard`, **Then** they see a greeting with their name, today's date, and a rail of today's tasks sorted by due time.
2. **Given** the user has Google Calendar credentials stored, **When** the dashboard loads, **Then** calendar events for today appear alongside tasks in the Today panel.
3. **Given** the user has captures in "inbox" status, **When** they view the dashboard, **Then** the Inbox section shows all un-triaged captures with options to convert to task or archive.
4. **Given** a meal plan exists for today's date, **When** the dashboard loads, **Then** the Today Menu card displays breakfast, lunch, snacks, and dinner.

---

### User Story 2 - Quick Capture Inbox (Priority: P1)

The user captures a thought instantly via a text input on the dashboard. Captures land in an inbox and can later be triaged into a task or archived — keeping the user's mind clear without forcing immediate categorisation.

**Why this priority**: Speed of capture is critical to the "calm command center" promise. Friction here defeats the product's purpose.

**Independent Test**: Can be tested by typing a thought, submitting, seeing it in the inbox, then converting it to a task or archiving it.

**Acceptance Scenarios**:

1. **Given** the user is on the dashboard, **When** they type text into the Quick Capture input and submit, **Then** a new capture appears in the Inbox list immediately.
2. **Given** a capture is in the inbox, **When** the user clicks the "to task" action, **Then** a task is created with the capture's content as the title, and the capture is marked as triaged.
3. **Given** a capture is in the inbox, **When** the user clicks archive, **Then** the capture status becomes "archived" and it disappears from the inbox.

---

### User Story 3 - Task Management (Priority: P1)

The user manages all open tasks from a dedicated view, grouped by due-date buckets (overdue, today, this week, later, no date). They can create tasks inline, edit details (title, due date/time, all-day flag, priority, project, recurrence via RRULE, notes), add/remove time-based reminders, and soft-delete tasks. Completed tasks are shown in a separate section (last 30).

**Why this priority**: Task management is the backbone of daily productivity and is tightly coupled with the Today panel and time-blocking planner.

**Independent Test**: Can be tested by creating a task, setting a due date and priority, adding a reminder, completing it, and verifying it moves to the completed section.

**Acceptance Scenarios**:

1. **Given** the user is on `/tasks`, **When** they type a title and press enter, **Then** a new open task is created and appears in the appropriate due-date bucket.
2. **Given** an open task exists, **When** the user opens the task editor and sets due date, priority, and recurrence, **Then** those fields are persisted and the task re-groups accordingly.
3. **Given** a task has a due date, **When** the user adds a reminder with an offset (e.g. 15 minutes before), **Then** a reminder record is created linked to that task.
4. **Given** an open task, **When** the user marks it as done, **Then** the task status becomes "done", `completed_at` is set, and it appears in the completed section.
5. **Given** an open task, **When** the user deletes it, **Then** `deleted_at` is set (soft delete) and the task no longer appears in any view.

---

### User Story 4 - Time-Blocking Planner (Priority: P2)

The user drags tasks from an unscheduled tray onto an hourly grid to set when they'll work on each task. They can drag between hours to reschedule, remove scheduling, and navigate between days — all using native HTML5 drag-and-drop.

**Why this priority**: Time-blocking converts a task list into a concrete day plan. It's a natural extension of task management but not required for basic productivity.

**Independent Test**: Can be tested by navigating to `/plan`, dragging an unscheduled task onto an hour slot, seeing `scheduled_at` update, and verifying the task appears in Today's panel for that day.

**Acceptance Scenarios**:

1. **Given** the user is on `/plan`, **When** they drag an unscheduled task onto the 10:00 AM slot, **Then** the task's `scheduled_at` is set to that day at 10:00 AM.
2. **Given** a task is scheduled at 10:00 AM, **When** the user drags it to 2:00 PM, **Then** `scheduled_at` updates to 2:00 PM.
3. **Given** a scheduled task, **When** the user clicks the unschedule button, **Then** `scheduled_at` is cleared and the task returns to the unscheduled tray.
4. **Given** the planner is open, **When** the user navigates to a different day, **Then** the grid shows tasks scheduled for that day.

---

### User Story 5 - Meal Planning & Recipe Library (Priority: P2)

The user maintains a personal recipe library (Indian-cuisine-focused) and plans weekly meals. They can add/edit/delete recipes with metadata (meal type, cuisine, category, effort level, veg/non-veg), plan meals for each day (breakfast, snacks, lunch, dinner), copy last week's plan, ask AI to suggest meals based on their library and recent history, and print the week's plan.

**Why this priority**: Meal planning is a high-frequency household task. The recipe library adds lasting value and the AI suggestion feature reduces cognitive load.

**Independent Test**: Can be tested by adding a recipe, planning a day's meals, using AI suggestions, copying last week, and printing the plan.

**Acceptance Scenarios**:

1. **Given** the user is on `/meals`, **When** they add a recipe with name, cuisine, and meal types, **Then** the recipe appears in the recipe library.
2. **Given** the meal planner is open for a week, **When** the user types dish names into a day's breakfast/lunch/dinner fields and saves, **Then** a meal plan record is upserted for that date.
3. **Given** last week has meal plans, **When** the user clicks "Copy Last Week", **Then** this week's slots are populated with last week's meals.
4. **Given** recipes exist in the library, **When** the user requests AI suggestions for empty meal slots, **Then** the system calls the AI API and returns Indian-cuisine meal suggestions considering recent meal history.
5. **Given** a week's meal plan is filled, **When** the user opens the print view, **Then** a printer-friendly version of the week's meals is displayed.

---

### User Story 6 - Household Staff Management (Priority: P2)

The user manages household staff (domestic help): a roster with personal details, salary tracking via a financial ledger (salary payments, advances, repayments, bonuses, deductions), derived outstanding advance balances, and absence tracking. Each staff member has a detail page showing their full transaction history and attendance record.

**Why this priority**: Household finance is a real, recurring need. The ledger-based design (derive, don't store) ensures accuracy and auditability.

**Independent Test**: Can be tested by adding a staff member, logging a salary payment with advance deduction, checking the derived balance, and recording an absence.

**Acceptance Scenarios**:

1. **Given** the user is on `/staff`, **When** they add a new staff member with name, role, and salary, **Then** the member appears in the roster.
2. **Given** a staff member exists, **When** the user logs a salary payment with a deduction for an outstanding advance, **Then** two transactions are created (salary + repayment) and the outstanding advance balance decreases.
3. **Given** a staff member has transactions, **When** the user views `/staff/[id]`, **Then** they see the member's profile, transaction history, current advance balance (derived from the ledger), and absence records.
4. **Given** a staff member, **When** the user records an absence (date, type: sick/casual/holiday, note), **Then** the absence appears in the attendance section.
5. **Given** a staff member with advance outstanding, **When** the user views the roster, **Then** the outstanding amount is shown alongside the member's name (derived from `staff_balances` view).

---

### User Story 7 - Writing Pipeline (Priority: P3)

The user manages written content (blog posts, LinkedIn posts, conference papers, talks, newsletters) through a stage-based pipeline: idea → outlining → drafting → editing → published. They can add new ideas, edit content and metadata, advance pieces through stages, and use AI to expand an idea into an outline with hook, key points, and closing thought.

**Why this priority**: Writing is a personal creative workflow. The pipeline keeps ideas from getting lost and the AI assist reduces blank-page friction.

**Independent Test**: Can be tested by adding a writing idea, using AI to expand it, advancing through stages, and verifying stage transitions persist.

**Acceptance Scenarios**:

1. **Given** the user is on `/writing`, **When** they add a new idea with a title and content type, **Then** it appears in the "idea" column of the pipeline.
2. **Given** a writing idea exists, **When** the user clicks "Expand Idea" (AI), **Then** the system calls the AI API and returns a structured outline (hook, key points, closing).
3. **Given** a piece is at "idea" stage, **When** the user advances it, **Then** the stage updates to "outlining" and the piece moves to that column.
4. **Given** a piece reaches "published" stage, **When** it is advanced, **Then** `published_at` is set to the current timestamp.

---

### User Story 8 - Crochet & Ravelry Integration (Priority: P3)

The user manages crochet patterns, projects, and ideas on a visual board. Items can be manually added with details (title, kind, status, source URL, image, PDF pattern, yarn, hook size) or bulk-imported from Ravelry (projects + favorites) via the Ravelry API. Imported items are upserted by external ID to prevent duplicates.

**Why this priority**: Hobby tracking is a personal delight feature. The Ravelry sync is a differentiator that saves manual data entry.

**Independent Test**: Can be tested by adding a crochet item manually, triggering a Ravelry sync, and verifying imported items appear with correct status mapping.

**Acceptance Scenarios**:

1. **Given** the user is on `/crochet`, **When** they add a new item with title, kind (pattern/idea/project), and status, **Then** it appears on the board.
2. **Given** Ravelry credentials are configured, **When** the user triggers "Sync from Ravelry", **Then** projects and favorites are fetched, normalised, and upserted into `crochet_items` with `external_source = "ravelry"`.
3. **Given** a Ravelry item was previously synced, **When** the user syncs again, **Then** the existing record is updated (not duplicated) via the upsert on `user_id, external_source, external_id`.

---

### User Story 9 - Google Calendar Integration (Priority: P2)

Today's Google Calendar events are fetched and displayed alongside tasks in the Today panel. The system stores a refresh token, automatically refreshes access tokens when expired, and fetches primary calendar events for today's time window.

**Why this priority**: Calendar events are essential daily context. Without them, the dashboard gives an incomplete picture of the day.

**Independent Test**: Can be tested by storing Google credentials, loading the dashboard, and verifying calendar events appear in the Today panel.

**Acceptance Scenarios**:

1. **Given** the user has stored Google credentials with a valid refresh token, **When** the dashboard loads, **Then** today's calendar events are fetched and displayed in the Today panel.
2. **Given** the stored access token is expired, **When** the dashboard loads, **Then** the system refreshes the token using the refresh token, updates the stored credentials, and fetches events successfully.
3. **Given** no Google credentials are stored, **When** the dashboard loads, **Then** the calendar section is empty (no error shown) and the rest of the dashboard works normally.

---

### User Story 10 - Authentication & Session Management (Priority: P1)

The user signs in with their Google account via Supabase Auth. Every route except login and auth callbacks is protected by middleware. Sessions are managed via cookies using the `@supabase/ssr` pattern.

**Why this priority**: Authentication is the foundation — nothing else works without it.

**Independent Test**: Can be tested by visiting any page while signed out (redirected to login), signing in via Google, and verifying access to protected routes.

**Acceptance Scenarios**:

1. **Given** the user is not signed in, **When** they visit any page, **Then** they are redirected to `/login`.
2. **Given** the user is on `/login`, **When** they click "Sign in with Google", **Then** they are redirected to Google OAuth, and on return, a session is established and they land on `/dashboard`.
3. **Given** the user is signed in, **When** they click "Sign out", **Then** the session is destroyed and they are redirected to `/login`.

---

### Edge Cases

- What happens when the Ravelry API is unreachable during sync? → The action returns an error message; existing data is unaffected.
- What happens when the AI API key is missing? → AI features (expand idea, meal suggestions) return a clear error message; all non-AI features continue to work.
- What happens when a task is soft-deleted? → It disappears from all views but remains in the database; it can be recovered by clearing `deleted_at`.
- What happens when the Google Calendar refresh token is revoked? → `fetchTodayEvents` returns an empty array; the dashboard renders without calendar events.
- What happens when meal plan upsert conflicts on `user_id,date`? → The existing plan is overwritten (upsert behaviour), preserving the most recent input.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST authenticate users via Google OAuth through Supabase Auth and protect all routes with session middleware.
- **FR-002**: System MUST provide a Quick Capture input that stores arbitrary text and allows triaging captures into tasks or archiving them.
- **FR-003**: System MUST display a Today panel showing tasks due today, tasks time-blocked for today, and Google Calendar events for today.
- **FR-004**: System MUST present a meal plan card on the dashboard showing today's planned breakfast, snacks, lunch, and dinner.
- **FR-005**: System MUST support task CRUD with fields: title, notes, due date (with time and all-day option), priority (low/med/high), project, recurrence (RRULE), and tags.
- **FR-006**: System MUST support time-based reminders attached to tasks, with configurable offset in minutes and channel (email/push/both).
- **FR-007**: System MUST provide a time-blocking planner with drag-and-drop to set `scheduled_at` on tasks, with day navigation.
- **FR-008**: System MUST group open tasks by due-date buckets: overdue, today, this week, later, and no date.
- **FR-009**: System MUST soft-delete records (set `deleted_at`) rather than hard-delete for tasks, writing pieces, crochet items, and recipes.
- **FR-010**: System MUST provide a recipe library with fields: name, meal types, cuisine, category, effort level, vegetarian flag, notes, and tags.
- **FR-011**: System MUST support weekly meal planning with per-day slots for breakfast, snacks, lunch, and dinner.
- **FR-012**: System MUST allow copying the previous week's meal plan to the current week.
- **FR-013**: System MUST provide AI-powered meal suggestions using the recipe library and recent meal history, via the Anthropic API.
- **FR-014**: System MUST provide a printable view of the weekly meal plan.
- **FR-015**: System MUST manage household staff with a roster (name, role, phone, salary, pay day, start date, status, notes).
- **FR-016**: System MUST track staff financial transactions (salary, advance, repayment, bonus, reimbursement, deduction) in a ledger with payment method and for-month tracking.
- **FR-017**: System MUST derive outstanding advance balances from the transaction ledger via a database view (`staff_balances`), not store them as separate values.
- **FR-018**: System MUST support logging salary payments with automatic advance deduction (creates paired salary + repayment transactions).
- **FR-019**: System MUST track staff absences by date and type (sick, casual, holiday, other) with optional notes.
- **FR-020**: System MUST provide a writing pipeline with stages: idea → outlining → drafting → editing → published, supporting multiple content types (blog, LinkedIn, conference, talk, newsletter, other).
- **FR-021**: System MUST provide AI-powered idea expansion (via Anthropic API) that generates a hook, key points, and closing thought based on the piece's title and content type.
- **FR-022**: System MUST manage crochet items (patterns, ideas, projects) with status tracking (saved, queued, making, finished) and optional source URLs, images, PDFs, yarn, and hook size.
- **FR-023**: System MUST sync crochet data from Ravelry (projects + favorites) via the Ravelry API, upserting by external ID to prevent duplicates.
- **FR-024**: System MUST fetch and display Google Calendar events for today using stored OAuth credentials with automatic token refresh.
- **FR-025**: System MUST enforce row-level security (owner-only access) on every database table via `user_id` and RLS policies.
- **FR-026**: System MUST implement all data mutations as server actions (`"use server"`) that call `revalidatePath(...)` on completion.
- **FR-027**: System MUST compose all user-facing dates in the browser's timezone and store them as `timestamptz`.

### Key Entities

- **Profile**: User identity with display name and timezone preference, auto-created on signup.
- **Capture**: A quick thought in the inbox, triageable into tasks or archivable. Tracks conversion target (task/blog_post/book/crochet_item).
- **Task**: A to-do item with due date, scheduled date (time-blocking), priority, project association, recurrence (RRULE), and soft-delete.
- **Reminder**: A time-offset notification attached to a task, with channel preference and delivery status.
- **Project**: A grouping label for tasks, with name, color, and active/archived status.
- **Recipe**: A dish in the recipe library with meal type applicability, cuisine, category, effort level, and veg flag.
- **Meal Plan**: A single day's meal plan with slots for breakfast, snacks, lunch, and dinner.
- **Staff**: A household employee with personal details, salary configuration, and active/inactive status.
- **Staff Transaction**: A ledger entry recording money movement (salary, advance, repayment, bonus, etc.) with date, amount, method, and for-month.
- **Staff Balance**: A derived view summing outstanding advances and tracking last salary date per staff member.
- **Staff Absence**: A daily attendance record per staff member with type classification.
- **Blog Post (Writing)**: A content piece flowing through the writing pipeline, with stage, content type, target date, and publish timestamp.
- **Crochet Item**: A pattern, project, or idea with status, source links, materials, and optional Ravelry sync data.
- **Calendar Event**: A transient object (not stored) representing a Google Calendar event, mapped into the Today panel.
- **Google Credentials**: Stored OAuth tokens (access + refresh) for Google Calendar API access.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The user can orient themselves — understand today's tasks, calendar events, inbox items, and meal plan — within 2 seconds of the dashboard loading.
- **SC-002**: Capturing a thought takes fewer than 3 seconds (type and submit), with no mandatory categorisation at capture time.
- **SC-003**: The user can create, edit, prioritise, schedule, and complete a task without leaving the application.
- **SC-004**: Time-blocking a task (drag to an hour slot) takes a single drag gesture and persists immediately.
- **SC-005**: The weekly meal plan can be filled for 7 days in under 5 minutes, using AI suggestions and/or copy-last-week.
- **SC-006**: Staff salary payment with advance deduction is recorded as a single user action, producing correct paired ledger entries.
- **SC-007**: Outstanding advance balances are always accurate — derived from the transaction ledger, never manually maintained.
- **SC-008**: The Ravelry sync imports all user projects and favorites without creating duplicates on repeated syncs.
- **SC-009**: All data is accessible only to its owner — row-level security prevents any cross-user data access.
- **SC-010**: `npm run typecheck` passes at all times with zero suppressions unaccompanied by justification.
- **SC-011**: The application builds successfully (`npm run build`) and runs locally (`npm run dev`) without errors.

## Assumptions

- **Single user**: The application is designed for one user. Multi-user support (sharing, collaboration) is out of scope. However, the schema uses `user_id` + RLS to be safe if sharing is added later.
- **Desktop-first**: The planner's drag-and-drop uses native HTML5 events. Touch/mobile drag support (e.g., `@dnd-kit`) is a future enhancement.
- **Indian cuisine focus**: The meal planning module and AI suggestions are calibrated for an Indian household (South and North Indian cooking).
- **Anthropic API for AI**: AI features (expand idea, meal suggestions) use the Anthropic API (Claude Haiku 4.5). An `ANTHROPIC_API_KEY` environment variable is required.
- **Ravelry Basic Auth**: The Ravelry integration uses read-only Basic Auth with a personal app key. Credentials are stored as environment variables, not in the database.
- **Google Calendar via stored tokens**: Google Calendar integration requires a stored refresh token in the `google_credentials` table. The initial OAuth flow to obtain and store this token is assumed to be handled outside the main application flow (or via the Supabase Auth Google provider with offline access).
- **Reminders not yet delivered**: Reminder records are stored but no delivery mechanism (email, push) is implemented. This is a known gap.
- **Recurrence not yet acted on**: RRULE recurrence strings are stored on tasks but the logic to spawn the next instance upon task completion is not implemented.
- **Reading module not yet built**: The sidebar includes a "Reading" link but it is disabled (`ready: false`). The `books` table exists in the schema but no UI is built.
- **Supabase-hosted or self-hosted**: The app works with both hosted and self-hosted Supabase. Only the two environment variables change.
- **Tauri optional**: A Tauri v2 configuration exists for optional native desktop wrapping, but the primary experience is the web browser.
