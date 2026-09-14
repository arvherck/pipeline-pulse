# Sales vs revenue against the yearly target

A new fiscal-year chart on the Dashboard showing two forecast curves — sales and revenue — against two yearly target lines, plus the ability to fine-tune how any deal's revenue is spread across months.

## The chart

- Cumulative forecast across the fiscal year, month by month (Sep through Aug by default).
- Two curves: **Sales** (a deal counts in the month it closes) and **Revenue** (a deal's value spread across the months it is delivered, so a deal can split across two fiscal years).
- Two flat reference lines: the yearly **sales target** and the yearly **revenue target**.
- Both curves are weighted by probability, so they read as a forecast; closed-won deals count fully, closed-lost count zero.
- A fiscal-year selector so past and next year can be viewed.
- Small summary row under the chart: sales so far, revenue so far, each as a percentage of its target and the gap remaining.

## Revenue spread per deal

- Default: the deal value, weighted by probability, spread evenly over the months between contract start and contract end. If those dates are missing, it falls back to the close month.
- In the opportunity detail panel, a new "Revenue plan" section lists the monthly amounts for that deal and lets the user type over any month. Edited months are saved and used instead of the even spread; a "Reset to even spread" button returns to the default.
- The panel shows the total of the plan against the deal value so mismatches are obvious.

## Settings

- **Fiscal year start month** — a dropdown, defaulting to September. Fiscal year labels follow the existing FY convention (Sep 2025–Aug 2026 = FY26).
- **Yearly targets** — targets gain a "yearly" flavour so a sales target and a revenue target can be set per fiscal year; existing targets and their cards keep working unchanged.

## Technical notes

- Migration:
  - `app_settings` (single-row key/value): `fiscal_year_start_month` (int, default 9). GRANTs to `authenticated`/`service_role`, RLS on, authenticated-only policy.
  - `revenue_plan` table: `opportunity_id` (fk, cascade), `period_month` (date, first of month), `amount` numeric, unique on (opportunity_id, period_month), plus GRANTs, RLS and an authenticated policy.
  - `targets` gains `kind text` (`'sales' | 'revenue' | 'legacy'`, default `'legacy'`) and `fiscal_year int` (nullable) so yearly targets can be identified without touching existing rows.
- New `src/lib/fiscal.ts`: fiscal-year boundaries from the start month, month bucket list, FY labelling, and the shared spread helper (even split weighted by probability, overridden per month by `revenue_plan` rows).
- New `src/lib/revenue-forecast.ts`: builds the cumulative sales and revenue series for a fiscal year from opportunities + revenue plans — one helper used by both the chart and the summary row so they cannot drift.
- `getPipeline` in `src/lib/pipeline.functions.ts` returns `appSettings` and `revenuePlans`; new server fns `saveAppSettings`, `saveRevenuePlan`, `resetRevenuePlan`. `PipelineData` and `Target` types extended in `src/lib/pipeline-types.ts`.
- New `src/components/fiscal-forecast-chart.tsx` (recharts `ComposedChart`: two lines + two `ReferenceLine`s) and `src/components/revenue-plan-editor.tsx`, wired into `src/routes/_authenticated/dashboard.tsx` and `src/components/opportunity-panel.tsx`.
- `src/routes/_authenticated/settings.tsx` gains the fiscal-year-start control and the yearly sales/revenue target fields.
- Excel export gains the revenue plan as a third tab so the monthly split leaves the app with the data.
