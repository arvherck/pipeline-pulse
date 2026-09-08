# Revert the board to a workflow track

The board goes back to its own workflow lanes, separate from each deal's Stage.

## Lanes

- Restore five lanes: To do, In progress, Waiting on Client, Blocked, Done — each with its own colour and order, all editable afterwards in "Manage lanes" (rename, recolour, reorder, add, delete, set default).
- Placement on switch-over: deals in any "Closed - ..." stage start in Done; every other deal starts in To do.
- Dragging a card, or Alt + ← / → on a focused card, moves it between lanes only. It no longer changes the deal's Stage, probability or dates.
- The stage-named columns created earlier are retired.

## Stage

- Stage stays a normal editable field in the detail panel and table, with its probability pre-fill on change, and still drives open/closed.
- Changing Stage no longer moves the card.

## Calculated fields

Unchanged: weighted value, open/closed, age and days in stage stay worked out and read-only.

## Everywhere else

- Table keeps its lane filter and lane column; stats strip keeps per-lane counts; the Excel export keeps its "Board column" column — all now reading the workflow lane again.

## Technical notes

- Migration: delete the stage-derived `lanes` rows, insert the five workflow lanes (`position`, `color`, `is_default` on To do), keep the `stage_value` column but leave it null. Repopulate `opportunity_status.lane_id` for every opportunity: Done when `stage` starts with `Closed`, else To do (keep existing `notes`).
- `laneOf` in `src/lib/use-pipeline.ts` reverts to reading `opportunity_status.lane_id`, falling back to the default lane.
- `src/lib/pipeline.functions.ts`: reintroduce `setOpportunityLane` (upsert `opportunity_status`, no stage/probability writes); keep `setOpportunityStage` out of the board path — stage edits go through `saveOpportunity` only. Lane rename/delete stops cascading into `opportunities.stage` and the stage picklist; delete still requires a destination lane and repoints `lane_id` first. New opportunities get a default-lane `opportunity_status` row.
- `kanban-board.tsx` calls `setOpportunityLane`; `manage-lanes-panel.tsx` reverts its wording to lanes; `opportunity-panel.tsx` keeps showing the lane read-only.
