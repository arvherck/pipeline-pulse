import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { opportunityPatchSchema } from "./opportunity-schema";
import type { PipelineData } from "./pipeline-types";

/**
 * Recompute today's open-pipeline totals and store one row per metric per
 * slice, so the trend chart has a point per day. Re-running the same day
 * overwrites that day's row instead of adding another.
 */
async function recordSnapshots(supabase: {
  from: (table: string) => any;
}): Promise<void> {
  const [rows, targets] = await Promise.all([
    supabase
      .from("opportunities")
      .select("is_open, deal_value, weighted_value, category, region, segment"),
    supabase.from("targets").select("scope_field, scope_value"),
  ]);
  if (rows.error) throw new Error(rows.error.message);
  if (targets.error) throw new Error(targets.error.message);

  const open = (rows.data ?? []).filter((row: { is_open: boolean }) => row.is_open);

  const scopes = new Map<string, { field: string; value: string }>();
  scopes.set("|", { field: "", value: "" });
  for (const target of targets.data ?? []) {
    const field = target.scope_field ?? "";
    const value = target.scope_value ?? "";
    if (!field || !value) continue;
    scopes.set(`${field}|${value}`, { field, value });
  }

  const takenOn = new Date().toISOString().slice(0, 10);
  const payload: Array<Record<string, unknown>> = [];
  for (const { field, value } of scopes.values()) {
    const scoped = field
      ? open.filter((row: Record<string, unknown>) => row[field] === value)
      : open;
    for (const metric of ["deal_value", "weighted_value"] as const) {
      const total = scoped.reduce(
        (sum: number, row: Record<string, number | null>) => sum + (row[metric] ?? 0),
        0,
      );
      payload.push({
        taken_on: takenOn,
        metric,
        scope_field: field,
        scope_value: value,
        total,
        open_count: scoped.length,
      });
    }
  }

  const { error } = await supabase
    .from("snapshots")
    .upsert(payload, { onConflict: "taken_on,metric,scope_field,scope_value" });
  if (error) throw new Error(error.message);
}

export const getPipeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PipelineData> => {
    const { supabase } = context;
    const [
      opportunities,
      lanes,
      statuses,
      actions,
      fieldLabels,
      picklists,
      targets,
      changes,
      snapshots,
      importRuns,
    ] = await Promise.all([
      supabase.from("opportunities").select("*").order("close_date", { ascending: true }),
      supabase.from("lanes").select("*").order("position", { ascending: true }),
      supabase.from("opportunity_status").select("*"),
      supabase.from("actions").select("*").order("created_at", { ascending: true }),
      supabase.from("field_labels").select("field_name, display_label"),
      supabase.from("picklists").select("*").order("position", { ascending: true }),
      supabase.from("targets").select("*").order("period", { ascending: true }),
      supabase
        .from("opportunity_field_changes")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(500),
      supabase.from("snapshots").select("*").order("taken_on", { ascending: true }),
      supabase
        .from("import_runs")
        .select("id, imported_at, row_count")
        .order("imported_at", { ascending: false })
        .limit(10),
    ]);

    const firstError =
      opportunities.error ??
      lanes.error ??
      statuses.error ??
      actions.error ??
      fieldLabels.error ??
      picklists.error ??
      targets.error ??
      changes.error ??
      snapshots.error ??
      importRuns.error;
    if (firstError) throw new Error(firstError.message);

    return {
      opportunities: (opportunities.data ?? []) as PipelineData["opportunities"],
      lanes: (lanes.data ?? []) as PipelineData["lanes"],
      statuses: (statuses.data ?? []) as PipelineData["statuses"],
      actions: (actions.data ?? []) as PipelineData["actions"],
      fieldLabels: (fieldLabels.data ?? []) as PipelineData["fieldLabels"],
      picklists: (picklists.data ?? []) as PipelineData["picklists"],
      targets: (targets.data ?? []) as PipelineData["targets"],
      changes: (changes.data ?? []) as PipelineData["changes"],
      snapshots: (snapshots.data ?? []) as PipelineData["snapshots"],
      importRuns: (importRuns.data ?? []) as PipelineData["importRuns"],
    };

    };
  });


