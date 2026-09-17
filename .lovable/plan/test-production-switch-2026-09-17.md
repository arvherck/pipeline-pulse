# Test / Production switch

Instead of deleting the sample data, the app gets two completely separate workspaces and a switch between them. Nothing ever mixes: each workspace has its own deals, actions, board placement, revenue plans, targets, board lanes, field names, picklists, history and snapshots.

## How it works

- A switch in Settings, at the top of a new "Environment" module: **Production** or **Test**.
- Switching is instant and reversible — no data is deleted, ever. What you were looking at is still there when you switch back.
- Everything in the app follows the active workspace: board, table, dashboard, actions, import, export, settings lists.
- Today's contents (the 40 sample deals and their actions) stay where they are, in **Test**, so Production starts empty and ready for your real pipeline. Test keeps being your playground.
- Test starts out with the standard board lanes, field names and picklists so it works straight away.
- One helper button: **Copy Production into Test** — replaces the Test workspace with a copy of Production, for trying something risky against realistic data. It asks for confirmation and only ever writes into Test.

## Making it obvious

- While in Test mode a coloured strip sits across the top of every page: "Test environment — this is not your real data."
- A small "TEST" badge sits next to the app name in the sidebar, visible on every page.
- Production mode shows neither, so the normal view stays clean.
- Backup files record which workspace they came from, and restoring a file loads into the workspace you are currently in (the confirmation says which one).

## Technical notes

- Migration (additive only): add `workspace text not null default 'production'` to `opportunities`, `actions`, `opportunity_status`, `lanes`, `picklists`, `field_labels`, `targets`, `revenue_plan`, `snapshots`, `import_runs`, `opportunity_field_changes`. Add a `check (workspace in ('production','test'))` and an index on `(workspace)` for the large tables. `app_settings` gains `active_workspace text not null default 'production'`.
- Composite-key uniqueness widens per workspace: `field_labels` key becomes `(workspace, field_name)`, `revenue_plan` unique becomes `(workspace, opportunity_id, period_month)`, `lanes.stage_value` unique becomes `(workspace, stage_value)`. `opportunities.id` stays the primary key, so a deal reference is unique across both workspaces (the copy step prefixes copied Test references, e.g. `TEST-<id>`) — FKs stay intact.
- Backfill in the same migration: existing rows are marked `workspace = 'test'`, then a seed of default `lanes`, `field_labels` and `picklists` rows is inserted with `workspace = 'production'` (INSERT ... SELECT from the test rows).
- `src/lib/pipeline.functions.ts`: `getPipeline` reads `active_workspace` from `app_settings` first, then adds `.eq('workspace', ws)` to every select. Every write function (`saveOpportunity`, `deleteOpportunity`, `saveAction`, `setOpportunityLane`, `saveLane`, `deleteLane`, `savePicklist`, `saveFieldLabel`, `saveTarget`, `saveRevenuePlan`, `resetRevenuePlan`, snapshot recording, the import upsert, `importState`) stamps and filters on the same value, resolved server-side — never taken from the client.
- New server functions: `setActiveWorkspace({ workspace })` upserting `app_settings`, and `copyProductionToTest()` which deletes Test rows child-first then re-inserts from Production in 400-row batches with remapped opportunity ids.
- `PipelineData` gains `workspace`; `src/components/app-shell.tsx` renders the banner and sidebar badge from it; new `src/components/environment-panel.tsx` holds the switch and the copy button, rendered in `src/routes/_authenticated/settings.tsx` above Backup & restore.
- `src/lib/state-transfer.ts` bundle gains an optional `workspace` field for information only; `importState` keeps writing into the active workspace.
