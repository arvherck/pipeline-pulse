import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { ManageLanesPanel } from "@/components/manage-lanes-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deletePicklistValue,
  deleteTarget,
  saveFieldLabel,
  savePicklistValue,
  saveTarget,
} from "@/lib/pipeline.functions";

import {
  IMPORT_FIELDS,
  PICKLIST_FIELDS,
  labelFor,
  type PipelineData,
} from "@/lib/pipeline-types";
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
      <h1 className="text-lg font-semibold">Settings</h1>
      <div className="grid gap-5 lg:grid-cols-2">
        <FieldLabels data={data} />
        <Lanes data={data} />
        <Picklists data={data} />
        <Targets data={data} />
      </div>
    </AppShell>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border bg-card">
      <header className="border-b px-3 py-2">
        <h2 className="text-sm font-semibold">{title}</h2>
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

  return (
    <Panel title="Field names" hint="Rename any column to match your own wording.">
      <div className="max-h-80 space-y-1.5 overflow-y-auto">
        {IMPORT_FIELDS.map((field) => (
          <div key={field.key} className="flex items-center gap-2">
            <span className="w-40 shrink-0 truncate text-xs text-muted-foreground">
              {field.key}
            </span>
            <Input
              className="h-8 text-[13px]"
              value={draft[field.key] ?? labelFor(data.fieldLabels, field.key)}
              onChange={(e) => setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))}
              onBlur={async (e) => {
                const value = e.target.value.trim();
                if (!value || value === labelFor(data.fieldLabels, field.key)) return;
                await save({ data: { fieldName: field.key, displayLabel: value } });
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
        {values.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-[13px]">
            <span className="flex-1 truncate">{item.label || item.value}</span>
            <Button
              size="sm"
              variant="ghost"
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

function Targets({ data }: { data: PipelineData }) {
  const save = useServerFn(saveTarget);
  const remove = useServerFn(deleteTarget);
  const invalidate = useInvalidatePipeline();
  const [period, setPeriod] = useState("");
  const [amount, setAmount] = useState("");
  const [metric, setMetric] = useState<"deal_value" | "weighted_value">("deal_value");

  return (
    <Panel title="Targets" hint="A goal per period, measured on deal value or weighted value.">
      <ul className="space-y-1.5">
        {data.targets.length === 0 ? (
          <li className="text-[13px] text-muted-foreground">No targets yet.</li>
        ) : null}
        {data.targets.map((target) => (
          <li key={target.id} className="flex items-center gap-2 text-[13px]">
            <span className="w-24 shrink-0 truncate">{target.period}</span>
            <span className="flex-1 tabular-nums">
              {target.target_amount.toLocaleString()} ·{" "}
              {labelFor(data.fieldLabels, target.metric)}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await remove({ data: { id: target.id } });
                await invalidate();
              }}
            >
              ✕
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Input
          className="h-8 w-28 text-[13px]"
          placeholder="Period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        />
        <Input
          className="h-8 w-32 text-[13px]"
          placeholder="Amount"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-[13px]"
          value={metric}
          onChange={(e) => setMetric(e.target.value as "deal_value" | "weighted_value")}
          aria-label="Measured on"
        >
          <option value="deal_value">{labelFor(data.fieldLabels, "deal_value")}</option>
          <option value="weighted_value">{labelFor(data.fieldLabels, "weighted_value")}</option>
        </select>
        <Button
          size="sm"
          disabled={!period.trim() || !amount.trim()}
          onClick={async () => {
            const value = Number(amount.replace(/[^0-9.]/g, ""));
            if (!Number.isFinite(value)) {
              toast.error("Enter a number for the amount");
              return;
            }
            await save({
              data: { period: period.trim(), targetAmount: value, metric, label: period.trim() },
            });
            setPeriod("");
            setAmount("");
            await invalidate();
          }}
        >
          Add
        </Button>
      </div>
    </Panel>
  );
}