export const updateOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ opportunityId: z.string().min(1), patch: opportunityPatchSchema })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: current, error: readError } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", data.opportunityId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!current) throw new Error("That opportunity no longer exists");

    const patch = data.patch;
    const asText = (value: unknown) =>
      value == null || value === "" ? null : typeof value === "boolean" ? String(value) : String(value);

    const updates: Record<string, unknown> = {};
    const log: Array<{ field_name: string; old_value: string | null; new_value: string | null }> = [];

    for (const [key, rawNext] of Object.entries(patch)) {
      if (key === "custom_fields") continue;
      const next = rawNext === "" ? null : rawNext;
      const previous = (current as Record<string, unknown>)[key] ?? null;
      const previousText = asText(previous);
      const nextText = asText(next);
      if (previousText === nextText) continue;
      updates[key] = next;
      log.push({ field_name: key, old_value: previousText, new_value: nextText });
    }

    const previousCustom = ((current as Record<string, unknown>)["custom_fields"] ?? {}) as Record<
      string,
      unknown
    >;
    const nextCustom = patch.custom_fields ?? {};
    const customKeys = new Set([...Object.keys(previousCustom), ...Object.keys(nextCustom)]);
    let customChanged = false;
    for (const key of customKeys) {
      const previousText = asText(previousCustom[key]);
      const nextText = asText(nextCustom[key]);
      if (previousText === nextText) continue;
      customChanged = true;
      log.push({ field_name: key, old_value: previousText, new_value: nextText });
    }
    if (customChanged) updates["custom_fields"] = nextCustom;

    if (log.length === 0) return { ok: true, changed: 0 };

    const { error: updateError } = await supabase
      .from("opportunities")
      .update(updates as never)
      .eq("id", data.opportunityId);
    if (updateError) throw new Error(updateError.message);

    const { error: logError } = await supabase
      .from("opportunity_field_changes")
      .insert(log.map((entry) => ({ ...entry, opportunity_id: data.opportunityId })));
    if (logError) throw new Error(logError.message);

    await recordSnapshots(supabase);

    return { ok: true, changed: log.length };

  });


export const setOpportunityLane = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ opportunityId: z.string().min(1), laneId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("opportunity_status")
      .upsert(
        { opportunity_id: data.opportunityId, lane_id: data.laneId },
        { onConflict: "opportunity_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setStatusNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ opportunityId: z.string().min(1), notes: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("opportunity_status")
      .upsert(
        { opportunity_id: data.opportunityId, notes: data.notes },
        { onConflict: "opportunity_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const opportunityRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().default(""),
  account_name: z.string().nullable().default(null),
  category: z.string().nullable().default(null),
  region: z.string().nullable().default(null),
  owner: z.string().nullable().default(null),
  deal_value: z.number().nullable().default(null),
  weighted_value: z.number().nullable().default(null),
  probability: z.number().nullable().default(null),
  quality_score: z.number().nullable().default(null),
  close_date: z.string().nullable().default(null),
  stage: z.string().nullable().default(null),
  fiscal_period: z.string().nullable().default(null),
  segment: z.string().nullable().default(null),
  contract_start: z.string().nullable().default(null),
  contract_end: z.string().nullable().default(null),
  last_stage_change: z.string().nullable().default(null),
  age_days: z.number().nullable().default(null),
  stage_duration_days: z.number().nullable().default(null),
  status_notes: z.string().nullable().default(null),
  comment: z.string().nullable().default(null),
  is_open: z.boolean().default(true),
  custom_fields: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .default({}),
});

export const importOpportunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ rows: z.array(opportunityRowSchema).min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const rows = data.rows;

    for (let i = 0; i < rows.length; i += 400) {
      const { error } = await supabase
        .from("opportunities")
        .upsert(rows.slice(i, i + 400), { onConflict: "id" });
      if (error) throw new Error(error.message);
    }

    const { data: lanes, error: laneError } = await supabase
      .from("lanes")
      .select("id, position, is_default")
      .order("position", { ascending: true });
    if (laneError) throw new Error(laneError.message);
    const defaultLane = lanes?.find((l) => l.is_default) ?? lanes?.[0];

    let placed = 0;
    if (defaultLane) {
      const { data: existing, error: statusError } = await supabase
        .from("opportunity_status")
        .select("opportunity_id");
      if (statusError) throw new Error(statusError.message);
      const known = new Set((existing ?? []).map((s) => s.opportunity_id));
      const missing = rows
        .filter((r) => !known.has(r.id))
        .map((r) => ({ opportunity_id: r.id, lane_id: defaultLane.id }));
      for (let i = 0; i < missing.length; i += 400) {
        const { error } = await supabase
          .from("opportunity_status")
          .upsert(missing.slice(i, i + 400), { onConflict: "opportunity_id" });
        if (error) throw new Error(error.message);
      }
      placed = missing.length;
    }

    await recordSnapshots(supabase);

    return { imported: rows.length, placed };

  });

