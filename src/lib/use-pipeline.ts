import { queryOptions, useQueryClient } from "@tanstack/react-query";

import { getPipeline } from "./pipeline.functions";
import type { Action, Lane, Opportunity, PipelineData } from "./pipeline-types";

export const pipelineQueryOptions = queryOptions({
  queryKey: ["pipeline"],
  queryFn: () => getPipeline(),
});

export function useInvalidatePipeline() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["pipeline"] });
}

/** The workflow lane a deal sits in on the board. */
export function laneOf(data: PipelineData, opportunityId: string): Lane | undefined {
  const laneId = data.statuses.find((s) => s.opportunity_id === opportunityId)?.lane_id;
  if (laneId) {
    const match = data.lanes.find((l) => l.id === laneId);
    if (match) return match;
  }
  return data.lanes.find((l) => l.is_default) ?? data.lanes[0];
}


export function sum(values: Array<number | null>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

export function uniqueValues(rows: Opportunity[], key: keyof Opportunity): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) set.add(value);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/* ---------- Action rollups ---------- */

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isActionOpen(action: Action): boolean {
  return action.status !== "Done" && !action.done;
}

export function isActionOverdue(action: Action, today = todayIso()): boolean {
  return isActionOpen(action) && Boolean(action.due_date) && String(action.due_date) < today;
}

export type ActionRollup = { open: number; overdue: number; nextDue: string | null };

/** Open/overdue counts and the soonest due date, keyed by opportunity id. */
export function actionRollups(data: PipelineData): Map<string, ActionRollup> {
  const today = todayIso();
  const map = new Map<string, ActionRollup>();
  for (const action of data.actions) {
    if (!isActionOpen(action)) continue;
    const current = map.get(action.opportunity_id) ?? { open: 0, overdue: 0, nextDue: null };
    current.open += 1;
    if (isActionOverdue(action, today)) current.overdue += 1;
    if (action.due_date && (!current.nextDue || action.due_date < current.nextDue)) {
      current.nextDue = action.due_date;
    }
    map.set(action.opportunity_id, current);
  }
  return map;
}
