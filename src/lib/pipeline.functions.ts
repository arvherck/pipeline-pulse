import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PipelineData } from "./pipeline-types";

export const getPipeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PipelineData> => {
    const { supabase } = context;
    const [opportunities, lanes, statuses, actions, fieldLabels, picklists, targets] =
      await Promise.all([
        supabase.from("opportunities").select("*").order("close_date", { ascending: true }),
        supabase.from("lanes").select("*").order("position", { ascending: true }),
        supabase.from("opportunity_status").select("*"),
        supabase.from("actions").select("*").order("created_at", { ascending: true }),
        supabase.from("field_labels").select("field_name, display_label"),
        supabase.from("picklists").select("*").order("position", { ascending: true }),
        supabase.from("targets").select("*").order("period", { ascending: true }),
      ]);

    const firstError =
      opportunities.error ??
      lanes.error ??
      statuses.error ??
      actions.error ??
      fieldLabels.error ??
      picklists.error ??
      targets.error;
    if (firstError) throw new Error(firstError.message);

    return {
      opportunities: (opportunities.data ?? []) as PipelineData["opportunities"],
      lanes: (lanes.data ?? []) as PipelineData["lanes"],
      statuses: (statuses.data ?? []) as PipelineData["statuses"],
      actions: (actions.data ?? []) as PipelineData["actions"],
      fieldLabels: (fieldLabels.data ?? []) as PipelineData["fieldLabels"],
      picklists: (picklists.data ?? []) as PipelineData["picklists"],
      targets: (targets.data ?? []) as PipelineData["targets"],
    };
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
        targetAmount: z.number(),
        metric: z.enum(["deal_value", "weighted_value"]),
        label: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      period: data.period,
      target_amount: data.targetAmount,
      metric: data.metric,
      label: data.label || null,
    };
    const { error } = data.id
      ? await context.supabase.from("targets").update(payload).eq("id", data.id)
      : await context.supabase.from("targets").insert(payload);
    if (error) throw new Error(error.message);
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
