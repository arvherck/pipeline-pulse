# Board lanes as stages, calculated fields, sample actions, Excel export

## 1. Lanes become stages

Today the board has its own workflow track (To do, In progress, Waiting on Client, Blocked, Done) that is unrelated to each deal's Stage (Lead, Qualify, Propose, Negotiate, Closed - Won/Lost/...). That's the disagreement you spotted.

- The board's columns become the stages themselves, in the order they appear in the stage list, with a colour per stage.
- Dragging a card (or Alt + arrow keys) sets the deal's Stage. Along with it: probability resets to that stage's standard value, open/closed is recalculated, the last-stage-change date is set to today, and the move is written to the deal's history.
- Changing Stage in the detail panel moves the card on the board — one field, one source of truth.
- The gear panel on the board becomes "Manage stages": rename a stage, change its colour, reorder, add a new one, delete one (still asking which stage its deals move to first). Renaming a stage renames it on every deal that uses it.
- The five old workflow lanes are retired; the per-deal note that lived alongside them is kept.

## 2. Calculated fields

These stop being typed and are worked out for you, shown read-only in the panel and table:

- **Weighted value** = deal value x probability. Recalculated whenever either changes, on manual edits and on import.
- **Open / closed** = closed for any "Closed - ..." stage, open otherwise.
- **Age** = days since the deal was created. **Days in stage** = days since its last stage change. Both stay current as time passes rather than going stale.

Probability stays editable, pre-filled from the stage as it is today.

## 3. Sample actions

Around 18 actions spread over the open deals: realistic text, mixed owners, a range of due dates (a few overdue, a few coming up), mixed priorities and statuses, a couple already done — enough to make the Actions page, board badges and "Needs attention" look real.

## 4. Excel export

A single "Export" button (Board, Table and Actions pages) produces one .xlsx with two tabs: **Opportunities** (all columns, your own field labels as headers, plus open/overdue action counts) and **Actions** (deal reference and name, action text, owner, due date, priority, status, notes). Built in the browser, nothing uploaded. The existing CSV of the filtered table is replaced by this.

## Technical notes

- Migration: add `stage_value text unique` to `public.lanes`, seed one lane per stage picklist value (label/colour/position), drop the retired workflow rows and repoint `opportunity_status` (keep the `notes` column, stop using `lane_id` for placement). Backfill `weighted_value = deal_value * probability / 100` and `is_open` from stage; drop stored `age_days` / `stage_duration_days` reliance by computing them in `src/lib/pipeline-types.ts` helpers.
- `setOpportunityLane` in `src/lib/pipeline.functions.ts` is replaced by `setOpportunityStage`, which updates `stage`, `probability`, `is_open`, `last_stage_change`, recomputes `weighted_value`, writes `opportunity_field_changes` rows and refreshes snapshots. `saveOpportunity` and the import upsert route through the same derivation helper.
- `laneOf`/`actionRollups` in `src/lib/use-pipeline.ts` switch to grouping by `stage`; `kanban-board.tsx` and `manage-lanes-panel.tsx` follow.
- Sample actions inserted as literal rows against existing open opportunity ids.
- Export lives in a new `src/lib/xlsx-export.ts` using the already-installed `xlsx` package (`utils.book_new` + two `json_to_sheet` tabs), replacing `src/lib/csv.ts` usage in `pipeline-table.tsx`.
