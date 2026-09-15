import { z } from "zod";

import type { PipelineData } from "./pipeline-types";

export const BUNDLE_VERSION = 1;

const row = z.record(z.string(), z.unknown());

export const bundleSchema = z.object({
  version: z.number().int(),
  exported_at: z.string(),
  opportunities: z.array(row).default([]),
  lanes: z.array(row).default([]),
  opportunity_status: z.array(row).default([]),
  actions: z.array(row).default([]),
  field_labels: z.array(row).default([]),
  picklists: z.array(row).default([]),
  targets: z.array(row).default([]),
  revenue_plan: z.array(row).default([]),
  snapshots: z.array(row).default([]),
  import_runs: z.array(row).default([]),
  opportunity_field_changes: z.array(row).default([]),
  app_settings: z.object({ fiscal_year_start_month: z.number().int().min(1).max(12) }),
});

export type StateBundle = z.infer<typeof bundleSchema>;

/** Build the full-state file from the data already loaded in the browser. */
export function buildBundle(data: PipelineData): StateBundle {
  return {
    version: BUNDLE_VERSION,
    exported_at: new Date().toISOString(),
    opportunities: data.opportunities as unknown as StateBundle["opportunities"],
    lanes: data.lanes as unknown as StateBundle["lanes"],
    opportunity_status: data.statuses as unknown as StateBundle["opportunity_status"],
    actions: data.actions as unknown as StateBundle["actions"],
    field_labels: data.fieldLabels as unknown as StateBundle["field_labels"],
    picklists: data.picklists as unknown as StateBundle["picklists"],
    targets: data.targets as unknown as StateBundle["targets"],
    revenue_plan: data.revenuePlans as unknown as StateBundle["revenue_plan"],
    snapshots: data.snapshots as unknown as StateBundle["snapshots"],
    import_runs: data.importRuns as unknown as StateBundle["import_runs"],
    opportunity_field_changes: data.changes as unknown as StateBundle["opportunity_field_changes"],
    app_settings: { fiscal_year_start_month: data.appSettings.fiscal_year_start_month },
  };
}

export function parseBundle(text: string): StateBundle {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  const parsed = bundleSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("That file is not a Pipeline Tracker backup.");
  }
  if (parsed.data.version > BUNDLE_VERSION) {
    throw new Error("That backup was made by a newer version of the app.");
  }
  return parsed.data;
}

export function summarize(bundle: StateBundle): string[] {
  const parts: Array<[number, string, string]> = [
    [bundle.opportunities.length, "opportunity", "opportunities"],
    [bundle.actions.length, "action", "actions"],
    [bundle.lanes.length, "board lane", "board lanes"],
    [bundle.picklists.length, "picklist value", "picklist values"],
    [bundle.targets.length, "target", "targets"],
    [bundle.revenue_plan.length, "revenue plan row", "revenue plan rows"],
    [bundle.snapshots.length, "saved snapshot", "saved snapshots"],
    [bundle.opportunity_field_changes.length, "history entry", "history entries"],
  ];
  return parts.map(([count, one, many]) => `${count} ${count === 1 ? one : many}`);
}

export function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function bundleFilename(): string {
  return `pipeline-state-${new Date().toISOString().slice(0, 10)}.json`;
}
