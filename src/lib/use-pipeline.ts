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

export function laneOf(data: PipelineData, opportunityId: string): Lane | undefined {
  const status = data.statuses.find((s) => s.opportunity_id === opportunityId);
  const laneId = status?.lane_id;
  if (laneId) return data.lanes.find((l) => l.id === laneId);
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
