import { fiscalMonths, fiscalYearOf, monthKey, monthLabel, monthsBetween } from "./fiscal";
import type { Opportunity, PipelineData, RevenuePlan, Target } from "./pipeline-types";

/** Forecast value of a deal: its value weighted by probability. */
export function forecastValue(row: Opportunity): number {
  if (row.weighted_value != null) return row.weighted_value;
  const value = row.deal_value ?? 0;
  return row.probability == null ? value : (value * row.probability) / 100;
}

/**
 * How a deal's forecast value lands month by month. A hand-entered plan wins;
 * otherwise the value spreads evenly over the contract months, falling back to
 * the close month when contract dates are missing.
 */
export function revenueByMonth(
  row: Opportunity,
  plans: RevenuePlan[],
): Map<string, number> {
  const saved = plans.filter((plan) => plan.opportunity_id === row.id);
  if (saved.length > 0) {
    return new Map(saved.map((plan) => [monthKey(plan.period_month), Number(plan.amount)]));
  }
  return new Map(
    defaultRevenueMonths(row).map((month) => [month, forecastValue(row) / defaultRevenueMonths(row).length]),
  );
}

/** The months a deal is delivered over, with no hand-entered plan applied. */
export function defaultRevenueMonths(row: Opportunity): string[] {
  if (row.contract_start && row.contract_end) {
    return monthsBetween(row.contract_start, row.contract_end);
  }
  const single = row.contract_start ?? row.close_date;
  return single ? [monthKey(single)] : [];
}

/** Even split of the forecast value across the deal's delivery months. */
export function defaultRevenuePlan(row: Opportunity): Array<{ month: string; amount: number }> {
  const months = defaultRevenueMonths(row);
  if (months.length === 0) return [];
  const each = forecastValue(row) / months.length;
  return months.map((month) => ({ month, amount: Math.round(each * 100) / 100 }));
}

export function planTotal(rows: Array<{ amount: number }>): number {
  return rows.reduce((total, row) => total + (Number(row.amount) || 0), 0);
}

export type ForecastPoint = {
  month: string;
  label: string;
  sales: number;
  revenue: number;
};

/**
 * Cumulative sales (counted in the closing month) and revenue (spread over
 * delivery months) across one fiscal year.
 */
export function forecastSeries(
  data: PipelineData,
  fiscalYear: number,
  startMonth: number,
): ForecastPoint[] {
  const months = fiscalMonths(fiscalYear, startMonth);
  const sales = new Map(months.map((month) => [month, 0]));
  const revenue = new Map(months.map((month) => [month, 0]));

  for (const row of data.opportunities) {
    if (row.close_date) {
      const month = monthKey(row.close_date);
      if (sales.has(month)) sales.set(month, (sales.get(month) ?? 0) + forecastValue(row));
    }
    for (const [month, amount] of revenueByMonth(row, data.revenuePlans)) {
      if (revenue.has(month)) revenue.set(month, (revenue.get(month) ?? 0) + amount);
    }
  }

  let salesRunning = 0;
  let revenueRunning = 0;
  return months.map((month) => {
    salesRunning += sales.get(month) ?? 0;
    revenueRunning += revenue.get(month) ?? 0;
    return {
      month,
      label: monthLabel(month),
      sales: Math.round(salesRunning),
      revenue: Math.round(revenueRunning),
    };
  });
}

export function yearlyTarget(
  targets: Target[],
  kind: "sales" | "revenue",
  fiscalYear: number,
): Target | undefined {
  return targets.find((t) => t.kind === kind && t.fiscal_year === fiscalYear);
}

/** Fiscal years worth offering in the picker, based on the data on hand. */
export function fiscalYearChoices(data: PipelineData, startMonth: number): number[] {
  const years = new Set<number>([fiscalYearOf(new Date().toISOString().slice(0, 10), startMonth)]);
  for (const row of data.opportunities) {
    for (const date of [row.close_date, row.contract_start, row.contract_end]) {
      if (date) years.add(fiscalYearOf(date, startMonth));
    }
  }
  for (const target of data.targets) {
    if (target.fiscal_year) years.add(target.fiscal_year);
  }
  return [...years].sort((a, b) => a - b);
}
