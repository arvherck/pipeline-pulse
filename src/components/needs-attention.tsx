import { useMemo } from "react";

import { formatDate, formatMoney, type PipelineData } from "@/lib/pipeline-types";
import { actionRollups, isActionOpen, isActionOverdue, laneOf } from "@/lib/use-pipeline";

/**
 * Three short lists that answer "what should I chase today?" — overdue
 * follow-ups, open deals nobody has an action on, and the biggest open deals
 * with no due date in sight.
 */
export function NeedsAttention({
  data,
  onOpen,
}: {
  data: PipelineData;
  onOpen: (opportunityId: string) => void;
}) {
  const rollups = useMemo(() => actionRollups(data), [data]);

  const overdue = useMemo(
    () =>
      data.actions
        .filter((action) => isActionOverdue(action))
        .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
        .slice(0, 6),
    [data.actions],
  );

  const noAction = useMemo(
    () =>
      data.opportunities
        .filter((o) => o.is_open && (rollups.get(o.id)?.open ?? 0) === 0)
        .sort((a, b) => (b.deal_value ?? 0) - (a.deal_value ?? 0))
        .slice(0, 6),
    [data.opportunities, rollups],
  );

  const dueSoon = useMemo(
    () =>
      data.actions
        .filter((action) => isActionOpen(action) && !isActionOverdue(action) && action.due_date)
        .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
        .slice(0, 6),
    [data.actions],
  );

  const nameOf = (id: string) => data.opportunities.find((o) => o.id === id)?.name ?? id;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-sm font-bold uppercase">Needs attention</h2>
        <span className="h-px flex-1 bg-border" />
        <span className="tech-label">Daily triage</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Panel title="Overdue follow-ups" count={overdue.length} tone="alert">
          {overdue.length === 0 ? (
            <Empty text="Nothing overdue." />
          ) : (
            overdue.map((action) => (
              <Row
                key={action.id}
                onClick={() => onOpen(action.opportunity_id)}
                primary={action.text}
                secondary={`${nameOf(action.opportunity_id)} · due ${formatDate(action.due_date)}${
                  action.owner ? ` · ${action.owner}` : ""
                }`}
                alert
              />
            ))
          )}
        </Panel>

        <Panel title="Open deals with no action" count={noAction.length}>
          {noAction.length === 0 ? (
            <Empty text="Every open deal has a next step." />
          ) : (
            noAction.map((row) => (
              <Row
                key={row.id}
                onClick={() => onOpen(row.id)}
                primary={row.name}
                secondary={`${formatMoney(row.deal_value)} · ${laneOf(data, row.id)?.label ?? "—"}`}
              />
            ))
          )}
        </Panel>

        <Panel title="Coming up" count={dueSoon.length}>
          {dueSoon.length === 0 ? (
            <Empty text="No dated follow-ups yet." />
          ) : (
            dueSoon.map((action) => (
              <Row
                key={action.id}
                onClick={() => onOpen(action.opportunity_id)}
                primary={action.text}
                secondary={`${nameOf(action.opportunity_id)} · due ${formatDate(action.due_date)}`}
              />
            ))
          )}
        </Panel>
      </div>
    </section>
  );
}

function Panel({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone?: "alert";
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        tone === "alert"
          ? "tech-panel border-l-4 border-l-destructive p-3"
          : "tech-panel border-l-4 border-l-primary/40 p-3"
      }
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-xs font-bold uppercase">{title}</h3>
        <span className="data-value bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
          {String(count).padStart(2, "0")}
        </span>
      </div>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <li className="text-[13px] text-muted-foreground">{text}</li>;
}

function Row({
  primary,
  secondary,
  alert,
  onClick,
}: {
  primary: string;
  secondary: string;
  alert?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full border border-transparent px-1 py-1 text-left transition-colors hover:border-primary/40 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={
            alert ? "block text-[13px] font-semibold text-destructive" : "block text-[13px]"
          }
        >
          {primary}
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">{secondary}</span>
      </button>
    </li>
  );
}
