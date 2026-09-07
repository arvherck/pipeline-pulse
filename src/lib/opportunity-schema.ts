import { z } from "zod";

import type { Opportunity } from "./pipeline-types";

export type EditableKind = "text" | "textarea" | "number" | "money" | "percent" | "date" | "select" | "boolean";

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
  { key: "status_notes", kind: "textarea" },
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
