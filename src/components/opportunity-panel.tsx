import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { ActionList } from "@/components/action-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RevenuePlanEditor } from "@/components/revenue-plan-editor";
import { Textarea } from "@/components/ui/textarea";
import {
  createOpportunity,
  deleteOpportunity,
  updateOpportunity,
} from "@/lib/pipeline.functions";

import {
  EDITABLE_FIELDS,
  STATUS_NOTE_OPTIONS,
  isPicklistField,
  probabilityForStage,
  segmentMismatch,
  statusOutcomeForStage,
  validatePatch,
  warningsFor,
  withCalculatedFields,
  type EditableField,
  type OpportunityPatch,
} from "@/lib/opportunity-schema";
import {
  formatMoney,
  labelFor,
  type Opportunity,
  type PipelineData,
} from "@/lib/pipeline-types";
import { laneOf, useInvalidatePipeline } from "@/lib/use-pipeline";
import { cn } from "@/lib/utils";


type Draft = {
  fields: Record<string, string | boolean>;
  custom: Record<string, string>;
};

function toDraft(opportunity: Opportunity): Draft {
  const fields: Record<string, string | boolean> = {};
  for (const field of EDITABLE_FIELDS) {
    const value = opportunity[field.key];
    fields[field.key] =
      field.kind === "boolean" ? Boolean(value) : value == null ? "" : String(value);
  }
  const custom: Record<string, string> = {};
  for (const [key, value] of Object.entries(opportunity.custom_fields ?? {})) {
    custom[key] = value == null ? "" : String(value);
  }
  return { fields, custom };
}

function toPatch(draft: Draft): OpportunityPatch {
  const patch = {} as Record<string, unknown>;
  for (const field of EDITABLE_FIELDS) {
    const raw = draft.fields[field.key];
    if (field.kind === "boolean") {
      patch[field.key] = Boolean(raw);
      continue;
    }
    const text = typeof raw === "string" ? raw.trim() : "";
    if (field.kind === "money" || field.kind === "percent" || field.kind === "number") {
      patch[field.key] = text === "" ? null : Number(text.replace(/[^0-9.\-]/g, ""));
      continue;
    }
    if (field.key === "name" || field.key === "stage") {
      patch[field.key] = text;
      continue;
    }
    patch[field.key] = text === "" ? null : text;
  }
  const custom: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(draft.custom)) {
    custom[key] = value.trim() === "" ? null : value.trim();
  }
  patch["custom_fields"] = custom;
  return patch as OpportunityPatch;
}

/** An empty draft for a brand-new deal. */
function blankDraft(): Draft {
  const fields: Record<string, string | boolean> = {};
  for (const field of EDITABLE_FIELDS) {
    fields[field.key] = field.kind === "boolean" ? true : "";
  }
  return { fields, custom: {} };
}

/** Next free MAN-0001 style reference, based on what is already loaded. */
export function nextReference(rows: Opportunity[]): string {
  let highest = 0;
  for (const row of rows) {
    const match = /^MAN-(\d+)$/.exec(row.id);
    if (match?.[1]) highest = Math.max(highest, Number(match[1]));
  }
  return `MAN-${String(highest + 1).padStart(4, "0")}`;
}

