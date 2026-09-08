import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { ActionBadge, priorityClass } from "@/components/action-list";
import { AppShell } from "@/components/app-shell";
import { OpportunityPanel } from "@/components/opportunity-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ACTION_PRIORITIES,
  ACTION_STATUSES,
  formatDate,
  type Opportunity,
} from "@/lib/pipeline-types";
import {
  isActionOpen,
  isActionOverdue,
  pipelineQueryOptions,
  todayIso,
} from "@/lib/use-pipeline";
import { cn } from "@/lib/utils";
import { exportWorkbook } from "@/lib/xlsx-export";

export const Route = createFileRoute("/_authenticated/actions")({
  head: () => ({
    meta: [
      { title: "Actions · Pipeline Tracker" },
      {
        name: "description",
        content: "Every follow-up action across the pipeline, with owner, due date and priority.",
      },
      { property: "og:title", content: "Actions · Pipeline Tracker" },
      {
        property: "og:description",
        content: "Every follow-up action across the pipeline, with owner, due date and priority.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActionsPage,
});

function ActionsPage() {
  const { data } = useSuspenseQuery(pipelineQueryOptions);
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [hideDone, setHideDone] = useState(true);
  const [selected, setSelected] = useState<Opportunity | null>(null);

  const owners = useMemo(() => {
    const set = new Set<string>();
    for (const action of data.actions) if (action.owner?.trim()) set.add(action.owner);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [data.actions]);

  const rows = useMemo(() => {
    const today = todayIso();
    const needle = search.trim().toLowerCase();
    const deals = new Map(data.opportunities.map((o) => [o.id, o]));
    return data.actions
      .filter((action) => {
        if (hideDone && !isActionOpen(action)) return false;
        if (owner && (action.owner ?? "") !== owner) return false;
        if (status && action.status !== status) return false;
        if (priority && action.priority !== priority) return false;
        if (overdueOnly && !isActionOverdue(action, today)) return false;
        if (!needle) return true;
        const deal = deals.get(action.opportunity_id);
        return [action.text, action.owner, action.notes, deal?.name, deal?.account_name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      })
      .map((action) => ({ action, deal: deals.get(action.opportunity_id) ?? null }))
      .sort((a, b) => {
        const av = a.action.due_date ?? "9999-12-31";
        const bv = b.action.due_date ?? "9999-12-31";
        return av.localeCompare(bv);
      });
  }, [data, search, owner, status, priority, overdueOnly, hideDone]);

  const overdueCount = data.actions.filter((a) => isActionOverdue(a)).length;

  return (
    <AppShell>
      <header className="flex items-end justify-between border-b pb-4">
        <div>
          <div className="tech-label mb-1 text-primary">Task control // live</div>
          <h1 className="font-display text-3xl font-bold uppercase">Actions</h1>
        </div>
        <div className="flex items-end gap-4">
          <Button size="sm" variant="outline" onClick={() => exportWorkbook(data)}>
            Export Excel
          </Button>
          <div className="text-right">
            <div className="tech-label">Overdue</div>
            <div
              className={cn(
                "data-value font-display text-2xl font-bold",
                overdueCount > 0 ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {String(overdueCount).padStart(2, "0")}
            </div>
          </div>
        </div>

      </header>

      <div className="tech-panel grid grid-cols-2 gap-2 border-l-4 border-l-primary p-3 md:flex md:flex-wrap md:items-center">
        <Input
          className="col-span-2 h-8 text-[13px] md:w-56"
          placeholder="Search actions, deals, owners…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="h-8 min-w-0 rounded-md border border-input bg-card px-2 text-[13px]"
          aria-label="Owner"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        >
          <option value="">All owners</option>
          {owners.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="h-8 min-w-0 rounded-md border border-input bg-card px-2 text-[13px]"
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {ACTION_STATUSES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="h-8 min-w-0 rounded-md border border-input bg-card px-2 text-[13px]"
          aria-label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">All priorities</option>
          {ACTION_PRIORITIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-2 md:ml-auto">
          <div className="flex items-center gap-2">
            <Switch id="overdue-only" checked={overdueOnly} onCheckedChange={setOverdueOnly} />
            <Label htmlFor="overdue-only" className="text-[13px] text-muted-foreground">
              Overdue only
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="hide-done" checked={hideDone} onCheckedChange={setHideDone} />
            <Label htmlFor="hide-done" className="text-[13px] text-muted-foreground">
              Hide completed
            </Label>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{rows.length} actions</span>
        </div>
      </div>

      <div className="tech-panel overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b-2 border-primary/30 bg-muted/70">
              {["Action", "Opportunity", "Owner", "Due", "Priority", "Status"].map((head) => (
                <th
                  key={head}
                  scope="col"
                  className="whitespace-nowrap px-2.5 py-2.5 text-left font-display text-[10px] font-bold uppercase text-muted-foreground"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ action, deal }) => (
              <tr
                key={action.id}
                className="cursor-pointer border-b transition-colors last:border-0 hover:bg-accent/60"
                onClick={() => deal && setSelected(deal)}
              >
                <td className="max-w-72 px-2.5 py-1.5">
                  <span className={!isActionOpen(action) ? "text-muted-foreground line-through" : ""}>
                    {action.text}
                  </span>
                  {action.notes ? (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {action.notes}
                    </span>
                  ) : null}
                </td>
                <td className="max-w-56 truncate px-2.5 py-1.5">
                  {deal?.name ?? action.opportunity_id}
                </td>
                <td className="px-2.5 py-1.5 text-muted-foreground">{action.owner ?? "—"}</td>
                <td
                  className={cn(
                    "whitespace-nowrap px-2.5 py-1.5",
                    isActionOverdue(action) ? "font-semibold text-destructive" : "text-muted-foreground",
                  )}
                >
                  {formatDate(action.due_date)}
                </td>
                <td className="px-2.5 py-1.5">
                  <ActionBadge text={action.priority} className={priorityClass(action.priority)} />
                </td>
                <td className="px-2.5 py-1.5 text-muted-foreground">{action.status}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2.5 py-6 text-center text-muted-foreground">
                  Nothing matches those filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <OpportunityPanel data={data} opportunity={selected} onClose={() => setSelected(null)} />
    </AppShell>
  );
}
