# Clear out the test data in one click

The app is full of sample deals and made-up actions. This adds a small "Start clean" module in Settings, right under Backup & restore, so you can wipe the practice data without touching your setup.

## Two buttons

**Clear deals & actions** — removes every opportunity, its actions, board placement, revenue plans, history entries and saved snapshots. Keeps everything you configured: board lanes, field names, picklists, targets, and the fiscal year setting. This is the one to use when you want a real, empty pipeline to start entering your own deals.

**Reset everything** — as above, and also clears picklists, field names, targets and import history, and puts the fiscal year setting back to September. You end up with the same starting point as a brand new app (the five default board lanes and default field names are put back so the app still works).

## Safety

- Each button opens a confirmation that spells out exactly what will be removed and how many rows that is right now ("40 opportunities, 18 actions, 7 history entries…").
- The confirmation offers to save a backup file first, using the existing Export state, so nothing is lost by accident.
- You have to type nothing, but the confirm button is worded plainly ("Delete 40 opportunities") so it can't be clicked by reflex.
- After it finishes, the board, table and dashboard show the empty state that already exists ("No opportunities yet — import a spreadsheet, or add one by hand").

## Technical notes

- New server function `clearData` in `src/lib/pipeline.functions.ts` (POST, `requireSupabaseAuth`), input `{ scope: "deals" | "all" }`. Deletes child-first in the same order `importState` already uses: `opportunity_field_changes`, `revenue_plan`, `actions`, `opportunity_status`, `snapshots`, `opportunities`. For `scope: "all"` it additionally clears `import_runs`, `picklists`, `field_labels`, `targets`, re-seeds the five default lanes and the default `field_labels`, and upserts `app_settings` back to `fiscal_year_start_month: 9`. Returns per-table counts.
- Reuses the delete-with-not-null-filter pattern from `importState`; lanes are deleted and re-inserted only in the `all` scope so `opportunity_status` FKs are already gone.
- UI: new `ResetDataPanel` in `src/components/reset-data-panel.tsx` using `AlertDialog` like `state-transfer-panel.tsx`, counts derived from the loaded `PipelineData`, `useServerFn(clearData)` + `useInvalidatePipeline()`, "Save a backup first" calling `downloadJson(bundleFilename(), buildBundle(data))` from `src/lib/state-transfer.ts`. Rendered in `src/routes/_authenticated/settings.tsx` after `StateTransferPanel`.
- No schema change; no migration needed.
