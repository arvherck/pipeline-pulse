import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { ActionList } from "@/components/action-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createOpportunity,
  deleteOpportunity,
  setOpportunityLane,
  setStatusNotes,
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
  type EditableField,
  type OpportunityPatch,
} from "@/lib/opportunity-schema";
import {
  formatDate,
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
  const saveNotes = useServerFn(setStatusNotes);
  const saveOpportunity = useServerFn(updateOpportunity);
  const addOpportunity = useServerFn(createOpportunity);
  const removeOpportunity = useServerFn(deleteOpportunity);
  const moveLane = useServerFn(setOpportunityLane);


  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [newId, setNewId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newCustomKey, setNewCustomKey] = useState("");

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
      setNotes("");
      setConfirmDelete(false);
      setNewId(nextReference(latest.current.opportunities));
      return;
    }
    if (!opportunityId) {
      setDraft(null);
      return;
    }
    setConfirmDelete(false);
    setNotes(
      latest.current.statuses.find((s) => s.opportunity_id === opportunityId)?.notes ?? "",
    );
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

  function setCustom(key: string, value: string) {
    setDraft((current) =>
      current ? { ...current, custom: { ...current.custom, [key]: value } } : current,
    );
  }

  function removeCustom(key: string) {
    setDraft((current) => {
      if (!current) return current;
      const next = { ...current.custom };
      delete next[key];
      return { ...current, custom: next };
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
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {(creating || opportunity) && draft ? (
          <>
            <SheetHeader className="pb-0">
              <div className="tech-label text-primary">
                {creating ? "New opportunity // draft" : `Opportunity record // ${opportunity?.id}`}
              </div>
              <SheetTitle className="text-base leading-snug">
                {creating
                  ? typeof draft.fields["name"] === "string" && draft.fields["name"].trim()
                    ? String(draft.fields["name"])
                    : "Untitled opportunity"
                  : savedOpportunity?.name}
              </SheetTitle>
              {creating ? (
                <p className="text-xs text-muted-foreground">
                  Fill in at least a name and a stage. It lands in the default lane.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {savedOpportunity?.account_name ?? "No client"} · {opportunity?.id} · updated{" "}
                  {formatDate(savedOpportunity?.updated_at ?? null)}
                </p>
              )}
              {creating ? null : (
                <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">Lane</span>
                <select
                  className="h-7 rounded-md border border-input bg-card px-2 text-xs"
                  aria-label="Lane"
                  value={opportunity ? laneOf(data, opportunity.id)?.id ?? "" : ""}
                  onChange={async (event) => {
                    const laneId = event.target.value;
                    if (!laneId || !opportunity) return;
                    try {
                      await moveLane({ data: { opportunityId: opportunity.id, laneId } });
                      await invalidate();
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "Could not move that card",
                      );
                    }
                  }}
                >
                  {data.lanes.map((lane) => (
                    <option key={lane.id} value={lane.id}>
                      {lane.label}
                    </option>
                  ))}
                </select>
                </div>
              )}
            </SheetHeader>


            <Tabs defaultValue="details" className="px-4 pb-8">
              <TabsList className="mb-3">
                <TabsTrigger value="details" className="text-xs">
                  Details
                </TabsTrigger>
                <TabsTrigger value="actions" className="text-xs">
                  Actions
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs">
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                {segmentWarning ? (
                  <p className="rounded-sm border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-400">
                    {segmentWarning} You can still save.
                  </p>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FieldLabel text={label("id")} />
                    {creating ? (
                      <>
                        <Input
                          className="h-8 text-[13px]"
                          value={newId}
                          onChange={(e) => setNewId(e.target.value)}
                        />
                        <Hint text="Suggested reference — change it to match your own numbering if you like." />
                      </>
                    ) : (
                      <>
                        <p className="h-8 rounded-md border bg-muted px-2 py-1.5 text-[13px] text-muted-foreground">
                          {opportunity?.id}
                        </p>
                        <Hint text="Set at import — used to match rows, so it can't be changed." />
                      </>
                    )}
                  </div>

                  {EDITABLE_FIELDS.map((field) => (
                    <FieldEditor
                      key={field.key}
                      field={field}
                      label={label(field.key)}
                      data={data}
                      value={draft.fields[field.key] ?? ""}
                      isOpen={Boolean(draft.fields["is_open"])}
                      stage={typeof draft.fields["stage"] === "string" ? draft.fields["stage"] : ""}
                      error={errors[field.key]}
                      warning={warnings[field.key]}
                      onChange={(value) => set(field.key, value)}
                    />
                  ))}
                </div>

                <section className="space-y-2 border-t pt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Extra fields
                  </h3>
                  {Object.keys(draft.custom).length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">None yet.</p>
                  ) : null}
                  {Object.entries(draft.custom).map(([key, value]) => (
                    <div key={key} className="flex items-end gap-2">
                      <div className="flex-1">
                        <FieldLabel text={label(key)} />
                        <Input
                          className="h-8 text-[13px]"
                          value={value}
                          onChange={(e) => setCustom(key, e.target.value)}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Remove ${key}`}
                        onClick={() => removeCustom(key)}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      className="h-8 text-[13px]"
                      placeholder="New extra field name"
                      value={newCustomKey}
                      onChange={(e) => setNewCustomKey(e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!newCustomKey.trim()}
                      onClick={() => {
                        setCustom(newCustomKey.trim(), "");
                        setNewCustomKey("");
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </section>

                {creating ? null : (
                  <section className="space-y-2 border-t pt-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Danger zone
                    </h3>
                    {confirmDelete ? (
                      <div className="rounded-sm border border-destructive/50 bg-destructive/10 p-3">
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
                        variant="outline"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmDelete(true)}
                      >
                        Delete opportunity
                      </Button>
                    )}
                  </section>
                )}

                <div className="sticky bottom-0 -mx-4 flex items-center gap-2 border-t-2 border-primary/30 bg-background/95 px-4 py-3 backdrop-blur-sm">
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

              <TabsContent value="actions" className="space-y-6">
                {creating || !opportunity ? (
                  <p className="text-[13px] text-muted-foreground">
                    Create the opportunity first, then add follow-up actions here.
                  </p>
                ) : (
                  <>
                    <section>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Status note
                      </h3>
                      <Textarea
                        className="mt-2 min-h-20 text-[13px]"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="What's happening with this deal?"
                      />
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={async () => {
                          await saveNotes({ data: { opportunityId: opportunity.id, notes } });
                          await invalidate();
                          toast.success("Note saved");
                        }}
                      >
                        Save note
                      </Button>
                    </section>

                    <ActionList opportunityId={opportunity.id} actions={actions} />
                  </>
                )}
              </TabsContent>

              <TabsContent value="history">
                {changes.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">No edits recorded yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {changes.map((change) => (
                      <li key={change.id} className="border-b pb-2 text-[13px] last:border-0">
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

function FieldEditor({
  field,
  label,
  data,
  value,
  isOpen,
  stage,
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
        <div className="flex h-8 items-center gap-2">
          <Switch checked={Boolean(value)} onCheckedChange={(checked) => onChange(checked)} />
          <span className="text-[13px]">{value ? "Open" : "Closed"}</span>
        </div>
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
