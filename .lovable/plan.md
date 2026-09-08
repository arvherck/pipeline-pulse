# Working the pipeline: add/remove deals, action tracking, status at a glance

## 1. Add and remove opportunities

- "New opportunity" button on both the board and the table. It opens the same detail panel in create mode with an auto-generated reference (MAN-0001, MAN-0002, ...), editable before saving.
- Required to save: name and stage. Everything else optional, same validation as today (numbers not negative, probability and quality 0-100, valid dates, segment/value warning, stage-driven probability default).
- New deals land in the default lane and count as open.
- "Delete opportunity" in the panel, permanent, behind a confirm step that names the deal and says its actions and history go too.
- A later import of the same reference updates the deal rather than duplicating it, exactly as imports work now.

## 2. Action tracking

Each action gains priority (High / Medium / Low), status (Open / In progress / Blocked / Done) and a notes field, alongside the existing text, owner and due date.

- Actions become editable in place, not just add/tick/delete.
- Status drives the tick: marking Done ticks it, unticking returns it to Open.
- New "Actions" page in the main navigation: every action across all deals in one list, showing the deal name, owner, due date, priority and status. Filters for owner, status, priority, overdue, and a toggle to hide completed. Sort by due date by default.

## 3. Status at a glance

- Board cards show a small badge with the count of open actions, turning to the warning colour when something is overdue, plus the next due date.
- Dashboard gains an "Needs attention" section with three compact lists: overdue actions, open deals with no open action, and open deals sitting in the same lane longest.
- Table gains an open-actions column and an overdue filter.

## 4. Look and behaviour

Reuses the existing light-cyberpunk styling, panel and label components. Stays usable down to tablet width. No new dependencies.

## Technical notes

- Migration: add `priority` (text, default 'Medium'), `status` (text, default 'Open'), `notes` (text) to `public.actions`; backfill `status` from `done`. Keep `done` in sync in the update path so existing code keeps working. Existing grants and policies already cover the table.
- New reference generation: server-side, take the max existing `MAN-nnnn` id and increment, checked inside the insert server function to avoid collisions.
- New server functions in `src/lib/pipeline.functions.ts`: `createOpportunity`, `deleteOpportunity` (removes dependent `actions`, `opportunity_status`, `opportunity_field_changes` rows first, since there is no cascade), `updateAction`.
- Deleting a deal also records a snapshot refresh, matching current edit behaviour.
- New route `src/routes/_authenticated/actions.tsx` plus a derived selector in `src/lib/use-pipeline.ts` for action rollups (open count, next due, overdue) keyed by opportunity, consumed by the board cards, table column and dashboard section.
- Panel changes stay inside `src/components/opportunity-panel.tsx` with a create mode flag; the new actions editor is a small dedicated component.
