import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { LastImportNote } from "@/components/last-import-note";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importOpportunities } from "@/lib/pipeline.functions";
import { IMPORT_FIELDS, labelFor, type PipelineData } from "@/lib/pipeline-types";
import { pipelineQueryOptions, useInvalidatePipeline } from "@/lib/use-pipeline";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({
    meta: [
      { title: "Import data · Pipeline Tracker" },
      {
        name: "description",
        content: "Load a spreadsheet export into the pipeline without the file leaving your computer.",
      },
      { property: "og:title", content: "Import data · Pipeline Tracker" },
      {
        property: "og:description",
        content: "Load a spreadsheet export into the pipeline without the file leaving your computer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImportPage,
});

type SheetRow = Record<string, unknown>;
type Mapping = Record<string, string>;

const CUSTOM = "custom:";

function ImportPage() {
  const { data } = useSuspenseQuery(pipelineQueryOptions);
  return (
    <AppShell>
      <ImportWizard data={data} />
    </AppShell>
  );
}

function ImportWizard({ data }: { data: PipelineData }) {
  const upload = useServerFn(importOpportunities);
  const invalidate = useInvalidatePipeline();
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [customKeys, setCustomKeys] = useState<Mapping>({});
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  async function readFile(file: File) {
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("That file has no sheets");
      const sheet = workbook.Sheets[firstSheetName];
      if (!sheet) throw new Error("That file has no sheets");
      const parsed = XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: null, raw: false });
      if (parsed.length === 0) throw new Error("No rows found in that file");
      const cols = Object.keys(parsed[0] ?? {});
      setFileName(file.name);
      setHeaders(cols);
      setRows(parsed);
      setMapping(autoMap(cols));
      setCustomKeys({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that file");
    }
  }

  const mappedFields = Object.values(mapping).filter(Boolean);
  const hasId = mappedFields.includes("id");

  function buildRows() {
    return rows.map((row) => {
      const out: Record<string, unknown> = {};
      const custom: Record<string, unknown> = {};
      for (const header of headers) {
        const target = mapping[header];
        if (!target) continue;
        const raw = row[header];
        if (target === CUSTOM) {
          const key = (customKeys[header] ?? "").trim();
          if (key) custom[key] = raw ?? null;
          continue;
        }
        const field = IMPORT_FIELDS.find((f) => f.key === target);
        out[target] = coerce(raw, field?.kind ?? "text");
      }
      if (Object.keys(custom).length > 0) out["custom_fields"] = custom;
      return out;
    });
  }

  async function confirmImport() {
    setBusy(true);
    try {
      const payload = buildRows().filter((row) => row["id"] != null && row["id"] !== "");
      if (payload.length === 0) throw new Error("No rows had a value in the ID column");
      const result = await upload({ data: { rows: payload } });
      await invalidate();
      toast.success(`Imported ${result.imported} rows`);
      setRows([]);
      setHeaders([]);
      setFileName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Import data</h1>
          <p className="text-[13px] text-muted-foreground">
            Drop a .xlsx or .csv export below. The file is read on this computer only — nothing is
            uploaded except the rows you confirm.
          </p>
        </div>
        <LastImportNote className="pt-1" />
      </div>


      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void readFile(file);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed bg-card px-6 py-10 text-center",
          dragging && "border-primary bg-accent/40",
        )}
      >
        <span className="text-[13px] font-medium">Drop your spreadsheet here</span>
        <span className="mt-1 text-xs text-muted-foreground">
          or click to choose a .xlsx or .csv file
        </span>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void readFile(file);
          }}
        />
        {fileName ? (
          <span className="mt-3 text-xs text-muted-foreground">
            Loaded {fileName} · {rows.length} rows
          </span>
        ) : null}
      </label>

      {headers.length > 0 ? (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Match your columns</h2>
            {!hasId ? (
              <p className="text-xs text-destructive">
                Map one column to the ID field — it keeps repeat imports from duplicating rows.
              </p>
            ) : null}
            <div className="overflow-hidden rounded-md border bg-card">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b bg-muted/60 text-left">
                    <th className="px-2.5 py-2 font-medium">Column in your file</th>
                    <th className="px-2.5 py-2 font-medium">Goes to</th>
                    <th className="px-2.5 py-2 font-medium">Custom name</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((header) => (
                    <tr key={header} className="border-b last:border-0">
                      <td className="px-2.5 py-1.5">{header}</td>
                      <td className="px-2.5 py-1.5">
                        <select
                          className="h-8 w-56 rounded-md border border-input bg-background px-2"
                          value={mapping[header] ?? ""}
                          onChange={(e) =>
                            setMapping((prev) => ({ ...prev, [header]: e.target.value }))
                          }
                        >
                          <option value="">Skip this column</option>
                          {IMPORT_FIELDS.map((field) => (
                            <option key={field.key} value={field.key}>
                              {labelFor(data.fieldLabels, field.key)}
                            </option>
                          ))}
                          <option value={CUSTOM}>Extra field…</option>
                        </select>
                      </td>
                      <td className="px-2.5 py-1.5">
                        {mapping[header] === CUSTOM ? (
                          <Input
                            className="h-8 w-40 text-[13px]"
                            placeholder="e.g. renewal_risk"
                            value={customKeys[header] ?? ""}
                            onChange={(e) =>
                              setCustomKeys((prev) => ({ ...prev, [header]: e.target.value }))
                            }
                          />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Preview (first 5 rows)</h2>
            <div className="overflow-x-auto rounded-md border bg-card">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b bg-muted/60 text-left">
                    {mappedFields.length === 0 ? (
                      <th className="px-2.5 py-2 font-medium">Nothing mapped yet</th>
                    ) : null}
                    {headers
                      .filter((header) => mapping[header])
                      .map((header) => (
                        <th key={header} className="whitespace-nowrap px-2.5 py-2 font-medium">
                          {mapping[header] === CUSTOM
                            ? customKeys[header] || "extra field"
                            : labelFor(data.fieldLabels, mapping[header] ?? "")}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, index) => (
                    <tr key={index} className="border-b last:border-0">
                      {headers
                        .filter((header) => mapping[header])
                        .map((header) => (
                          <td key={header} className="max-w-48 truncate px-2.5 py-1.5">
                            {row[header] == null ? "—" : String(row[header])}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <Button disabled={!hasId || busy} onClick={confirmImport}>
            {busy ? "Importing…" : `Import ${rows.length} rows`}
          </Button>
        </>
      ) : null}
    </div>
  );
}

function autoMap(headers: string[]): Mapping {
  const mapping: Mapping = {};
  for (const header of headers) {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const match = IMPORT_FIELDS.find(
      (field) =>
        field.key === normalized ||
        field.fallbackLabel.toLowerCase() === header.toLowerCase() ||
        field.key.replace(/_/g, "") === normalized.replace(/_/g, ""),
    );
    if (match) mapping[header] = match.key;
  }
  return mapping;
}

function coerce(value: unknown, kind: string) {
  if (value == null || value === "") return null;
  if (kind === "number") {
    const numeric = Number(String(value).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(numeric) ? numeric : null;
  }
  if (kind === "boolean") {
    const text = String(value).trim().toLowerCase();
    return !["false", "0", "no", "closed", "n"].includes(text);
  }
  if (kind === "date") {
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }
  return String(value);
}
