# Full state backup as a JSON file

Add two buttons in Settings: **Export state** and **Import state**. Export writes one JSON file containing everything in the app. Import reads such a file back and replaces everything with its contents, so you can carry the whole app between machines or run it against a fresh backend.

## Export

- One button, one file: `pipeline-state-YYYY-MM-DD.json`, built in the browser from data already loaded.
- Contents: opportunities (including extra fields), board lanes and each opportunity's placement, actions, field labels, picklists, targets, revenue plans, fiscal year setting, saved snapshots, import history and the per-field change history.
- The file also records a format version and the export date so future versions can read older files.

## Import

- File picker accepts `.json` only; the file is read on this computer.
- Before anything changes, a confirmation step shows what the file holds ("40 opportunities, 62 actions, 5 lanes…") and states plainly that everything currently in the app will be removed and replaced.
- On confirm: all existing rows are cleared and the file's rows are written in dependency order, then the screen refreshes with the new data.
- If the file is not a valid backup, nothing is touched and a clear message explains why.

## Notes

- Nothing here removes the cloud backend; this is a transfer/backup mechanism on top of it.
- The existing Excel export stays as-is — it is for reading, this JSON file is for restoring.

## Technical detail

- `src/lib/state-transfer.ts`: `StateBundle` type + zod schema (version `1`), `buildBundle(data)` from `PipelineData`, `downloadJson()` helper, and a `summarize(bundle)` used by the confirm dialog.
- `src/lib/pipeline.functions.ts`: new `exportState` is unnecessary (export uses the loaded `PipelineData`); add `importState` server fn with `requireSupabaseAuth`, validating the bundle, deleting in child→parent order (`field_changes`, `revenue_plan`, `actions`, `opportunity_status`, `snapshots`, `import_runs`, `opportunities`, `lanes`, `picklists`, `field_labels`, `targets`) then inserting in parent→child order in batches of 400. Returns per-table counts.
- Note: `opportunity_status.lane_id` references `lanes`, so lanes insert before statuses; `revenue_plan`/`actions`/`field_changes` reference `opportunities`.
- `app_settings` is upserted rather than deleted (single row).
- New `src/components/state-transfer-panel.tsx` rendered in `src/routes/_authenticated/settings.tsx` alongside the other panels; uses an AlertDialog for the replace confirmation and `useInvalidatePipeline()` after success.
