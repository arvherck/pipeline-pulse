# Manage lanes from the board

Add a lane editor to the board itself, so columns can be renamed, recoloured, reordered, added and removed without leaving the page — and removing a column always asks where its deals should go.

## What you get

- A small gear button in the board header opens a "Manage lanes" side panel.
- Each lane row: colour swatch, editable name, "Make default" toggle (where new imported deals land), up/down arrows to reorder, and a delete button.
- "Add lane" row at the bottom: pick a colour, type a name, add.
- Deleting a lane opens a confirm step: "Move its N deals to …" with a dropdown of the remaining lanes. Nothing is deleted until a destination is chosen; deals are moved first, then the lane goes.
- Deleting is blocked when it is the only lane left.
- Every change saves immediately and the board re-renders; settings survive reload and new sessions because they live in the database.

## Technical notes

- New component `src/components/manage-lanes-panel.tsx` using the existing Sheet, reusing the same editing patterns as the Lanes section in `src/routes/_authenticated/settings.tsx` (which stays as is).
- `src/routes/_authenticated/board.tsx` gains a header row with the gear trigger; panel receives the already-loaded `PipelineData`.
- Server side, in `src/lib/pipeline.functions.ts`:
  - Reuse `saveLane` for rename/colour/position/default.
  - Extend `deleteLane` to accept `{ id, reassignToLaneId }`: reassign `opportunity_status.lane_id` for rows pointing at the deleted lane, then delete. Required because `opportunity_status.lane_id` has a foreign key to `lanes`, so a bare delete would fail or orphan cards. Validate that the target lane exists, differs from the deleted one, and that at least one lane remains; if the deleted lane was the default, mark the destination lane default.
  - Update the settings page call site to pass the destination too (it will prompt the same way).
- Reordering swaps positions of the two affected lanes, same approach already used in settings.
- All mutations invalidate the `["pipeline"]` query via `useInvalidatePipeline`.
- No schema migration needed.
