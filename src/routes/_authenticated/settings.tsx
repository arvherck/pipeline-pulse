import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { ManageLanesPanel } from "@/components/manage-lanes-panel";
import { StateTransferPanel } from "@/components/state-transfer-panel";
import { EnvironmentPanel } from "@/components/environment-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deletePicklistValue,
  deleteTarget,
  saveAppSettings,
  saveFieldLabel,
  savePicklistValue,
  saveTarget,
} from "@/lib/pipeline.functions";
import {
  DEFAULT_FISCAL_START_MONTH,
  MONTH_NAMES,
  fiscalRangeText,
  fiscalYearLabel,
  fiscalYearOf,
} from "@/lib/fiscal";
import { fiscalYearChoices, yearlyTarget } from "@/lib/revenue-forecast";

import {
  IMPORT_FIELDS,
  PICKLIST_FIELDS,
  formatMoney,
  labelFor,
  type PipelineData,
} from "@/lib/pipeline-types";
import {
  SCOPE_FIELDS,
  periodText,
  targetTitle,
  type ScopeField,
} from "@/lib/targets";
import { pipelineQueryOptions, useInvalidatePipeline } from "@/lib/use-pipeline";


export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Pipeline Tracker" },
      {
        name: "description",
        content: "Rename fields, manage picklists, lanes and period targets.",
      },
      { property: "og:title", content: "Settings · Pipeline Tracker" },
      {
        property: "og:description",
        content: "Rename fields, manage picklists, lanes and period targets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data } = useSuspenseQuery(pipelineQueryOptions);

  return (
    <AppShell>
      <header className="border-b pb-4"><div className="tech-label mb-1 text-primary">System configuration // restricted</div><h1 className="font-display text-3xl font-bold uppercase">Settings</h1></header>
      <div className="grid gap-5 lg:grid-cols-2">
        <FieldLabels data={data} />
        <Lanes data={data} />
        <Picklists data={data} />
        <FiscalYear data={data} />
        <Targets data={data} />
        <EnvironmentPanel data={data} />
        <StateTransferPanel data={data} />
      </div>
    </AppShell>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="tech-panel">
      <header className="border-b-2 border-primary/20 bg-muted/40 px-4 py-3">
        <div className="tech-label mb-0.5 text-primary">Control module</div>
        <h2 className="font-display text-sm font-bold uppercase">{title}</h2>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </header>
      <div className="space-y-2 p-3">{children}</div>
    </section>
  );
}

function FieldLabels({ data }: { data: PipelineData }) {
  const save = useServerFn(saveFieldLabel);
  const invalidate = useInvalidatePipeline();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const customKeys = [
    ...new Set(data.opportunities.flatMap((o) => Object.keys(o.custom_fields ?? {}))),
  ].sort((a, b) => a.localeCompare(b));
  const keys = [...IMPORT_FIELDS.map((f) => f.key), ...customKeys];

  return (
    <Panel title="Field names" hint="Rename any column to match your own wording.">
      <div className="max-h-80 space-y-1.5 overflow-y-auto">
        {keys.map((key) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-40 shrink-0 truncate text-xs text-muted-foreground">{key}</span>
            <Input
              className="h-8 text-[13px]"
              value={draft[key] ?? labelFor(data.fieldLabels, key)}
              onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
              onBlur={async (e) => {
                const value = e.target.value.trim();
                if (!value || value === labelFor(data.fieldLabels, key)) return;
                await save({ data: { fieldName: key, displayLabel: value } });
                await invalidate();
                toast.success("Name updated");
              }}
            />
          </div>
        ))}
      </div>
    </Panel>
  );
}


function Lanes({ data }: { data: PipelineData }) {
  const [open, setOpen] = useState(false);

  return (
    <Panel title="Lanes" hint="Columns on the board. One lane is the landing spot for new deals.">
      <ul className="space-y-1">
        {data.lanes.map((lane) => (
          <li key={lane.id} className="flex items-center gap-2 text-[13px]">
            <span
              className="inline-block size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: lane.color }}
              aria-hidden
            />
            <span>{lane.label}</span>
            {lane.is_default && <span className="text-[11px] text-muted-foreground">default</span>}
          </li>
        ))}
      </ul>
      <div className="pt-1">
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          Manage lanes
        </Button>
      </div>
      <ManageLanesPanel data={data} open={open} onClose={() => setOpen(false)} />
    </Panel>
  );
}


