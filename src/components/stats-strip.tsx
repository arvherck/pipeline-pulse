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
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(180px,1fr))_2fr]">
      <Stat index="01" label="Open opportunities" value={String(open.length)} accent="primary" />
      <Stat index="02" label={`${labelFor(data.fieldLabels, "deal_value")} (open)`} value={formatMoney(dealTotal)} accent="signal" />
      <Stat index="03"
        label={`${labelFor(data.fieldLabels, "weighted_value")} (open)`}
        value={formatMoney(weightedTotal)}
        accent="technical"
      />
      {target ? (
        <Stat
          index="04"
          label={`Target ${target.label || target.period}`}
          value={`${pct ?? 0}% of ${formatMoney(target.target_amount)}`}
          accent="primary"
        />
      ) : null}
      <div className="tech-panel flex min-h-20 flex-wrap items-center gap-x-5 gap-y-2 border-l-4 border-l-primary px-4 py-3 md:col-span-2 xl:col-span-1">
        <div className="tech-label w-full text-primary">Lane distribution</div>
        {perLane.map(({ lane, count }) => (
          <div key={lane.id} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: lane.color }}
              aria-hidden
            />
            <span className="text-muted-foreground">{lane.label}</span>
            <span className="data-value font-semibold">{String(count).padStart(2, "0")}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stat({ label, value, index, accent }: { label: string; value: string; index: string; accent: "primary" | "signal" | "technical" }) {
  const accentClass = {
    primary: "border-l-primary",
    signal: "border-l-signal",
    technical: "border-l-technical",
  }[accent];
  return (
    <div className={`tech-panel min-h-20 border-l-4 px-4 py-3 ${accentClass}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="tech-label">{label}</div>
        <span className="font-display text-[10px] font-bold text-muted-foreground">/{index}</span>
      </div>
      <div className="data-value mt-1 text-xl font-bold text-foreground">{value}</div>
    </div>
  );
}
