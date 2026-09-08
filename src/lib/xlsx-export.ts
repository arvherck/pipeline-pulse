import { utils, writeFile } from "xlsx";

import { labelFor, type PipelineData } from "./pipeline-types";
import { actionRollups, laneOf } from "./use-pipeline";

const OPPORTUNITY_COLUMNS = [
  "id",
  "name",
  "account_name",
  "stage",
  "category",
  "region",
  "segment",
  "owner",
  "deal_value",
  "weighted_value",
  "probability",
  "quality_score",
  "close_date",
  "fiscal_period",
  "contract_start",
  "contract_end",
  "last_stage_change",
  "age_days",
  "stage_duration_days",
  "is_open",
  "status_notes",
  "comment",
] as const;

function cell(value: unknown): string | number | boolean | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Build and download one workbook with an Opportunities tab and an Actions tab.
 * Everything happens in the browser — no upload.
 */
export function exportWorkbook(
  data: PipelineData,
  opportunities = data.opportunities,
  filename = `pipeline-${todayStamp()}.xlsx`,
): void {
  const rollups = actionRollups(data);
  const label = (field: string) => labelFor(data.fieldLabels, field);

  const dealRows = opportunities.map((row) => {
    const record: Record<string, string | number | boolean | null> = {};
    for (const key of OPPORTUNITY_COLUMNS) {
      if (key === "is_open") {
        record[label(key)] = row.is_open ? "Open" : "Closed";
        continue;
      }
      record[label(key)] = cell(row[key]);
    }
    record["Board column"] = laneOf(data, row.id)?.label ?? null;
    record["Open actions"] = rollups.get(row.id)?.open ?? 0;
    record["Overdue actions"] = rollups.get(row.id)?.overdue ?? 0;
    for (const [key, value] of Object.entries(row.custom_fields ?? {})) {
      record[label(key)] = cell(value);
    }
    return record;
  });

  const included = new Set(opportunities.map((row) => row.id));
  const nameById = new Map(data.opportunities.map((row) => [row.id, row.name]));
  const actionRows = data.actions
    .filter((action) => included.has(action.opportunity_id))
    .map((action) => ({
      Reference: action.opportunity_id,
      Opportunity: nameById.get(action.opportunity_id) ?? "",
      Action: action.text,
      Owner: cell(action.owner),
      "Due date": cell(action.due_date),
      Priority: action.priority,
      Status: action.status,
      Notes: cell(action.notes),
      Created: action.created_at.slice(0, 10),
    }));

  const book = utils.book_new();
  utils.book_append_sheet(
    book,
    utils.json_to_sheet(dealRows.length > 0 ? dealRows : [{ Note: "No opportunities" }]),
    "Opportunities",
  );
  utils.book_append_sheet(
    book,
    utils.json_to_sheet(actionRows.length > 0 ? actionRows : [{ Note: "No actions" }]),
    "Actions",
  );
  writeFile(book, filename);
}
