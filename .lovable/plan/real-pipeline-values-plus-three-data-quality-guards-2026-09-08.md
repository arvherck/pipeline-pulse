# Real pipeline values, plus three data-quality guards

Fill the dropdowns with the values that actually appear in the export, rename Region to Market Unit, and add three checks that catch the drift this data is prone to.

## Dropdown values (editable in Settings afterwards)

- Stage: Stage 0A, Stage 1, Closed - Won, Closed - Lost, Closed - Client Withdrawn, Closed - Vendor Withdrawn, Closed - Duplicate. Stages 2A/2B/3A/3B can be added later in Settings — nothing is hard-coded to this list.
- Segment: <$2m, $2m-$5m, >$5m
- Category: BOT, Customer Platform, Digital, ILM AMS/BD, Marketing Transformation, SAP, Security, Talent & Change Management, Tech, Unspecified
- Market Unit: CEE, ITG, NLN, US-Products

Labels: Category stays "Category", Segment stays "Segment", Region is displayed as "Market Unit" everywhere (deal panel, table headings, filters, export).

Existing deals keep whatever value they came in with; anything outside these lists still shows as "(not in list)" rather than being rewritten.

## Segment vs deal value check

A yellow banner at the top of the deal's Details tab when the two disagree, e.g. segment says <$2m but the value is 3.4m. It never blocks saving — it names the segment the amount suggests so the mismatch is obvious. Bands: under 2,000,000 / 2,000,000-5,000,000 / over 5,000,000; the boundary amounts count as $2m-$5m.

## Probability follows stage

Changing stage pre-fills probability: Stage 0A 10, Stage 1 30, then 50 / 70 / 90 for 2A / 2B / 3A-3B as they get added, any "Closed - Won" 100, any other "Closed -" stage 0. A short note under the box says it came from the stage; you can type over it and it stays. Probability is only pre-filled on a stage change, never overwritten on open or save.

## Status notes becomes Qualified / Unqualified

For an open deal, status notes is a dropdown: Qualified or Unqualified. Once a deal is marked closed, the field turns read-only and simply reflects the stage's outcome (Won, Lost, Client Withdrawn, Vendor Withdrawn, Duplicate), so the two can no longer disagree. Free-text notes already in the field on an existing deal are preserved and shown as an extra "(not in list)" choice until you pick one.

## Technical notes

- Data-only inserts (run_sql, not a migration): `picklists` rows for the four fields with `position` in the order listed, `value` = `label` = the strings above; `field_labels` upsert for `region` -> "Market Unit" (category/segment already correct).
- `src/lib/opportunity-schema.ts`: add `segmentForValue(dealValue)` + extend `warningsFor` with the segment/value mismatch; add `PROBABILITY_BY_STAGE` lookup and `probabilityForStage(stage)` (prefix match on `Closed - Won` / `Closed -`); add `STATUS_NOTE_OPTIONS` (`Qualified`, `Unqualified`) and `statusOutcomeForStage(stage)`. Keep the patch schema permissive for `status_notes` so legacy text still validates.
- `src/components/opportunity-panel.tsx`: change `status_notes` handling in `FieldEditor` to a select driven by the draft's `is_open` (read-only derived text when closed); in the panel's `set()` handler, when `key === "stage"` also set `probability` from the lookup; render `warningsFor` cross-field messages that aren't tied to a single field as a banner above the field grid.
- `EDITABLE_FIELDS` keeps `status_notes` but its kind becomes a dedicated `status` kind so the grid layout stays as-is.
- No schema change and no backend logic change; existing rows untouched.
