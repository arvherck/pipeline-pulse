# Pipeline Pulse

Build a sales pipeline tracker web app called "Pipeline Tracker" for a single internal user — email/password login, no public signup, no multi-tenant setup.

Data model (Supabase), kept generic so it fits any organization's pipeline, not tied to one company's field names:

- `opportunities`:

  - id (text, from import — the source-system key)

  - name (text)

  - account_name (text) — the client/customer the deal is with

  - category (text) — a user-defined grouping (could be a business line, product area, department — whatever the org calls it)

  - region (text)

  - owner (text) — the person running the deal

  - deal_value (numeric) — the headline deal size

  - weighted_value (numeric) — deal_value adjusted by probability

  - probability (numeric, 0–100, nullable)

  - quality_score (numeric, 0–100, nullable) — an optional secondary health/quality metric, label configurable, not every org will use this

  - close_date (date)

  - stage (text) — the org's own CRM/pipeline stage label, free but ideally picked from `picklists`

  - fiscal_period (text) — e.g. "Q3 FY25", kept as a flexible string rather than separate quarter/year columns so it fits different fiscal calendars

  - segment (text) — a deal-size or tier bucket, user-defined

  - contract_start (date), contract_end (date)

  - last_stage_change (date), age_days (integer), stage_duration_days (integer)

  - status_notes (text) — free-text reporting status

  - comment (text)

  - is_open (boolean)

  - custom_fields (jsonb) — a flexible bucket for any organization-specific column that doesn't map to the fields above

  - created_at, updated_at

- `picklists`: field_name (text, e.g. "stage", "segment", "category", "region"), value (text), label (text), position (integer) — lets the user manage the controlled vocabulary for any of these fields from settings, instead of it being hardcoded to one taxonomy.

- `field_labels`: field_name (text), display_label (text) — lets the user rename what a field is called on screen (e.g. "deal_value" could display as "Deal Value", "TCR", "Contract Value", whatever the org's own term is) without touching the schema.

- `lanes`: id, label, position (integer), color, is_default (boolean) — a separate custom kanban workflow the user defines themselves, distinct from the `stage` field above (which reflects the source CRM/pipeline system).

- `opportunity_status`: opportunity_id (fk), lane_id (fk), notes (text), updated_at.

- `actions`: id, opportunity_id (fk), text, owner, due_date, done (boolean), created_at.

- `targets`: period (text, e.g. a fiscal year or quarter), target_amount (numeric), metric ('deal_value' or 'weighted_value'), label.

Import flow:

- An "Import data" screen with drag-and-drop upload for .xlsx and .csv, parsed entirely in the browser using the `xlsx` (SheetJS) library — the raw file should never be sent anywhere; only the parsed rows the user confirms get written to Supabase.

- A column-mapping step: match each spreadsheet column either to one of the named `opportunities` fields above, OR to a custom field (user types the key name and it's stored in `custom_fields`) — this is what makes the import flexible across different organizations' exports. Show a live preview of the first 5 parsed rows before confirming.

- On confirm, upsert into `opportunities` keyed by `id`, so re-importing a refreshed export updates existing records instead of duplicating them.

- Seed `lanes` with 5 defaults: To do, In progress, Waiting, Blocked, Done. Any newly-imported opportunity with no existing status goes into the first lane.

- Seed `field_labels` with sensible defaults (e.g. deal_value → "Deal Value") that the user can rename later.

Views:

- Kanban board grouped by lane, drag-and-drop cards between lanes.

- Sortable, filterable table view — search box, filters for category / region / segment / lane, an "open only" toggle using `is_open`. Column headers should pull from `field_labels` rather than being hardcoded.

- A stats strip at the top: open opportunity count, sum of deal_value, sum of weighted_value, count per lane.

Visual style: clean, dense, working-tool feel for live client calls — not a marketing page. Muted neutral background, one accent color, no gradients or heavy card shadows.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c2d654aa-34e7-4c29-858b-39fb0773d813).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
