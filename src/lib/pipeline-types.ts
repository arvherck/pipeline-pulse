export type Opportunity = {
  id: string;
  name: string;
  account_name: string | null;
  category: string | null;
  region: string | null;
  owner: string | null;
  deal_value: number | null;
  weighted_value: number | null;
  probability: number | null;
  quality_score: number | null;
  close_date: string | null;
  stage: string | null;
  fiscal_period: string | null;
  segment: string | null;
  contract_start: string | null;
  contract_end: string | null;
  last_stage_change: string | null;
  age_days: number | null;
  stage_duration_days: number | null;
  status_notes: string | null;
  comment: string | null;
  is_open: boolean;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Lane = {
  id: string;
  label: string;
  position: number;
  color: string;
  is_default: boolean;
};

export type OpportunityStatus = {
  opportunity_id: string;
  lane_id: string | null;
  notes: string | null;
  updated_at: string;
};

export type Action = {
  id: string;
  opportunity_id: string;
  text: string;
  owner: string | null;
  due_date: string | null;
  done: boolean;
  created_at: string;
};

export type FieldLabel = { field_name: string; display_label: string };

export type Picklist = {
  id: string;
  field_name: string;
  value: string;
  label: string;
  position: number;
};

export type Target = {
  id: string;
  period: string;
  target_amount: number;
  metric: string;
  label: string | null;
};

export type PipelineData = {
  opportunities: Opportunity[];
  lanes: Lane[];
  statuses: OpportunityStatus[];
  actions: Action[];
  fieldLabels: FieldLabel[];
  picklists: Picklist[];
  targets: Target[];
};

export type FieldKind = "text" | "number" | "date" | "boolean";

export type ImportField = {
  key: keyof Opportunity & string;
  kind: FieldKind;
  fallbackLabel: string;
};

/** Named columns an imported spreadsheet column can be mapped to. */
export const IMPORT_FIELDS: ImportField[] = [
  { key: "id", kind: "text", fallbackLabel: "Source ID" },
  { key: "name", kind: "text", fallbackLabel: "Opportunity" },
  { key: "account_name", kind: "text", fallbackLabel: "Client" },
  { key: "category", kind: "text", fallbackLabel: "Category" },
  { key: "region", kind: "text", fallbackLabel: "Region" },
  { key: "owner", kind: "text", fallbackLabel: "Owner" },
  { key: "deal_value", kind: "number", fallbackLabel: "Deal Value" },
  { key: "weighted_value", kind: "number", fallbackLabel: "Weighted Value" },
  { key: "probability", kind: "number", fallbackLabel: "Probability %" },
  { key: "quality_score", kind: "number", fallbackLabel: "Quality Score" },
  { key: "close_date", kind: "date", fallbackLabel: "Close Date" },
  { key: "stage", kind: "text", fallbackLabel: "Stage" },
  { key: "fiscal_period", kind: "text", fallbackLabel: "Fiscal Period" },
  { key: "segment", kind: "text", fallbackLabel: "Segment" },
  { key: "contract_start", kind: "date", fallbackLabel: "Contract Start" },
  { key: "contract_end", kind: "date", fallbackLabel: "Contract End" },
  { key: "last_stage_change", kind: "date", fallbackLabel: "Last Stage Change" },
  { key: "age_days", kind: "number", fallbackLabel: "Age (days)" },
  { key: "stage_duration_days", kind: "number", fallbackLabel: "Days in Stage" },
  { key: "status_notes", kind: "text", fallbackLabel: "Status Notes" },
  { key: "comment", kind: "text", fallbackLabel: "Comment" },
  { key: "is_open", kind: "boolean", fallbackLabel: "Open" },
];

export const TABLE_COLUMNS: Array<keyof Opportunity & string> = [
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
  "close_date",
  "fiscal_period",
  "is_open",
];

export const PICKLIST_FIELDS = ["stage", "segment", "category", "region"] as const;

export function labelFor(labels: FieldLabel[], field: string): string {
  const found = labels.find((l) => l.field_name === field);
  if (found) return found.display_label;
  const known = IMPORT_FIELDS.find((f) => f.key === field);
  return known?.fallbackLabel ?? field;
}

export function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: Math.abs(value) >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 1_000_000 ? 1 : 0,
  }).format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}
