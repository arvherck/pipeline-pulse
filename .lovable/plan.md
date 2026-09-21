# Segment becomes an automatic field

Segment is currently something you pick by hand, with a warning when it disagrees with the deal value. From now on it is worked out for you from the weighted value, so it is always consistent.

## Rules

Bands stay exactly as today, but read from the weighted value:

- under $2m, $2m-$5m (boundary amounts count here), over $5m
- no weighted value yet (no deal value or no probability) means no segment

Weighted value itself already comes from deal value x probability, so changing either one updates the segment automatically.

## What changes for you

- The table's Segment column shows the automatic value, and the Segment filter keeps working exactly as before.
- Segment can no longer be typed or picked anywhere: it drops out of the opportunity window's editable fields and out of the import mapping (an imported Segment column is ignored rather than trusted).
- The old "Segment says X but the deal value suggests Y" warning disappears, because a mismatch is no longer possible.
- Every existing deal in both the real and test environments gets its segment recalculated right away.
- Targets scoped by Segment and exports keep working unchanged.

## Technical notes

- `src/lib/opportunity-schema.ts`: `segmentForValue` reads weighted value; add `segment` to the calculated set and derive it inside `withCalculatedFields` from the freshly computed weighted value; remove `segmentMismatch` and its use in `warningsFor`; drop `segment` from editable/picklist-editable handling.
- `src/lib/pipeline.functions.ts`: strip client-supplied `segment` from create/update/import payloads and let the derivation set it, so the server is the single source of truth.
- `src/components/opportunity-panel.tsx`: no segment editor (it is already hidden from the simplified panel); nothing user-visible to add.
- `src/components/pipeline-table.tsx`: unchanged — it reads the stored column.
- `src/lib/import-template.ts`: mark Segment in the Guide sheet as calculated, like the other derived fields.
- One data update recalculates `segment` from `weighted_value` for all rows in both workspaces. No schema change is needed.
