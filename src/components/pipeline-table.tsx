import { Download } from "lucide-react";
import { useMemo, useState } from "react";

import { OpportunityPanel } from "@/components/opportunity-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { downloadCsv, toCsv, todayStamp } from "@/lib/csv";
import {
  TABLE_COLUMNS,
  formatDate,
  formatMoney,
  labelFor,
  type Opportunity,
  type PipelineData,
} from "@/lib/pipeline-types";
import { laneOf, uniqueValues } from "@/lib/use-pipeline";
import { cn } from "@/lib/utils";


type SortKey = keyof Opportunity & string;

export function PipelineTable({ data }: { data: PipelineData }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("");
  const [segment, setSegment] = useState("");
  const [laneId, setLaneId] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("close_date");
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Opportunity | null>(null);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = data.opportunities.filter((o) => {
      if (openOnly && !o.is_open) return false;
      if (category && o.category !== category) return false;
      if (region && o.region !== region) return false;
      if (segment && o.segment !== segment) return false;
      if (laneId && laneOf(data, o.id)?.id !== laneId) return false;
      if (!needle) return true;
      return [o.id, o.name, o.account_name, o.owner, o.stage, o.status_notes, o.comment]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });

    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
      const compared = String(av).localeCompare(String(bv));
      return sortAsc ? compared : -compared;
    });
  }, [data, search, category, region, segment, laneId, openOnly, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function exportCsv() {
    const header = [...TABLE_COLUMNS.map((key) => labelFor(data.fieldLabels, key)), "Lane"];

    const body = rows.map((row) => [
      ...TABLE_COLUMNS.map((key) => exportCell(row, key)),
      laneOf(data, row.id)?.label ?? "",
    ]);
    downloadCsv(`pipeline-${todayStamp()}.csv`, toCsv(header, body));
  }

  return (
    <div className="space-y-3">
      <div className="tech-panel grid grid-cols-2 gap-2 border-l-4 border-l-primary p-3 md:flex md:flex-wrap md:items-center">
        <Input
          className="col-span-2 h-8 text-[13px] md:w-56"
          placeholder="Search deals, clients, owners…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FilterSelect
          label={labelFor(data.fieldLabels, "category")}
          value={category}
          onChange={setCategory}
          options={uniqueValues(data.opportunities, "category")}
        />
        <FilterSelect
          label={labelFor(data.fieldLabels, "region")}
          value={region}
          onChange={setRegion}
          options={uniqueValues(data.opportunities, "region")}
        />
        <FilterSelect
          label={labelFor(data.fieldLabels, "segment")}
          value={segment}
          onChange={setSegment}
          options={uniqueValues(data.opportunities, "segment")}
        />
        <select
          className="h-8 min-w-0 rounded-md border border-input bg-card px-2 text-[13px]"
          value={laneId}
          onChange={(e) => setLaneId(e.target.value)}
          aria-label="Lane"
        >
          <option value="">All lanes</option>
          {data.lanes.map((lane) => (
            <option key={lane.id} value={lane.id}>
              {lane.label}
            </option>
          ))}
        </select>
        <div className="col-span-2 flex items-center gap-2 md:ml-auto">
          <Switch id="open-only" checked={openOnly} onCheckedChange={setOpenOnly} />
          <Label htmlFor="open-only" className="text-[13px] text-muted-foreground">
            Open only
          </Label>
          <span className="text-xs tabular-nums text-muted-foreground">{rows.length} rows</span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-8 shrink-0 md:ml-0"
            onClick={exportCsv}
            disabled={rows.length === 0}
          >
            <Download className="mr-1 size-3.5" aria-hidden />
            Export CSV
          </Button>
        </div>
      </div>


      <div className="tech-panel overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b-2 border-primary/30 bg-muted/70">
              {TABLE_COLUMNS.map((key) => (
                <th
                  key={key}
                  scope="col"
                  className="whitespace-nowrap px-2.5 py-2.5 text-left font-display text-[10px] font-bold uppercase text-muted-foreground"
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-primary"
                    onClick={() => toggleSort(key)}
                  >
                    {labelFor(data.fieldLabels, key)}
                      {sortKey === key ? <span className="text-primary" aria-hidden>{sortAsc ? "▲" : "▼"}</span> : null}
                  </button>
                </th>
              ))}
              <th scope="col" className="px-2.5 py-2 text-left font-display text-[10px] font-bold uppercase text-muted-foreground">
                Lane
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-b transition-colors last:border-0 hover:bg-accent/60"
                onClick={() => setSelected(row)}
              >
                {TABLE_COLUMNS.map((key) => (
                  <td
                    key={key}
                    className={cn(
                      "max-w-56 truncate px-2.5 py-1.5",
                      typeof row[key] === "number" && "tabular-nums",
                    )}
                  >
                    {renderCell(row, key)}
                  </td>
                ))}
                <td className="px-2.5 py-1.5 text-muted-foreground">
                  {laneOf(data, row.id)?.label ?? "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={TABLE_COLUMNS.length + 1}
                  className="px-2.5 py-6 text-center text-muted-foreground"
                >
                  Nothing matches those filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <OpportunityPanel data={data} opportunity={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function renderCell(row: Opportunity, key: keyof Opportunity & string) {
  const value = row[key];
  if (key === "deal_value" || key === "weighted_value") return formatMoney(value as number | null);
  if (key.includes("date")) return formatDate(value as string | null);
  if (key === "is_open") return row.is_open ? "Open" : "Closed";
  if (key === "probability") return value == null ? "—" : `${value}%`;
  if (value == null || value === "") return "—";
  return String(value);
}

/** Spreadsheet-friendly value: full numbers, ISO dates, empty for blanks. */
function exportCell(row: Opportunity, key: keyof Opportunity & string): string {
  const value = row[key];
  if (key === "is_open") return row.is_open ? "Open" : "Closed";
  if (value == null || value === "") return "";
  if (key.includes("date")) return String(value).slice(0, 10);
  return String(value);
}



function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      className="h-8 rounded-md border border-input bg-card px-2 text-[13px]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
    >
      <option value="">All {label.toLowerCase()}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
