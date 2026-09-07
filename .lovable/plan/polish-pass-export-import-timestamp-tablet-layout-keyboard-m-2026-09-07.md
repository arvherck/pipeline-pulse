# Polish pass: export, import timestamp, tablet layout, keyboard moves

Four independent improvements. Each one is small and self-contained.

## 1. Export the table to CSV

A small "Export CSV" button in the table's filter row, next to the row count.

- Exports exactly what is on screen: the same rows after search, category /
  region / segment / lane filters and the "open only" toggle, in the current
  sort order.
- Columns match the visible columns, including the Lane column, and the header
  row uses the custom labels set in Settings.
- Values are written as plain data (full numbers, ISO dates like 2026-09-07)
  so they stay usable in a spreadsheet, not the shortened on-screen display.
- Filename includes the date, e.g. `pipeline-2026-09-07.csv`.
- Runs entirely in the browser; nothing is uploaded.

## 2. "Last imported" timestamp

Every confirmed import records one row (when it ran, how many rows came in).
The most recent one is shown as "Last import: 7 Sep 2026, 14:12 · 320 rows",
with a hover tooltip for the exact time.

Shown in two places:
- Next to the "Import data" link in the top bar (short form: "Imported 2h ago"),
  hidden on narrow widths where the bar is tight.
- At the top of the Import data page, above the drop zone.

Before the first import it reads "No imports yet".

Requires a new small record-keeping list for import runs — the existing tables
cannot answer "when did the last import happen" reliably, because re-importing
updates existing rows rather than creating them.

## 3. Responsive down to tablet width

Target: comfortable from roughly 768px up. No phone layout.

- Top bar: nav links wrap onto a second line instead of overflowing; the
  "last import" note and any long labels shrink or hide first.
- Stats strip and target cards: three across on a laptop, two across on a
  tablet.
- Board: lanes keep their width and scroll sideways (correct for a kanban),
  with the header row and the gear button staying on one line.
- Table: keeps its horizontal scroll; the filter row reflows into two rows so
  no control is clipped. Filters use a two-column grid on narrow widths that
  becomes a single flex row on wider screens.
- Detail panel and Manage lanes panel: full width on tablet, fixed width on
  laptop.
- Settings: the two-column grid becomes one column below laptop width.

## 4. Moving a card between lanes with the keyboard

Both a keyboard drag and a direct move, so it works whichever the user reaches for:

- Cards become focusable and reachable with Tab, with a visible focus ring.
- Space or Enter picks a card up, Left/Right arrows move it between lanes,
  Space drops it, Escape cancels — the standard drag-and-drop keyboard flow.
- Additionally, with a card focused (nothing picked up), Left/Right with the
  Alt key moves it straight to the previous/next lane in one keystroke.
- Enter with no modifier still opens the detail panel, so click behaviour is
  unchanged.
- Each move announces itself for screen readers ("Deal X moved to In progress")
  and shows a brief confirmation, matching how drag-and-drop already behaves.
- A one-line hint above the board explains the keys.
- The detail panel also gets a "Lane" dropdown, so a card can be moved without
  touching the board at all.

## Technical notes

- CSV: new `src/lib/csv.ts` with a quoting-safe serialiser plus a browser
  download helper; `pipeline-table.tsx` passes its already-computed filtered
  and sorted rows plus `TABLE_COLUMNS` and `labelFor`, so export and display
  can never drift apart. Raw-value formatting lives in one `exportCell` helper
  next to the existing `renderCell`.
- Import runs: migration adding `public.import_runs` (id, imported_at,
  row_count, created_at) with grants to `authenticated` / `service_role`, RLS
  enabled and a policy matching the other tables; `importOpportunities`
  inserts one row on success; `getPipeline` returns the latest few and
  `PipelineData` gains `importRuns`.
- Keyboard board: add dnd-kit's `KeyboardSensor` with
  `sortableKeyboardCoordinates`-style lane resolution alongside the existing
  `PointerSensor`; cards get `tabIndex={0}`, `role="button"` and an
  `onKeyDown` handler for the Alt+Arrow shortcut calling the existing
  `setOpportunityLane` server function. Announcements go through dnd-kit's
  `accessibility.announcements` plus an `aria-live` region.
- Responsive: Tailwind breakpoints only (`md:` / `lg:`), grid +
  `minmax(0,1fr)_auto` for header rows, `min-w-0` on text containers and
  `shrink-0` on icons. No new dependencies.
