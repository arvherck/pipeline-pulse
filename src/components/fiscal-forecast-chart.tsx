import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  DEFAULT_FISCAL_START_MONTH,
  fiscalRangeText,
  fiscalYearLabel,
  fiscalYearOf,
} from "@/lib/fiscal";
import { formatMoney, type PipelineData } from "@/lib/pipeline-types";
import { fiscalYearChoices, forecastSeries, yearlyTarget } from "@/lib/revenue-forecast";

/** Cumulative sales and revenue across a fiscal year, against yearly targets. */
export function FiscalForecastChart({ data }: { data: PipelineData }) {
  const startMonth = data.appSettings.fiscal_year_start_month || DEFAULT_FISCAL_START_MONTH;
  const today = new Date().toISOString().slice(0, 10);
  const [fiscalYear, setFiscalYear] = useState(() => fiscalYearOf(today, startMonth));

  const years = fiscalYearChoices(data, startMonth);
  const points = forecastSeries(data, fiscalYear, startMonth);
  const salesTarget = yearlyTarget(data.targets, "sales", fiscalYear);
  const revenueTarget = yearlyTarget(data.targets, "revenue", fiscalYear);
  const last = points[points.length - 1];

  const summary = [
    { label: "Sales forecast", value: last?.sales ?? 0, target: salesTarget?.target_amount ?? null },
    {
      label: "Revenue forecast",
      value: last?.revenue ?? 0,
      target: revenueTarget?.target_amount ?? null,
    },
  ];

  return (
    <section className="tech-panel p-4">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-3">
        <div>
          <div className="tech-label text-primary">Fiscal forecast // cumulative</div>
          <h2 className="font-display text-sm font-bold uppercase">
            Sales &amp; revenue vs yearly target
          </h2>
          <p className="text-xs text-muted-foreground">{fiscalRangeText(fiscalYear, startMonth)}</p>
        </div>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-[13px]"
          value={fiscalYear}
          onChange={(e) => setFiscalYear(Number(e.target.value))}
          aria-label="Fiscal year"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {fiscalYearLabel(year)}
            </option>
          ))}
        </select>
      </header>

      <div className="mt-3 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              stroke="var(--border)"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              stroke="var(--border)"
              width={70}
              tickFormatter={(value: number) => formatMoney(value)}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 2,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [formatMoney(value), name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {salesTarget ? (
              <ReferenceLine
                y={Number(salesTarget.target_amount)}
                stroke="var(--signal)"
                strokeDasharray="4 4"
                label={{ value: "Sales target", position: "insideTopRight", fontSize: 11 }}
              />
            ) : null}
            {revenueTarget ? (
              <ReferenceLine
                y={Number(revenueTarget.target_amount)}
                stroke="var(--primary)"
                strokeDasharray="6 3"
                label={{ value: "Revenue target", position: "insideBottomRight", fontSize: 11 }}
              />
            ) : null}
            <Line
              type="monotone"
              name="Sales"
              dataKey="sales"
              stroke="var(--signal)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              name="Revenue"
              dataKey="revenue"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <dl className="mt-3 grid gap-px bg-border text-xs sm:grid-cols-2">
        {summary.map((item) => (
          <div key={item.label} className="bg-card p-2">
            <dt className="tech-label">{item.label}</dt>
            <dd className="data-value font-semibold">
              {formatMoney(item.value)}
              {item.target ? (
                <span className="ml-2 font-normal text-muted-foreground">
                  {Math.round((item.value / item.target) * 100)}% of {formatMoney(item.target)} ·{" "}
                  {formatMoney(Math.abs(item.target - item.value))}{" "}
                  {item.target - item.value >= 0 ? "to go" : "over"}
                </span>
              ) : (
                <span className="ml-2 font-normal text-muted-foreground">no yearly target set</span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {!salesTarget && !revenueTarget ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Set yearly sales and revenue targets in Settings to see the target lines.
        </p>
      ) : null}
    </section>
  );
}