function Picklists({ data }: { data: PipelineData }) {
  const save = useServerFn(savePicklistValue);
  const remove = useServerFn(deletePicklistValue);
  const invalidate = useInvalidatePipeline();
  const [field, setField] = useState<string>(PICKLIST_FIELDS[0] ?? "stage");
  const [value, setValue] = useState("");

  const values = data.picklists.filter((p) => p.field_name === field);

  return (
    <Panel title="Picklist values" hint="Fixed choices for stage, segment, category and region.">
      <select
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-[13px]"
        value={field}
        onChange={(e) => setField(e.target.value)}
        aria-label="Field"
      >
        {PICKLIST_FIELDS.map((name) => (
          <option key={name} value={name}>
            {labelFor(data.fieldLabels, name)}
          </option>
        ))}
      </select>
      <ul className="space-y-1.5">
        {values.length === 0 ? (
          <li className="text-[13px] text-muted-foreground">No values yet.</li>
        ) : null}
        {values.map((item, index) => (
          <li key={item.id} className="flex items-center gap-1.5 text-[13px]">
            <Input
              className="h-8 text-[13px]"
              defaultValue={item.label || item.value}
              aria-label={`Label for ${item.value}`}
              onBlur={async (e) => {
                const next = e.target.value.trim();
                if (!next || next === item.label) return;
                await save({
                  data: {
                    fieldName: item.field_name,
                    value: item.value,
                    label: next,
                    position: item.position,
                  },
                });
                await invalidate();
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              className="px-2"
              disabled={index === 0}
              aria-label={`Move ${item.value} up`}
              onClick={async () => {
                const above = values[index - 1];
                if (!above) return;
                await save({
                  data: {
                    fieldName: item.field_name,
                    value: item.value,
                    label: item.label,
                    position: above.position,
                  },
                });
                await save({
                  data: {
                    fieldName: above.field_name,
                    value: above.value,
                    label: above.label,
                    position: item.position,
                  },
                });
                await invalidate();
              }}
            >
              ↑
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="px-2"
              disabled={index === values.length - 1}
              aria-label={`Move ${item.value} down`}
              onClick={async () => {
                const below = values[index + 1];
                if (!below) return;
                await save({
                  data: {
                    fieldName: item.field_name,
                    value: item.value,
                    label: item.label,
                    position: below.position,
                  },
                });
                await save({
                  data: {
                    fieldName: below.field_name,
                    value: below.value,
                    label: below.label,
                    position: item.position,
                  },
                });
                await invalidate();
              }}
            >
              ↓
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="px-2"
              aria-label={`Remove ${item.value}`}
              onClick={async () => {
                await remove({ data: { id: item.id } });
                await invalidate();
              }}
            >
              ✕
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Input
          className="h-8 text-[13px]"
          placeholder="New value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button
          size="sm"
          disabled={!value.trim()}
          onClick={async () => {
            await save({
              data: {
                fieldName: field,
                value: value.trim(),
                label: value.trim(),
                position: values.length,
              },
            });
            setValue("");
            await invalidate();
          }}
        >
          Add
        </Button>
      </div>
    </Panel>
  );
}

type TargetForm = {
  label: string;
  amount: string;
  metric: "deal_value" | "weighted_value";
  periodStart: string;
  periodEnd: string;
  scopeField: "" | ScopeField;
  scopeValue: string;
};

const EMPTY_TARGET: TargetForm = {
  label: "",
  amount: "",
  metric: "deal_value",
  periodStart: "",
  periodEnd: "",
  scopeField: "",
  scopeValue: "",
};

function Targets({ data }: { data: PipelineData }) {
  const save = useServerFn(saveTarget);
  const remove = useServerFn(deleteTarget);
  const invalidate = useInvalidatePipeline();
  const [form, setForm] = useState<TargetForm>(EMPTY_TARGET);
  const [editingId, setEditingId] = useState<string | null>(null);

  const periodTargets = data.targets.filter(
    (target) => target.kind !== "sales" && target.kind !== "revenue",
  );
  const scopeChoices = form.scopeField
    ? data.picklists.filter((p) => p.field_name === form.scopeField)
    : [];

  const amountValue = Number(form.amount.replace(/[^0-9.]/g, ""));
  const problems: string[] = [];
  if (!form.label.trim()) problems.push("Give the target a name");
  if (!form.amount.trim() || !Number.isFinite(amountValue) || amountValue < 0)
    problems.push("Enter an amount of zero or more");
  if (form.periodStart && form.periodEnd && form.periodEnd < form.periodStart)
    problems.push("The end date comes before the start date");
  if (form.scopeField && !form.scopeValue) problems.push("Pick a value for the chosen slice");

  async function submit() {
    await save({
      data: {
        ...(editingId ? { id: editingId } : {}),
        period: form.label.trim(),
        targetAmount: amountValue,
        metric: form.metric,
        label: form.label.trim(),
        periodStart: form.periodStart || null,
        periodEnd: form.periodEnd || null,
        scopeField: form.scopeField || null,
        scopeValue: form.scopeValue || null,
      },
    });
    setForm(EMPTY_TARGET);
    setEditingId(null);
    await invalidate();
    toast.success(editingId ? "Target updated" : "Target added");
  }

  return (
    <Panel
      title="Targets"
      hint="A goal per period, measured on deal value or weighted value of open deals."
    >
      <ul className="space-y-1.5">
        {periodTargets.length === 0 ? (
          <li className="text-[13px] text-muted-foreground">No targets yet.</li>
        ) : null}
        {periodTargets.map((target) => (
          <li key={target.id} className="flex items-center gap-2 text-[13px]">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{targetTitle(target)}</div>
              <div className="truncate text-xs text-muted-foreground">
                {formatMoney(target.target_amount)} · {labelFor(data.fieldLabels, target.metric)} ·{" "}
                {periodText(target)}
                {target.scope_field && target.scope_value
                  ? ` · ${labelFor(data.fieldLabels, target.scope_field)}: ${target.scope_value}`
                  : ""}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditingId(target.id);
                setForm({
                  label: target.label ?? target.period,
                  amount: String(target.target_amount),
                  metric: target.metric === "weighted_value" ? "weighted_value" : "deal_value",
                  periodStart: target.period_start ?? "",
                  periodEnd: target.period_end ?? "",
                  scopeField: (target.scope_field as ScopeField | null) ?? "",
                  scopeValue: target.scope_value ?? "",
                });
              }}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Remove ${targetTitle(target)}`}
              onClick={async () => {
                if (editingId === target.id) {
                  setEditingId(null);
                  setForm(EMPTY_TARGET);
                }
                await remove({ data: { id: target.id } });
                await invalidate();
              }}
            >
              ✕
            </Button>
          </li>
        ))}
      </ul>

      <div className="space-y-2 border-t pt-3">
        <div className="flex flex-wrap gap-2">
          <Input
            className="h-8 w-40 text-[13px]"
            placeholder="Target name"
            aria-label="Target name"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          />
          <Input
            className="h-8 w-32 text-[13px]"
            placeholder="Amount"
            aria-label="Target amount"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-[13px]"
            value={form.metric}
            onChange={(e) =>
              setForm((f) => ({ ...f, metric: e.target.value as TargetForm["metric"] }))
            }
            aria-label="Measured on"
          >
            <option value="deal_value">{labelFor(data.fieldLabels, "deal_value")}</option>
            <option value="weighted_value">{labelFor(data.fieldLabels, "weighted_value")}</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="h-8 w-36 text-[13px]"
            type="date"
            aria-label="Period start"
            value={form.periodStart}
            onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            className="h-8 w-36 text-[13px]"
            type="date"
            aria-label="Period end"
            value={form.periodEnd}
            onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-[13px]"
            value={form.scopeField}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                scopeField: e.target.value as TargetForm["scopeField"],
                scopeValue: "",
              }))
            }
            aria-label="Applies to"
          >
            <option value="">Whole pipeline</option>
            {SCOPE_FIELDS.map((field) => (
              <option key={field} value={field}>
                {labelFor(data.fieldLabels, field)}
              </option>
            ))}
          </select>
          {form.scopeField ? (
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-[13px]"
              value={form.scopeValue}
              onChange={(e) => setForm((f) => ({ ...f, scopeValue: e.target.value }))}
              aria-label="Slice value"
            >
              <option value="">Choose a value…</option>
              {scopeChoices.map((choice) => (
                <option key={choice.id} value={choice.value}>
                  {choice.label || choice.value}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        {problems.length > 0 && (form.label || form.amount) ? (
          <p className="text-xs text-destructive">{problems[0]}</p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={problems.length > 0} onClick={submit}>
            {editingId ? "Save target" : "Add target"}
          </Button>
          {editingId ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_TARGET);
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}


/** Fiscal year start month plus the yearly sales and revenue targets. */
function FiscalYear({ data }: { data: PipelineData }) {
  const saveSettings = useServerFn(saveAppSettings);
  const save = useServerFn(saveTarget);
  const invalidate = useInvalidatePipeline();
  const startMonth = data.appSettings.fiscal_year_start_month || DEFAULT_FISCAL_START_MONTH;
  const [year, setYear] = useState(() =>
    fiscalYearOf(new Date().toISOString().slice(0, 10), startMonth),
  );
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const years = [...new Set([...fiscalYearChoices(data, startMonth), year])].sort((a, b) => a - b);

  async function saveYearly(kind: "sales" | "revenue") {
    const key = `${kind}-${year}`;
    const raw = amounts[key];
    if (raw === undefined) return;
    const amount = Number(raw.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Enter an amount of zero or more");
      return;
    }
    const existing = yearlyTarget(data.targets, kind, year);
    await save({
      data: {
        ...(existing ? { id: existing.id } : {}),
        period: `${fiscalYearLabel(year)} ${kind}`,
        targetAmount: amount,
        metric: "deal_value",
        label: `${fiscalYearLabel(year)} ${kind} target`,
        kind,
        fiscalYear: year,
      },
    });
    setAmounts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    await invalidate();
    toast.success("Yearly target saved");
  }

  return (
    <Panel
      title="Fiscal year & yearly targets"
      hint="Sets the year used by the dashboard forecast, plus its sales and revenue goals."
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Year starts in</span>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-[13px]"
          value={startMonth}
          aria-label="Fiscal year start month"
          onChange={async (e) => {
            await saveSettings({ data: { fiscalYearStartMonth: Number(e.target.value) } });
            await invalidate();
            toast.success("Fiscal year updated");
          }}
        >
          {MONTH_NAMES.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-[13px]"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-label="Fiscal year"
        >
          {years.map((choice) => (
            <option key={choice} value={choice}>
              {fiscalYearLabel(choice)}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{fiscalRangeText(year, startMonth)}</span>
      </div>

      {(["sales", "revenue"] as const).map((kind) => {
        const existing = yearlyTarget(data.targets, kind, year);
        const key = `${kind}-${year}`;
        return (
          <div key={kind} className="flex flex-wrap items-center gap-2">
            <span className="w-16 text-xs capitalize text-muted-foreground">{kind}</span>
            <Input
              className="h-8 w-36 text-[13px]"
              inputMode="decimal"
              placeholder="Amount"
              aria-label={`${kind} target for ${fiscalYearLabel(year)}`}
              value={amounts[key] ?? (existing ? String(existing.target_amount) : "")}
              onChange={(e) => setAmounts((prev) => ({ ...prev, [key]: e.target.value }))}
            />
            <Button size="sm" disabled={amounts[key] === undefined} onClick={() => saveYearly(kind)}>
              Save
            </Button>
            {existing ? (
              <span className="text-xs text-muted-foreground">
                now {formatMoney(existing.target_amount)}
              </span>
            ) : null}
          </div>
        );
      })}
    </Panel>
  );
}