export function OpportunityPanel({
  data,
  opportunity,
  creating = false,
  onClose,
}: {
  data: PipelineData;
  opportunity: Opportunity | null;
  creating?: boolean;
  onClose: () => void;
}) {
  const invalidate = useInvalidatePipeline();
  const saveOpportunity = useServerFn(updateOpportunity);
  const addOpportunity = useServerFn(createOpportunity);
  const removeOpportunity = useServerFn(deleteOpportunity);
  


  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [newId, setNewId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const opportunityId = creating ? "" : opportunity?.id ?? "";
  const savedOpportunity = useMemo(
    () => data.opportunities.find((o) => o.id === opportunityId),
    [data.opportunities, opportunityId],
  );

  const latest = useRef({ statuses: data.statuses, opportunities: data.opportunities });
  latest.current = { statuses: data.statuses, opportunities: data.opportunities };

  // Seed the form only when a different deal is opened, so a background
  // refresh never wipes what is being typed.
  useEffect(() => {
    if (creating) {
      setDraft(blankDraft());
      setConfirmDelete(false);
      setNewId(nextReference(latest.current.opportunities));
      return;
    }
    if (!opportunityId) {
      setDraft(null);
      return;
    }
    setConfirmDelete(false);
    const row = latest.current.opportunities.find((o) => o.id === opportunityId);
    if (row) setDraft(toDraft(row));
  }, [opportunityId, creating]);



  const patch = draft ? toPatch(draft) : null;
  const errors = patch ? validatePatch(patch) : {};
  const warnings = patch ? warningsFor(patch) : {};
  const segmentWarning = patch ? segmentMismatch(patch) : null;
  const dirty = creating
    ? true
    : draft && savedOpportunity
      ? JSON.stringify(draft) !== JSON.stringify(toDraft(savedOpportunity))
      : false;
  const hasErrors = Object.keys(errors).length > 0;

  // Weighted value, open/closed and the day counts are worked out, not typed.
  const computed = patch
    ? withCalculatedFields(patch, { createdAt: savedOpportunity?.created_at ?? null })
    : null;

  function computedText(key: string): string {
    if (!computed) return "—";
    if (key === "weighted_value") return formatMoney(computed.weighted_value);
    if (key === "is_open") return computed.is_open ? "Open" : "Closed";
    if (key === "age_days") return computed.age_days == null ? "—" : `${computed.age_days} days`;
    if (key === "stage_duration_days")
      return computed.stage_duration_days == null ? "—" : `${computed.stage_duration_days} days`;
    return "—";
  }

  const label = (field: string) => labelFor(data.fieldLabels, field);

  const actions = opportunityId
    ? data.actions.filter((a) => a.opportunity_id === opportunityId)
    : [];
  const changes = opportunityId
    ? data.changes.filter((c) => c.opportunity_id === opportunityId)
    : [];

  function set(key: string, value: string | boolean) {
    setDraft((current) => {
      if (!current) return current;
      const fields = { ...current.fields, [key]: value };
      // Stage drives the probability default and, once closed, the outcome note.
      if (key === "stage") {
        const implied = probabilityForStage(typeof value === "string" ? value : "");
        if (implied != null) fields["probability"] = String(implied);
      }
      if (key === "stage" || key === "is_open") {
        const open = Boolean(fields["is_open"]);
        const stage = typeof fields["stage"] === "string" ? fields["stage"] : "";
        const outcome = statusOutcomeForStage(stage);
        if (!open && outcome) fields["status_notes"] = outcome;
      }
      return { ...current, fields };
    });
  }

  async function save() {
    if (!patch || hasErrors) return;
    setSaving(true);
    try {
      if (creating) {
        const reference = newId.trim();
        if (!reference) {
          toast.error("Give the opportunity a reference");
          return;
        }
        await addOpportunity({ data: { id: reference, patch } });
        await invalidate();
        toast.success(`${reference} created`);
        onClose();
        return;
      }
      if (!opportunity) return;
      const result = await saveOpportunity({ data: { opportunityId: opportunity.id, patch } });
      await invalidate();
      toast.success(result.changed === 0 ? "Nothing to save" : "Changes saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the changes");
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    if (!opportunity) return;
    setSaving(true);
    try {
      await removeOpportunity({ data: { opportunityId: opportunity.id } });
      await invalidate();
      toast.success(`${opportunity.name} deleted`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete that opportunity");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={creating || Boolean(opportunity)}
      onOpenChange={(open) => (open ? null : onClose())}
    >
      <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-2xl">
        {(creating || opportunity) && draft ? (
          <>
            <SheetHeader className="shrink-0 border-b px-5 pb-4 pt-5 text-left">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{creating ? newId : opportunity?.id}</span>
                {creating || !opportunity ? null : (
                  <>
                    <span aria-hidden>·</span>
                    <span className="border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                      {laneOf(data, opportunity.id)?.label ?? "No lane"}
                    </span>
                  </>
                )}
              </div>
              <SheetTitle className="mt-2 text-xl leading-tight">
                {creating
                  ? typeof draft.fields["name"] === "string" && draft.fields["name"].trim()
                    ? String(draft.fields["name"])
                    : "Untitled opportunity"
                  : savedOpportunity?.name}
              </SheetTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {typeof draft.fields["account_name"] === "string" && draft.fields["account_name"].trim()
                  ? String(draft.fields["account_name"])
                  : "No client"}
              </p>
            </SheetHeader>

            <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 border-b px-5">
                <TabsList className="h-11 bg-transparent p-0">
                <TabsTrigger value="details" className="text-xs">
                  Details
                </TabsTrigger>
                <TabsTrigger value="actions" className="text-xs">
                  Actions{actions.length > 0 ? ` (${actions.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="revenue" className="text-xs">
                  Revenue
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs">
                  History
                </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="details" className="min-h-0 flex-1 overflow-y-auto px-5 pb-24 pt-5">
                {segmentWarning ? (
                  <p className="mb-5 border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-400">
                    {segmentWarning} You can still save.
                  </p>
                ) : null}

                <FieldGroup title="Deal essentials">
                  {(["name", "account_name", "stage", "owner", "category"] as const).map((key) => {
                    const field = EDITABLE_FIELDS.find((candidate) => candidate.key === key);
                    return field ? (
                      <FieldEditor
                        key={key}
                        field={field}
                        label={label(key)}
                        data={data}
                        value={draft.fields[key] ?? ""}
                        isOpen={computed?.is_open ?? true}
                        stage={String(draft.fields["stage"] ?? "")}
                        error={errors[key]}
                        warning={warnings[key]}
                        onChange={(value) => set(key, value)}
                      />
                    ) : null;
                  })}
                </FieldGroup>

                <FieldGroup title="Value & confidence">
                  {(["deal_value", "probability"] as const).map((key) => {
                    const field = EDITABLE_FIELDS.find((candidate) => candidate.key === key);
                    return field ? (
                      <FieldEditor
                        key={key}
                        field={field}
                        label={label(key)}
                        data={data}
                        value={draft.fields[key] ?? ""}
                        isOpen={computed?.is_open ?? true}
                        stage={String(draft.fields["stage"] ?? "")}
                        error={errors[key]}
                        warning={warnings[key]}
                        onChange={(value) => set(key, value)}
                      />
                    ) : null;
                  })}
                  <ComputedMetric label={label("weighted_value")} value={computedText("weighted_value")} emphasis />
                </FieldGroup>

                <FieldGroup title="Timing">
                  {(["close_date", "contract_start", "contract_end"] as const).map((key) => {
                    const field = EDITABLE_FIELDS.find((candidate) => candidate.key === key);
                    return field ? (
                      <FieldEditor
                        key={key}
                        field={field}
                        label={label(key)}
                        data={data}
                        value={draft.fields[key] ?? ""}
                        isOpen={computed?.is_open ?? true}
                        stage={String(draft.fields["stage"] ?? "")}
                        error={errors[key]}
                        warning={warnings[key]}
                        onChange={(value) => set(key, value)}
                      />
                    ) : null;
                  })}
                  <ComputedMetric label={label("age_days")} value={computedText("age_days")} />
                  <ComputedMetric label={label("stage_duration_days")} value={computedText("stage_duration_days")} />
                </FieldGroup>

                <section className="mt-6 border-t pt-5">
                  <h3 className="mb-3 font-display text-xs font-semibold uppercase text-muted-foreground">Comments</h3>
                  {(() => {
                    const field = EDITABLE_FIELDS.find((candidate) => candidate.key === "comment");
                    return field ? (
                      <FieldEditor
                        field={field}
                        label={label("comment")}
                        data={data}
                        value={draft.fields["comment"] ?? ""}
                        isOpen={computed?.is_open ?? true}
                        stage={String(draft.fields["stage"] ?? "")}
                        error={errors["comment"]}
                        warning={warnings["comment"]}
                        onChange={(value) => set("comment", value)}
                      />
                    ) : null;
                  })()}
                </section>

                {creating ? null : (
                  <section className="mt-7 border-t pt-4">
                    {confirmDelete ? (
                      <div className="border border-destructive/50 bg-destructive/10 p-3">
                        <p className="text-[13px]">
                          Delete <strong>{savedOpportunity?.name ?? opportunity?.id}</strong> for
                          good? Its actions and change history go too. This can't be undone.
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={saving}
                            onClick={destroy}
                          >
                            Yes, delete it
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmDelete(false)}
                            disabled={saving}
                          >
                            Keep it
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="px-0 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => setConfirmDelete(true)}
                      >
                        Delete opportunity
                      </Button>
                    )}
                  </section>
                )}

                <div className="fixed bottom-0 right-0 z-10 flex w-full items-center gap-2 border-t bg-background/95 px-5 py-3 backdrop-blur-sm sm:max-w-2xl">
                  <Button size="sm" disabled={hasErrors || !dirty || saving} onClick={save}>
                    {saving ? "Saving…" : creating ? "Create opportunity" : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={saving}
                    onClick={() =>
                      creating
                        ? onClose()
                        : savedOpportunity && setDraft(toDraft(savedOpportunity))
                    }
                  >
                    {creating ? "Cancel" : "Discard"}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {hasErrors
                      ? "Fix the highlighted fields to save"
                      : creating
                        ? "Not saved yet"
                        : dirty
                          ? "Unsaved changes"
                          : "All changes saved"}
                  </span>
                </div>
              </TabsContent>

              <TabsContent value="actions" className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                {creating || !opportunity ? (
                  <p className="text-[13px] text-muted-foreground">
                    Create the opportunity first, then add follow-up actions here.
                  </p>
                ) : (
                  <ActionList opportunityId={opportunity.id} actions={actions} />
                )}
              </TabsContent>

              <TabsContent value="revenue" className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                {creating || !opportunity ? (
                  <p className="text-[13px] text-muted-foreground">
                    Create the opportunity first, then plan its revenue by month.
                  </p>
                ) : (
                  <RevenuePlanEditor data={data} opportunity={opportunity} />
                )}
              </TabsContent>

              <TabsContent value="history" className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                {changes.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">No edits recorded yet.</p>
                ) : (
                  <ul className="relative space-y-5 border-l pl-5">
                    {changes.map((change) => (
                      <li key={change.id} className="relative text-[13px] before:absolute before:-left-[1.45rem] before:top-1 before:size-2 before:bg-primary">
                        <p className="font-medium">{label(change.field_name)}</p>
                        <p className="text-muted-foreground">
                          was {change.old_value ?? "empty"} → now {change.new_value ?? "empty"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(change.changed_at).toLocaleString("en-GB")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function FieldLabel({ text }: { text: string }) {
  return (
    <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">{text}</span>
  );
}

function Hint({ text }: { text: string }) {
  return <p className="mt-0.5 text-[11px] text-muted-foreground">{text}</p>;
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b py-5 first:pt-0">
      <h3 className="mb-3 font-display text-xs font-semibold uppercase text-muted-foreground">
        {title}
      </h3>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function ComputedMetric({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className={cn("min-w-0 border-l-2 border-border pl-3", emphasis && "border-l-primary")}>
      <FieldLabel text={label} />
      <p className={cn("data-value mt-1 text-sm font-semibold", emphasis && "text-lg text-primary")}>
        {value}
      </p>
    </div>
  );
}

function FieldEditor({
  field,
  label,
  data,
  value,
  isOpen,
  stage,
  computedText,
  error,
  warning,
  onChange,
}: {
  field: EditableField;
  label: string;
  data: PipelineData;
  value: string | boolean;
  isOpen: boolean;
  stage: string;
  computedText?: string | undefined;
  error?: string | undefined;
  warning?: string | undefined;
  onChange: (value: string | boolean) => void;
}) {
  const inputClass = cn("h-8 text-[13px]", error && "border-destructive");
  const options = isPicklistField(field.key)
    ? data.picklists.filter((p) => p.field_name === field.key)
    : [];
  const text = typeof value === "string" ? value : "";
  const missingOption =
    options.length > 0 && text !== "" && !options.some((option) => option.value === text);

  if (computedText !== undefined) {
    return (
      <div className="min-w-0">
        <FieldLabel text={label} />
        <p className="data-value h-8 rounded-sm border bg-muted px-2 py-1.5 text-[13px] text-muted-foreground">
          {computedText}
        </p>
        <Hint text="Worked out for you — no need to fill this in." />
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", field.kind === "textarea" && "sm:col-span-2")}>
      <FieldLabel text={`${label}${field.required ? " *" : ""}`} />


      {field.kind === "status" ? (
        !isOpen ? (
          <p className="h-8 rounded-sm border bg-muted px-2 py-1.5 text-[13px] text-muted-foreground">
            {statusOutcomeForStage(stage) ?? (text === "" ? "—" : text)}
          </p>
        ) : (
          <select
            className="h-8 w-full rounded-sm border border-input bg-background px-2 text-[13px]"
            value={text}
            aria-label={label}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">—</option>
            {STATUS_NOTE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            {text !== "" && !(STATUS_NOTE_OPTIONS as readonly string[]).includes(text) ? (
              <option value={text}>{text} (not in list)</option>
            ) : null}
          </select>
        )
      ) : field.kind === "boolean" ? (
        <p className="h-8 border bg-muted px-2 py-1.5 text-[13px] text-muted-foreground">
          {value ? "Open" : "Closed"}
        </p>
      ) : field.kind === "select" ? (
        <select
          className={cn(
            "h-8 w-full rounded-md border border-input bg-background px-2 text-[13px]",
            error && "border-destructive",
          )}
          value={text}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          {options.map((option) => (
            <option key={option.id} value={option.value}>
              {option.label || option.value}
            </option>
          ))}
          {missingOption ? <option value={text}>{text} (not in list)</option> : null}
        </select>
      ) : field.kind === "textarea" ? (
        <Textarea
          className={cn("min-h-16 text-[13px]", error && "border-destructive")}
          value={text}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.kind === "date" ? (
        <Input
          type="date"
          className={inputClass}
          value={text}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          className={inputClass}
          inputMode="decimal"
          value={text}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.kind === "money" && !error && text.trim() !== "" ? (
        <Hint text={formatMoney(Number(text))} />
      ) : null}
      {field.kind === "percent" && !error && text.trim() !== "" ? <Hint text="0–100" /> : null}
      {field.key === "probability" && !error && String(probabilityForStage(stage)) === text ? (
        <Hint text="Suggested by the stage — type over it to change." />
      ) : null}
      {field.kind === "status" && !isOpen ? (
        <Hint text="Taken from the stage while the deal is closed." />
      ) : null}
      {options.length > 0 && missingOption && !error ? (
        <Hint text="This value isn't in the allowed list — pick one or add it in Settings." />
      ) : null}
      {error ? <p className="mt-0.5 text-[11px] text-destructive">{error}</p> : null}
      {!error && warning ? (
        <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-500">{warning}</p>
      ) : null}
    </div>
  );
}
