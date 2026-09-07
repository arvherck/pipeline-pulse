# Pipeline Tracker

An internal, login-only tool for tracking sales opportunities: import a spreadsheet export, work the deals on a kanban board, and review them in a dense filterable table.

## Login

- Email/password sign-in only, no public signup. The first account is created for you; everything behind the login is private.
- All pages except the sign-in page require being signed in.

## Import data

- Drag-and-drop an .xlsx or .csv export. The file is read on your own machine — nothing is uploaded.
- Step 2 lets you match each spreadsheet column to a known field (name, client, category, region, owner, deal value, weighted value, probability, quality score, close date, stage, fiscal period, segment, contract dates, stage change date, age, status notes, comment, open flag) or to a custom field where you type your own key name.
- A preview of the first 5 rows shows exactly what will be saved.
- Confirming updates existing opportunities matched on their source id, so re-importing a refreshed export never duplicates rows.
- Newly imported deals with no board status land in the first lane.

## Board

- Columns are your own workflow lanes (To do, In progress, Waiting, Blocked, Done by default), separate from the CRM stage that comes from the export.
- Drag cards between lanes; the change saves immediately.
- Each card shows deal name, client, value, close date, owner, and its CRM stage.
- Clicking a card opens a panel with full details, a status note, and a checklist of follow-up actions (text, owner, due date, done).

## Table

- Search box plus filters for category, region, segment and lane, and an "open only" toggle.
- Every column is sortable, and column headings use your own field names.

## Stats strip

Open deal count, total deal value, total weighted value, and a per-lane count, shown above both the board and the table.

## Settings

- Rename any field's on-screen label (e.g. call deal value "TCR" or "Contract Value").
- Manage the allowed values for stage, segment, category and region, including their order.
- Manage lanes: label, colour, order, which one is the default.
- Set targets per period (fiscal year or quarter) against either deal value or weighted value; the stats strip shows progress against the current target.

## Look and feel

Muted neutral background, a single accent colour, tight spacing, small type, no gradients or heavy shadows — built to be read out loud on a client call.

## Technical notes

- Enable Lovable Cloud. Tables: `opportunities` (text id from source, all listed columns, `custom_fields` jsonb), `picklists`, `field_labels`, `lanes`, `opportunity_status`, `actions`, `targets`. Row-level security on every table with policies scoped to authenticated users only; explicit grants to `authenticated` and `service_role`, none to `anon`. `updated_at` maintained by trigger.
- Migration seeds the 5 default lanes and default `field_labels` rows as literal INSERTs.
- Auth: email/password via the Supabase browser client; signup UI omitted. Protected pages live under the managed `_authenticated` layout; `/auth` is the public sign-in route. Root route subscribes once to auth state changes.
- Data access through `createServerFn` in `src/lib/*.functions.ts` with `requireSupabaseAuth`; reads via route loaders + `ensureQueryData`/`useSuspenseQuery`, writes via mutations that invalidate the relevant queries.
- Add `xlsx` (SheetJS) for browser-side parsing, and `@dnd-kit/core` + `@dnd-kit/sortable` for the kanban drag-and-drop. Import upsert batched (~500 rows per call) with `onConflict: 'id'`.
- Routes: `/auth`, `/` (board), `/table`, `/import`, `/settings`, each with its own head metadata.
