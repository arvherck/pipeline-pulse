import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  opportunityPatchSchema,
  probabilityForStage,
  todayDateString,
  withCalculatedFields,
} from "./opportunity-schema";

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
      revenuePlans,
      appSettings,
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
      supabase
        .from("revenue_plan")
        .select("id, opportunity_id, period_month, amount")
        .order("period_month", { ascending: true }),
      supabase.from("app_settings").select("fiscal_year_start_month").maybeSingle(),
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
      importRuns.error ??
      revenuePlans.error ??
      appSettings.error;
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
      revenuePlans: (revenuePlans.data ?? []) as PipelineData["revenuePlans"],
      appSettings: {
        fiscal_year_start_month: appSettings.data?.fiscal_year_start_month ?? 9,
      },
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

    // A stage change stamps today's date, then the calculated fields follow.
    const stageChanged = (data.patch.stage ?? "") !== (current.stage ?? "");
    const patch = withCalculatedFields(
      {
        ...data.patch,
        last_stage_change: stageChanged
          ? todayDateString()
          : (data.patch.last_stage_change ?? null),
      },
      { createdAt: current.created_at },
    );

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


/**
 * Move a deal to another workflow lane on the board. This is placement only —
 * the deal's stage, probability and dates are untouched.
 */
export const setOpportunityLane = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ opportunityId: z.string().min(1), laneId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("opportunity_status").upsert(
      {
        opportunity_id: data.opportunityId,
        lane_id: data.laneId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "opportunity_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true, changed: 1 };
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

/** Create a deal by hand. The reference must be free so imports still match. */
export const createOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ id: z.string().trim().min(1, "A reference is required"), patch: opportunityPatchSchema })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: clash, error: clashError } = await supabase
      .from("opportunities")
      .select("id")
      .eq("id", data.id)
      .maybeSingle();
    if (clashError) throw new Error(clashError.message);
    if (clash) throw new Error(`${data.id} is already used by another opportunity`);

    const nowIso = new Date().toISOString();
    const row = withCalculatedFields(
      {
        ...data.patch,
        last_stage_change: data.patch.last_stage_change ?? todayDateString(),
      },
      { createdAt: nowIso },
    );

    const { error } = await supabase
      .from("opportunities")
      .insert({ id: data.id, ...row } as never);
    if (error) throw new Error(error.message);

    // Place the new deal in the default lane on the board.
    const { data: defaultLane } = await supabase
      .from("lanes")
      .select("id")
      .eq("is_default", true)
      .maybeSingle();
    if (defaultLane?.id) {
      const { error: placeError } = await supabase
        .from("opportunity_status")
        .upsert(
          { opportunity_id: data.id, lane_id: defaultLane.id },
          { onConflict: "opportunity_id" },
        );
      if (placeError) throw new Error(placeError.message);
    }

    await recordSnapshots(supabase);
    return { ok: true, id: data.id };
  });

/** Remove a deal for good, along with its actions, lane placement and history. */
export const deleteOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ opportunityId: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    for (const table of ["actions", "opportunity_field_changes", "opportunity_status"] as const) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("opportunity_id", data.opportunityId);
      if (error) throw new Error(error.message);
    }
    const { error } = await supabase.from("opportunities").delete().eq("id", data.opportunityId);
    if (error) throw new Error(error.message);
    await recordSnapshots(supabase);
    return { ok: true };
  });

export const importOpportunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ rows: z.array(opportunityRowSchema).min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // Calculated columns are always worked out here, never taken from the file.
    const rows = data.rows.map((row) => {
      const calculated = withCalculatedFields(row, { createdAt: null });
      return {
        ...calculated,
        age_days: row.age_days,
        stage_duration_days:
          row.last_stage_change == null
            ? row.stage_duration_days
            : calculated.stage_duration_days,
      };
    });

    for (let i = 0; i < rows.length; i += 400) {
      const { error } = await supabase
        .from("opportunities")
        .upsert(rows.slice(i, i + 400), { onConflict: "id" });
      if (error) throw new Error(error.message);
    }

    const placed = 0;


    // Record the run so the app can show when data last came in.
    const { error: runError } = await supabase
      .from("import_runs")
      .insert({ row_count: rows.length });
    if (runError) throw new Error(runError.message);

    await recordSnapshots(supabase);


    return { imported: rows.length, placed };

  });

const actionStatus = z.enum(["Open", "In progress", "Blocked", "Done"]);
const actionPriority = z.enum(["High", "Medium", "Low"]);

export const addAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        opportunityId: z.string().min(1),
        text: z.string().min(1),
        owner: z.string().optional(),
        dueDate: z.string().optional(),
        priority: actionPriority.default("Medium"),
        status: actionStatus.default("Open"),
        notes: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("actions").insert({
      opportunity_id: data.opportunityId,
      text: data.text,
      owner: data.owner || null,
      due_date: data.dueDate || null,
      priority: data.priority,
      status: data.status,
      notes: data.notes || null,
      done: data.status === "Done",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Edit any part of an action. `done` stays in step with the status. */
export const updateAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        text: z.string().min(1).optional(),
        owner: z.string().nullable().optional(),
        dueDate: z.string().nullable().optional(),
        priority: actionPriority.optional(),
        status: actionStatus.optional(),
        notes: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const updates: Record<string, unknown> = {};
    if (data.text !== undefined) updates["text"] = data.text;
    if (data.owner !== undefined) updates["owner"] = data.owner || null;
    if (data.dueDate !== undefined) updates["due_date"] = data.dueDate || null;
    if (data.priority !== undefined) updates["priority"] = data.priority;
    if (data.notes !== undefined) updates["notes"] = data.notes || null;
    if (data.status !== undefined) {
      updates["status"] = data.status;
      updates["done"] = data.status === "Done";
    }
    if (Object.keys(updates).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("actions")
      .update(updates as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), done: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("actions")
      .update({ done: data.done, status: data.done ? "Done" : "Open" })
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

/** Save a board lane. Lanes are their own workflow track, separate from stage. */
export const saveLane = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        label: z.string().trim().min(1),
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

/** Delete a lane after moving its deals to another lane. */
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
      .select("id, is_default, label");
    if (lanesError) throw new Error(lanesError.message);
    if ((lanes ?? []).length <= 1) throw new Error("You need at least one lane on the board");
    const removed = (lanes ?? []).find((l) => l.id === data.id);
    const target = (lanes ?? []).find((l) => l.id === data.reassignToLaneId);
    if (!removed) throw new Error("That lane no longer exists");
    if (!target) throw new Error("The lane you picked no longer exists");

    // Move every deal placed in this lane before the lane disappears.
    const { error: moveError } = await supabase
      .from("opportunity_status")
      .update({ lane_id: data.reassignToLaneId, updated_at: new Date().toISOString() })
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
