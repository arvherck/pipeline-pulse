import { formatMoney, labelFor, type PipelineData } from "@/lib/pipeline-types";
import { laneOf, sum } from "@/lib/use-pipeline";

export function StatsStrip({ data }: { data: PipelineData }) {
  const open = data.opportunities.filter((o) => o.is_open);
  const dealTotal = sum(open.map((o) => o.deal_value));
  const weightedTotal = sum(open.map((o) => o.weighted_value));

  const perLane = data.lanes.map((lane) => ({
    lane,
    count: data.opportunities.filter((o) => laneOf(data, o.id)?.id === lane.id).length,
  }));

  const target = data.targets[0];
  const achieved = target
    ? target.metric === "weighted_value"
      ? weightedTotal
      : dealTotal
    : 0;
  const pct =
    target && target.target_amount > 0 ? Math.round((achieved / target.target_amount) * 100) : null;

  return (
    <div className="flex flex-wrap items-stretch gap-px overflow-hidden rounded-md border bg-border">
      <Stat label="Open opportunities" value={String(open.length)} />
      <Stat label={`${labelFor(data.fieldLabels, "deal_value")} (open)`} value={formatMoney(dealTotal)} />
      <Stat
        label={`${labelFor(data.fieldLabels, "weighted_value")} (open)`}
        value={formatMoney(weightedTotal)}
      />
      {target ? (
        <Stat
          label={`Target ${target.label || target.period}`}
          value={`${pct ?? 0}% of ${formatMoney(target.target_amount)}`}
        />
      ) : null}
      <div className="flex flex-1 flex-wrap items-center gap-4 bg-card px-4 py-2.5">
        {perLane.map(({ lane, count }) => (
          <div key={lane.id} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: lane.color }}
              aria-hidden
            />
            <span className="text-muted-foreground">{lane.label}</span>
            <span className="font-medium tabular-nums">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[150px] bg-card px-4 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}
