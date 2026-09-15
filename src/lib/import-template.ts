import { utils, writeFile } from "xlsx";

import { IMPORT_FIELDS, labelFor, type PipelineData } from "./pipeline-types";

/** Fields the app recalculates — imported values are overwritten. */
const CALCULATED = new Set(["weighted_value", "age_days", "stage_duration_days", "is_open", "last_stage_change"]);
const REQUIRED = new Set(["id", "name"]);

function kindHint(kind: string): string {
  switch (kind) {
    case "number": return "Number, no currency symbols (e.g. 250000)";
    case "date": return "Date as YYYY-MM-DD";
    case "boolean": return "Yes or No";
    default: return "Text";
  }
}

function picklistValues(data: PipelineData, field: string): string[] {
  return data.picklists
    .filter((p) => p.field_name === field)
    .sort((a, b) => a.position - b.position)
    .map((p) => p.label || p.value);
}

/** Column headers for the template = current display labels. */
export function templateHeaders(data: PipelineData): string[] {
  return IMPORT_FIELDS.map((f) => labelFor(data.fieldLabels, f.key));
}

const EXAMPLE: Record<string, unknown> = {
  id: "MAN-0001",
  name: "Example platform renewal",
  account_name: "Example client AB",
  category: "Tech",
  region: "",
  owner: "Jane Doe",
  deal_value: 250000,
  probability: 30,
  close_date: "2026-11-30",
  stage: "Stage 1",
  segment: "$2m-$5m",
  contract_start: "2027-01-01",
  contract_end: "2027-12-31",
  status_notes: "Qualified",
  comment: "Replace this example row with your data",
};

function exampleRow(data: PipelineData): unknown[] {
  const firstOf = (field: string) => picklistValues(data, field)[0] ?? "";
  return IMPORT_FIELDS.map((f) => {
    if (CALCULATED.has(f.key)) return "";
    const v = EXAMPLE[f.key];
    if (f.key === "stage" || f.key === "category" || f.key === "segment" || f.key === "region") {
      return firstOf(f.key) || (v ?? "");
    }
    return v ?? "";
  });
}

function guideRows(data: PipelineData): unknown[][] {
  const rows: unknown[][] = [["Column", "Format", "Required", "Allowed values / notes"]];
  for (const f of IMPORT_FIELDS) {
    const label = labelFor(data.fieldLabels, f.key);
    if (CALCULATED.has(f.key)) {
      rows.push([label, "—", "No", "Leave blank — calculated automatically"]);
      continue;
    }
    const values = picklistValues(data, f.key);
    rows.push([
      label,
      kindHint(f.kind),
      REQUIRED.has(f.key) ? "Yes" : "No",
      values.length > 0 ? `One of: ${values.join(" | ")}` : "",
    ]);
  }
  return rows;
}

/** Build and download the import template workbook. */
export function downloadImportTemplate(data: PipelineData) {
  const book = utils.book_new();

  const sheet = utils.aoa_to_sheet([templateHeaders(data), exampleRow(data)]);
  sheet["!cols"] = templateHeaders(data).map((h) => ({ wch: Math.max(14, h.length + 2) }));
  utils.book_append_sheet(book, sheet, "Opportunities");

  const guide = utils.aoa_to_sheet(guideRows(data));
  guide["!cols"] = [{ wch: 24 }, { wch: 34 }, { wch: 10 }, { wch: 80 }];
  utils.book_append_sheet(book, guide, "Guide");

  writeFile(book, "pipeline-import-template.xlsx");
}

/** CSV variant: headers + example row only. */
export function downloadImportTemplateCsv(data: PipelineData) {
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [templateHeaders(data), exampleRow(data)].map((row) => row.map(escape).join(","));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pipeline-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}
