# Import template download + small import UX improvements

## What you'll get

**1. "Download template" on the Import page**

A button next to the drop zone: "Download template (.xlsx)" (plus a small "as .csv" option). Generated in the browser — nothing is uploaded or downloaded from a server.

The template workbook contains:
- **Opportunities sheet** — one column per importable field, using *your current display labels* (e.g. "Market Unit" instead of "Region"), so it matches what you see in the app.
- One **example row** filled in (e.g. MAN-0001 · "Example platform renewal" · a client · stage "Stage 1" · probability 30) showing the expected format: dates as YYYY-MM-DD, numbers without currency symbols.
- A **Guide sheet** — one row per field: its label, what format it expects (text / number / date / yes-no), whether it's required (only ID + Opportunity), and for dropdown fields (Stage, Category, Segment, Market Unit, Status) the **current allowed values** pulled live from your picklists — so the template always reflects the values you configured in Settings.
- Calculated fields (Weighted value, Age, Days in stage, Open, Last stage change) are included but marked "leave blank — calculated automatically" in the guide.

Files filled in from this template map 1:1 in the column-matching step with no manual mapping.

**2. Small UX improvements to the import flow** (same page, no new screens)

- **Smarter auto-matching**: match columns against your custom display labels too (a column literally named "Market Unit" currently wouldn't auto-map because the built-in label says "Region").
- **Mapping summary**: a one-line chip row above the mapping table — "17 of 22 columns mapped · 5 skipped" — so unmapped columns are obvious.
- **Duplicate ID warning**: if the file contains the same ID twice, or IDs that already exist in the pipeline, show a count before importing ("12 rows will update existing opportunities") instead of silently upserting.
- **Post-import report**: the success message lists how many rows were added vs updated, and warns if any rows were dropped for a missing ID (with the count).

## Technical details

- `src/lib/import-template.ts` (new): builds the template workbook with SheetJS (`xlsx`, already used for import/export) — headers from `IMPORT_FIELDS` + `labelFor(fieldLabels)`, allowed values from `data.picklists`, guide rows per field. Triggers a blob download, same pattern as the existing CSV/Excel/JSON exports.
- `src/routes/_authenticated/import.tsx`: add the template button(s) beside the drop zone; extend `autoMap` to also compare against current field labels; compute mapped/skipped counts and duplicate/existing-ID stats from the loaded rows and `data.opportunities`; richer result toast/inline note after import.
- No database or server-function changes; everything is client-side using already-loaded pipeline data.
