import { z } from "zod";

import type { Opportunity } from "./pipeline-types";

export type EditableKind =
  | "text"
  | "textarea"
  | "number"
  | "money"
  | "percent"
  | "date"
  | "select"
  | "boolean"
  | "status";

export type EditableField = {
  key: keyof Opportunity & string;
  kind: EditableKind;
  required?: boolean;
};

/** Every opportunity column the detail panel can edit, in display order. */
export const EDITABLE_FIELDS: EditableField[] = [
  { key: "name", kind: "text", required: true },
  { key: "account_name", kind: "text" },
  { key: "stage", kind: "select", required: true },
  { key: "owner", kind: "text" },
  { key: "category", kind: "select" },
  { key: "region", kind: "select" },
  { key: "segment", kind: "select" },
  { key: "deal_value", kind: "money" },
  { key: "weighted_value", kind: "money" },
  { key: "probability", kind: "percent" },
  { key: "quality_score", kind: "percent" },
  { key: "close_date", kind: "date" },
  { key: "fiscal_period", kind: "text" },
  { key: "contract_start", kind: "date" },
  { key: "contract_end", kind: "date" },
  { key: "last_stage_change", kind: "date" },
  { key: "age_days", kind: "number" },
  { key: "stage_duration_days", kind: "number" },
  { key: "is_open", kind: "boolean" },
  { key: "status_notes", kind: "status" },
  { key: "comment", kind: "textarea" },
];

const nullableText = z
  .string()
  .max(2000, "Keep this under 2000 characters")
  .trim()
  .nullable()
  .optional();

const dateString = z
  .string()
  .trim()
  .nullable()
  .optional()
  .refine(
    (v) => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v).getTime())),
    "Use a valid date",
  );

const money = z
  .number({ message: "Enter a number" })
  .min(0, "Cannot be negative")
  .max(1e15, "That number is too large")
  .nullable()
  .optional();

const score = z
  .number({ message: "Enter a number" })
  .min(0, "Must be 0 or more")
  .max(100, "Must be 100 or less")
  .nullable()
  .optional();

const wholeNumber = z
  .number({ message: "Enter a number" })
  .int("Use a whole number")
  .min(0, "Cannot be negative")
  .nullable()
  .optional();

