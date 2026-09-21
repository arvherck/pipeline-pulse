# Simplify the opportunity window

## Goal

Turn the Board’s opportunity window into a concise deal brief: the essential information is easy to scan and edit, while Actions, Revenue, and History remain one click away.

## Details view

- Use the selected **Essential summary panel** direction, adapted to the app’s existing light-cyberpunk design rather than copying its colours or typography.
- Simplify the header to the opportunity name, client, reference, and current board lane. Remove technical wording and update metadata from the main visual hierarchy.
- Keep four clear tabs: **Details**, **Actions**, **Revenue**, and **History**, with an action count beside Actions when relevant.
- Show only the requested fields in Details:
  - Name, Client, Stage, Owner, Category
  - Deal value, Probability, calculated Weighted value
  - Expected close date, Contract start, Contract end
  - Calculated Age and Days in stage
  - Comments
- Organise these into three short groups: deal essentials, value and confidence, and timing. Give Comments a quiet full-width area at the end.
- Present Weighted value, Age, and Days in stage as compact read-only summaries rather than disabled-looking form fields.
- Keep inline validation and the existing non-blocking contract-date warning, but remove repetitive helper text and unnecessary labels.
- Keep Save and Discard in a calm sticky footer that appears only in Details and clearly indicates unsaved changes.

## Reduce overload

- Remove Region/Market Unit, Segment, Quality score, Fiscal period, Last stage change, Open/closed, Status notes, and custom fields from this window. Existing stored values remain untouched and continue to work elsewhere.
- Generate the suggested manual reference automatically for a new opportunity instead of making it a prominent form field.
- Move Delete opportunity to a low-emphasis footer action while preserving the current explicit confirmation and cascade behaviour.
- Remove the separate status-note editor from Actions so that tab focuses entirely on follow-up actions.

## Actions, Revenue, and History

- Preserve all current action creation and editing capabilities, but let the simplified tab and header provide context without repeating opportunity information.
- Preserve the monthly revenue planner unchanged in behaviour.
- Restyle History into a light chronological list that is easier to scan while retaining every recorded field change.

## Validation

- Verify the panel with an existing opportunity and with a new opportunity.
- Confirm edits save correctly, calculated values update live, Actions/Revenue/History remain usable, hidden fields are not erased, and the panel remains comfortable at laptop and tablet widths.

## Technical notes

- This is a presentation-only simplification centred on the opportunity panel; no database changes are required.
- Keep the complete draft and save payload internally so fields omitted from this view retain their current values.
- Define a panel-specific ordered field list instead of changing the shared opportunity schema used by imports and server validation.
