import type { Opportunity, PipelineData, Snapshot, Target } from "./pipeline-types";

export const SCOPE_FIELDS = ["category", "region", "segment"] as const;
export type ScopeField = (typeof SCOPE_FIELDS)[number];

/** Does this opportunity fall inside the target's optional slice? */
export function scopeMatches(row: Opportunity, scopeField: string, scopeValue: string): boolean {
  if (!scopeField || !scopeValue) return true;
  const value = (row as unknown as Record<string, unknown>)[scopeField];
  return typeof value === "string" && value === scopeValue;
}

export function metricValue(row: Opportunity, metric: string): number {
  const value = metric === "weighted_value" ? row.weighted_value : row.deal_value;
  return value ?? 0;
}

/** Live total of open opportunities for a metric + slice. */
export function totalFor(
  opportunities: Opportunity[],
  metric: string,
  scopeField: string,
  scopeValue: string,
): number {
  return opportunities
    .filter((row) => row.is_open && scopeMatches(row, scopeField, scopeValue))
    .reduce((total, row) => total + metricValue(row, metric), 0);
}

export type TargetProgress = {
  target: Target;
  total: number;
  percent: number;
  remaining: number;
  scopeField: string;
  scopeValue: string;
};

export function progressFor(data: PipelineData, target: Target): TargetProgress {
  const scopeField = target.scope_field ?? "";
  const scopeValue = target.scope_value ?? "";
  const total = totalFor(data.opportunities, target.metric, scopeField, scopeValue);
  const percent =
    target.target_amount > 0 ? Math.round((total / target.target_amount) * 100) : 0;
  return {
    target,
    total,
    percent,
    remaining: target.target_amount - total,
    scopeField,
    scopeValue,
  };
}

/** Recorded totals for this target's metric + slice, inside its period when set. */
export function seriesFor(data: PipelineData, target: Target): Snapshot[] {
  const scopeField = target.scope_field ?? "";
  const scopeValue = target.scope_value ?? "";
  return data.snapshots
    .filter((snapshot) => {
      if (snapshot.metric !== target.metric) return false;
      if (snapshot.scope_field !== scopeField) return false;
      if (snapshot.scope_value !== scopeValue) return false;
      if (target.period_start && snapshot.taken_on < target.period_start) return false;
      if (target.period_end && snapshot.taken_on > target.period_end) return false;
      return true;
    })
    .sort((a, b) => a.taken_on.localeCompare(b.taken_on));
}

export function targetTitle(target: Target): string {
  return target.label?.trim() || target.period || "Target";
}

export function periodText(target: Target): string {
  if (target.period_start && target.period_end) {
    return `${target.period_start} → ${target.period_end}`;
  }
  if (target.period_start) return `from ${target.period_start}`;
  if (target.period_end) return `until ${target.period_end}`;
  return target.period || "No period set";
}