export const addAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        opportunityId: z.string().min(1),
        text: z.string().min(1),
        owner: z.string().optional(),
        dueDate: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("actions").insert({
      opportunity_id: data.opportunityId,
      text: data.text,
      owner: data.owner || null,
      due_date: data.dueDate || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), done: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("actions")
      .update({ done: data.done })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("actions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveFieldLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ fieldName: z.string().min(1), displayLabel: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("field_labels")
      .upsert(
        { field_name: data.fieldName, display_label: data.displayLabel },
        { onConflict: "field_name" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const savePicklistValue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        fieldName: z.string().min(1),
        value: z.string().min(1),
        label: z.string().min(1),
        position: z.number().int().default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("picklists").upsert(
      {
        field_name: data.fieldName,
        value: data.value,
        label: data.label,
        position: data.position,
      },
      { onConflict: "field_name,value" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePicklistValue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("picklists").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveLane = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        label: z.string().min(1),
        position: z.number().int(),
        color: z.string().min(1),
        isDefault: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const payload = {
      label: data.label,
      position: data.position,
      color: data.color,
      is_default: data.isDefault,
    };
    if (data.isDefault) {
      const { error } = await supabase
        .from("lanes")
        .update({ is_default: false })
        .neq("id", data.id ?? "00000000-0000-0000-0000-000000000000");
      if (error) throw new Error(error.message);
    }
    const { error } = data.id
      ? await supabase.from("lanes").update(payload).eq("id", data.id)
      : await supabase.from("lanes").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLane = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ id: z.string().uuid(), reassignToLaneId: z.string().uuid() })
      .refine((v) => v.id !== v.reassignToLaneId, "Pick a different lane to move deals to")
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: lanes, error: lanesError } = await supabase
      .from("lanes")
      .select("id, is_default");
    if (lanesError) throw new Error(lanesError.message);
    if ((lanes ?? []).length <= 1) throw new Error("You need at least one lane on the board");
    const removed = (lanes ?? []).find((l) => l.id === data.id);
    if (!removed) throw new Error("That lane no longer exists");
    if (!(lanes ?? []).some((l) => l.id === data.reassignToLaneId)) {
      throw new Error("The lane you picked no longer exists");
    }

    const { error: moveError } = await supabase
      .from("opportunity_status")
      .update({ lane_id: data.reassignToLaneId })
      .eq("lane_id", data.id);
    if (moveError) throw new Error(moveError.message);

    if (removed.is_default) {
      const { error: defaultError } = await supabase
        .from("lanes")
        .update({ is_default: true })
        .eq("id", data.reassignToLaneId);
      if (defaultError) throw new Error(defaultError.message);
    }

    const { error } = await supabase.from("lanes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const saveTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        period: z.string().min(1),
        targetAmount: z.number().min(0),
        metric: z.enum(["deal_value", "weighted_value"]),
        label: z.string().optional(),
        periodStart: z.string().nullable().optional(),
        periodEnd: z.string().nullable().optional(),
        scopeField: z.enum(["category", "region", "segment"]).nullable().optional(),
        scopeValue: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const scopeField = data.scopeField && data.scopeValue ? data.scopeField : null;
    const payload = {
      period: data.period,
      target_amount: data.targetAmount,
      metric: data.metric,
      label: data.label || null,
      period_start: data.periodStart || null,
      period_end: data.periodEnd || null,
      scope_field: scopeField,
      scope_value: scopeField ? (data.scopeValue ?? null) : null,
    };
    const { error } = data.id
      ? await context.supabase.from("targets").update(payload).eq("id", data.id)
      : await context.supabase.from("targets").insert(payload);
    if (error) throw new Error(error.message);

    // Start collecting the series for this target's slice right away.
    await recordSnapshots(context.supabase);
    return { ok: true };
  });


export const deleteTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("targets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
