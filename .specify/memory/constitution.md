<!--
Sync Impact Report
==================
Version change: (none) → 1.0.0
Modified principles: N/A (initial ratification)
Added sections:
  - Core Principles (8 principles)
  - Technology Stack
  - Development Workflow
  - Governance
Removed sections: N/A
Templates requiring updates:
  - plan-template.md: ✅ reviewed — Constitution Check section is generic; will
    be populated per-feature by /speckit-plan using these principles. No edit needed.
  - spec-template.md: ✅ reviewed — no constitution-specific references. No edit needed.
  - tasks-template.md: ✅ reviewed — task categorization is story-based, not
    principle-driven. No edit needed.
  - commands/*.md: ✅ reviewed — no agent-specific names found.
  - README.md: ✅ reviewed — design priorities listed match constitution. No edit needed.
  - CLAUDE.md: ✅ reviewed — conventions align with principles. No edit needed.
Follow-up TODOs: none
-->

# Poornima's Assistant Constitution

## Core Principles

### I. Calm-First UI

The dashboard MUST orient the user in two seconds. Every screen follows
a calm, glanceable aesthetic: quiet surfaces, hairline borders, and a
single accent color. Visual noise — gratuitous animation, dense
chrome, competing colors — MUST NOT be introduced.

**Rationale:** The owner's top design priority. The product is a
personal command center, not a feature showcase. If a UI change makes
the screen feel louder, it is wrong.

### II. Flat Over Deep

Resist nesting, elaborate hierarchies, and structure-for-its-own-sake.
Use flat tables and light tags. If a feature adds organisational depth
without clear user value, it MUST be pushed back on or simplified.

**Rationale:** Deep hierarchies create cognitive overhead. A personal
tool should feel effortless, not enterprise.

### III. Server Actions for Mutations

All data mutations MUST be implemented as server actions in
`app/actions.ts` (or co-located `actions.ts` files) using `"use server"`,
and MUST call `revalidatePath(...)` on completion. Client components
MUST NOT make direct database calls — they invoke server actions via
`<form action={...}>` or inside `useTransition`.

**Rationale:** Centralises write logic, keeps auth verification
server-side, and guarantees cache invalidation.

### IV. RLS + Soft Delete on Every Table

Every database table MUST carry:
- `user_id` column with a row-level security policy (owner-only access).
- `deleted_at` column for soft deletes.
- `created_at` and `updated_at` timestamps.

Adding a new table means adding its RLS policy in the same migration.
No exceptions.

**Rationale:** Single-user today, but the schema MUST be safe if
sharing is added later. Soft deletes enable undo and audit.

### V. Derive, Don't Store

Values that can be computed from existing data MUST NOT be stored as
separate columns or rows. Examples: calendar event lists (fetched from
Google), loan balances (summed from a ledger), today's tasks (filtered
from all tasks).

**Rationale:** Stored derivations drift. A single source of truth
eliminates sync bugs.

### VI. Browser-Timezone Dates

All due dates and scheduled times MUST be composed in the browser's
timezone — the client builds the ISO string and sends it to the server
as `timestamptz`. The server MUST NOT impose its own timezone when
creating or interpreting user-facing dates.

**Rationale:** A personal dashboard used from one timezone. Building
the ISO on the client eliminates the class of bugs where the server's
clock or locale disagrees with the user's.

### VII. Typecheck Must Stay Clean

`npm run typecheck` (`tsc --noEmit`) MUST pass at all times. A
`@ts-ignore` or `@ts-expect-error` suppression MUST be justified in a
comment and reviewed — it is not a shortcut for "fix later."

**Rationale:** TypeScript is the guardrail against runtime surprises
in a codebase that relies heavily on server/client boundaries.

### VIII. Local Testing Before Merge

Every change MUST be verified locally (at minimum `npm run dev` +
manual walkthrough of affected flows) before being committed. Build
(`npm run build`) and typecheck MUST also pass. No blind pushes.

**Rationale:** This is a single-owner project without CI. Local
verification is the only safety net.

## Technology Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 (design tokens in `app/globals.css`,
  calm flat palette)
- **Backend / Auth:** Supabase (Postgres + Auth via Google OAuth +
  auto data API); `@supabase/ssr` for cookie-based auth
  (`getAll`/`setAll` pattern; `await cookies()`)
- **Icons:** lucide-react
- **Desktop (optional):** Tauri v2 for native wrapping

New dependencies SHOULD be avoided unless they deliver clear,
irreplaceable value. Prefer platform APIs and slim libraries.

## Development Workflow

1. **Auth/data access:** Use server clients via `lib/supabase/server.ts`
   and browser clients via `lib/supabase/client.ts`. Always verify with
   `supabase.auth.getUser()` in server code — never trust the cookie
   alone.
2. **Migrations:** Live in `supabase/migrations/`, run in order via the
   SQL editor or Supabase CLI. Each migration is a self-contained DDL
   file.
3. **Formatting/UI:** Match existing components. Keep UI minimal and
   flat. When in doubt, remove rather than add.
4. **Commits:** Commit after each logical unit of work with a
   descriptive message. Verify typecheck + build before committing.

## Governance

- This constitution supersedes all other guidance when there is a
  conflict. If a convention in `CLAUDE.md`, `README.md`, or any other
  doc contradicts a principle here, this document wins.
- **Amendments** require:
  1. A written proposal describing the change and its rationale.
  2. Owner approval.
  3. A version bump (see below) and update to this file.
  4. A review of dependent templates for consistency (see Sync Impact
     Report at the top of this file).
- **Versioning:** MAJOR.MINOR.PATCH (semver).
  - MAJOR: Principle removed or redefined in a backward-incompatible way.
  - MINOR: New principle or section added, or existing guidance
    materially expanded.
  - PATCH: Wording clarifications, typo fixes, non-semantic refinements.
- **Compliance:** Every code change SHOULD be reviewed against these
  principles. Complexity MUST be justified.

**Version**: 1.0.0 | **Ratified**: 2026-06-27 | **Last Amended**: 2026-06-27
