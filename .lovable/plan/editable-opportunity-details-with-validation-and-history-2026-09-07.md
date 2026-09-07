# Editable opportunity details, with validation and history

Turn the deal detail panel into a proper editing form, add a change history, and finish off the settings screen so the same app can be pointed at a different pipeline without a rebuild.

## Edit the deal

- The detail panel gets three tabs: Details, Actions (the existing note + checklist), History.
- Details shows every field as an editable control, labelled with the names set in settings:
  - Text fields (name, client, owner, fiscal period, status notes, comment) — plain boxes.
  - Stage, segment, category, region — dropdowns limited to the allowed values from settings, so no more typos or near-duplicate values. If a deal came in from the import with a value that isn't in the list, it is shown as a marked "not in list" option so nothing is silently rewritten.
  - Deal value and weighted value — money boxes, must be a number and not negative, displayed as currency when not being edited.
  - Probability and quality score — numbers between 0 and 100.
  - Close date, contract start, contract end, last stage change — date pickers. If contract end is before contract start you get an amber warning, but you can still save.
  - Age (days), days in stage — numbers.
  - Open/closed — a toggle.
  - Anything in the deal's extra fields (from custom columns at import) is editable too, and you can add a new extra field or remove one.
- The source ID is shown but not editable — it's the key used to match rows on re-import.
- Name and stage are required; you can't save them empty.
- Errors appear in red right under the offending field, and Save stays disabled until they're cleared. A "Discard" button resets to the saved values, and there's an unsaved-changes indicator.

## History

- Every change records the field, the old value, the new value and the timestamp.
- The History tab lists them newest first, showing the field's display label and "was X → now Y".
- The deal's last-updated time is shown at the top of the panel.

## Settings

- Picklist values: rename a value's display label inline, reorder with up/down arrows, add and remove — per field (stage, segment, category, region).
- Field labels: rename any field's on-screen label (already present, kept as is), with the extra-field keys included so those can be labelled too.

## Technical notes

- Migration adds `public.opportunity_field_changes` (`id`, `opportunity_id` fk to opportunities on delete cascade, `field_name`, `old_value` text, `new_value` text, `changed_at`), grants to `authenticated`/`service_role`, RLS enabled with an authenticated-only policy, and an index on `(opportunity_id, changed_at desc)`.
- `getPipeline` gains a `changes` array (most recent 500) so the History tab reads from the existing `["pipeline"]` query; `PipelineData` and types updated.
- New `updateOpportunity` server fn in `src/lib/pipeline.functions.ts`: zod-validated patch (numeric ranges, date parsing, required name/stage, `id` rejected), reads the current row, writes only changed columns plus `custom_fields`, then inserts one change-log row per changed field. `updated_at` continues to come from the existing trigger.
- Validation rules live in one shared module (`src/lib/opportunity-schema.ts`) used by both the client form and the server fn, so client and server agree.
- Panel refactor: `src/components/opportunity-panel.tsx` uses the existing Tabs component, local draft state seeded from the selected opportunity, per-field error map, and `useInvalidatePipeline` after save. A small `FieldRow` renderer covers text/number/money/date/select/boolean.
- Settings picklist panel gains inline label editing and up/down reordering through the existing `savePicklistValue` (position swap, same pattern as lanes).
