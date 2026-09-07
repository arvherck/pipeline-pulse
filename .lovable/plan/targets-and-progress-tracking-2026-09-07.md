# Targets and progress tracking

Add goal tracking: define targets in Settings, watch progress on a new Dashboard page, and see how the tracked total has moved over time.

## New Dashboard page

A "Dashboard" entry in the top nav, becoming the landing page after sign-in (Board stays one click away).

- Small-multiples grid of target cards, one per target: label, period, progress bar, percentage attained, current total, amount remaining (or amount over).
- Clicking a card selects it and expands a trend chart underneath: the recorded totals over time for that target's metric and scope, with the target amount drawn as a flat reference line and the period's date range as the x-axis.
- Empty state when no targets exist, linking to Settings.

## Targets in Settings

The existing Targets panel is expanded so each target has:

- Label (free text, e.g. "Q4 Enterprise").
- Amount.
- Metric: deal value or weighted value of open deals.
- Period: a start and end date (replaces today's free-text period, which is kept as the display label).
- Optional scope: limit the target to one value of category, region or segment (choices come from the picklists). No scope means the whole pipeline.
- Edit in place and delete, same feel as the picklist rows.

## Recording totals over time

A new `snapshots` table stores one row per day per metric per scope: date, metric, scope field, scope value, total, open deal count. Totals are recomputed and written on the server after every import and after every opportunity edit, so the chart fills in as the pipeline is worked. Same-day re-saves update that day's row rather than adding another, keeping one point per day.

Snapshots cover the whole pipeline plus every scope combination currently used by a target, so adding a target starts collecting its series from that point onward; the card's current figure is always computed live from the opportunities, never from snapshots.

## Technical notes

- Migration: `snapshots` table (unique on date + metric + scope_field + scope_value) with GRANTs to `authenticated`/`service_role`, RLS on, authenticated-only policy; `targets` gains `period_start`, `period_end`, `scope_field`, `scope_value` (all nullable, existing rows unaffected).
- New server helper in `pipeline.functions.ts` that recomputes and upserts snapshots; called at the end of `importOpportunities` and `updateOpportunity`. `saveTarget` validator extended for the new fields.
- `getPipeline` returns `snapshots`; `PipelineData`/`Target` types and `use-pipeline` helpers updated.
- New `src/routes/_authenticated/dashboard.tsx` with its own head metadata, `src/components/target-cards.tsx`, `src/components/target-trend-chart.tsx` using the already-installed recharts. `/` redirect and `app-shell` nav updated.
- Progress and scope filtering share one helper so the card total and the chart series cannot drift apart.