export const customFieldsSchema = z.record(
  z.string().min(1),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

/** Shared client/server rules for an opportunity edit. `id` is never editable. */
export const opportunityPatchSchema = z.object({
  name: z.string().trim().min(1, "Required").max(300, "Keep this under 300 characters"),
  account_name: nullableText,
  stage: z.string().trim().min(1, "Required"),
  owner: nullableText,
  category: nullableText,
  region: nullableText,
  segment: nullableText,
  deal_value: money,
  weighted_value: money,
  probability: score,
  quality_score: score,
  close_date: dateString,
  fiscal_period: nullableText,
  contract_start: dateString,
  contract_end: dateString,
  last_stage_change: dateString,
  age_days: wholeNumber,
  stage_duration_days: wholeNumber,
  is_open: z.boolean(),
  status_notes: nullableText,
  comment: nullableText,
  custom_fields: customFieldsSchema,
});

export type OpportunityPatch = z.infer<typeof opportunityPatchSchema>;

/** Field-keyed error messages, ready to render under each input. */
export function validatePatch(patch: unknown): Record<string, string> {
  const result = opportunityPatchSchema.safeParse(patch);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/** Non-blocking advisories, shown in amber. */
export function warningsFor(patch: {
  contract_start?: string | null | undefined;
  contract_end?: string | null | undefined;
}): Record<string, string> {
  const warnings: Record<string, string> = {};
  const start = patch.contract_start;
  const end = patch.contract_end;
  if (start && end && new Date(end) < new Date(start)) {
    warnings["contract_end"] = "Contract end is before contract start";
  }
  return warnings;
}

export function isPicklistField(key: string): boolean {
  return key === "stage" || key === "segment" || key === "category" || key === "region";
}

/* ---------- Data-quality helpers ---------- */

export const SEGMENT_BANDS = ["<$2m", "$2m-$5m", ">$5m"] as const;

/** The segment a deal value implies; boundary amounts count as the middle band. */
export function segmentForValue(dealValue: number | null | undefined): string | null {
  if (dealValue == null || Number.isNaN(dealValue)) return null;
  if (dealValue < 2_000_000) return "<$2m";
  if (dealValue <= 5_000_000) return "$2m-$5m";
  return ">$5m";
}

/** Non-blocking mismatch between the chosen segment and the deal value. */
export function segmentMismatch(patch: {
  segment?: string | null | undefined;
  deal_value?: number | null | undefined;
}): string | null {
  const segment = patch.segment?.trim();
  if (!segment) return null;
  if (!(SEGMENT_BANDS as readonly string[]).includes(segment)) return null;
  const implied = segmentForValue(patch.deal_value);
  if (!implied || implied === segment) return null;
  return `Segment says ${segment} but the deal value suggests ${implied}.`;
}

export const PROBABILITY_BY_STAGE: Record<string, number> = {
  Lead: 10,
  Qualify: 30,
  Propose: 50,
  Negotiate: 70,
  "Stage 0A": 10,
  "Stage 1": 30,
  "Stage 2A": 50,
  "Stage 2B": 70,
  "Stage 3A": 90,
  "Stage 3B": 90,
};

/** Default probability implied by a stage, or null when the stage is unknown. */
export function probabilityForStage(stage: string | null | undefined): number | null {
  const value = stage?.trim();
  if (!value) return null;
  if (value === "Closed - Won") return 100;
  if (value.startsWith("Closed -")) return 0;
  return PROBABILITY_BY_STAGE[value] ?? null;
}

/* ---------- Calculated fields ---------- */

/** Fields the app works out; they are shown read-only. */
export const COMPUTED_FIELDS = new Set<string>([
  "weighted_value",
  "is_open",
  "age_days",
  "stage_duration_days",
]);

export function computeWeightedValue(
  dealValue: number | null | undefined,
  probability: number | null | undefined,
): number | null {
  if (dealValue == null || probability == null) return null;
  if (Number.isNaN(dealValue) || Number.isNaN(probability)) return null;
  return Math.round(dealValue * probability) / 100;
}

/** A deal is closed as soon as its stage says so. */
export function isOpenForStage(stage: string | null | undefined): boolean {
  return !(stage ?? "").trim().startsWith("Closed -");
}

/** Whole days between a date and today, never negative. */
export function daysSince(value: string | null | undefined): number | null {
  if (!value) return null;
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return null;
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  return days < 0 ? 0 : days;
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

type DerivableFields = {
  deal_value?: number | null | undefined;
  probability?: number | null | undefined;
  stage?: string | null | undefined;
  last_stage_change?: string | null | undefined;
  weighted_value?: number | null | undefined;
  is_open?: boolean | undefined;
  age_days?: number | null | undefined;
  stage_duration_days?: number | null | undefined;
};

/** Overwrite the calculated fields on a patch or an imported row. */
export function withCalculatedFields<T extends DerivableFields>(
  values: T,
  context: { createdAt?: string | null } = {},
): T & {
  weighted_value: number | null;
  is_open: boolean;
  age_days: number | null;
  stage_duration_days: number | null;
} {
  const created = context.createdAt ?? null;
  return {
    ...values,
    weighted_value: computeWeightedValue(values.deal_value ?? null, values.probability ?? null),
    is_open: isOpenForStage(values.stage ?? null),
    age_days: daysSince(created),
    stage_duration_days: daysSince(values.last_stage_change ?? created),
  };
}


export const STATUS_NOTE_OPTIONS = ["Qualified", "Unqualified"] as const;

/** For a closed deal, the outcome the stage already states. */
export function statusOutcomeForStage(stage: string | null | undefined): string | null {
  const value = stage?.trim();
  if (!value || !value.startsWith("Closed -")) return null;
  return value.replace(/^Closed\s*-\s*/, "").trim() || null;
}
