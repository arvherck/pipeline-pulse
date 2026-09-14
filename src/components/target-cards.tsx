import { formatMoney, labelFor, type PipelineData, type Target } from "@/lib/pipeline-types";
import { periodText, progressFor, targetTitle } from "@/lib/targets";
import { TargetTrendChart } from "@/components/target-trend-chart";
import { cn } from "@/lib/utils";

export function TargetCard({
  data,
  target,
  compact = false,
}: {
  data: PipelineData;
  target: Target;
  compact?: boolean;
}) {
  const { total, percent, remaining } = progressFor(data, target);
  const attained = remaining <= 0;

  return (
    <section className="tech-panel border-t-2 border-t-signal p-4">
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="truncate font-display text-sm font-bold uppercase">{targetTitle(target)}</h3>
        <span className={cn("data-value text-lg font-bold", attained ? "text-primary" : "text-signal")}>{percent}%</span>
      </header>
      <p className="truncate text-xs text-muted-foreground">
        {labelFor(data.fieldLabels, target.metric)} · {periodText(target)}
        {target.scope_field && target.scope_value
          ? ` · ${labelFor(data.fieldLabels, target.scope_field)}: ${target.scope_value}`
          : ""}
      </p>

      <div className="mt-3 h-1.5 w-full overflow-hidden bg-muted">
        <div
          className="h-full bg-primary transition-[width]"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-px bg-border text-xs">
        <div>
          <dt className="tech-label bg-card px-2 pt-2">So far</dt>
          <dd className="data-value bg-card px-2 pb-2 font-semibold">{formatMoney(total)}</dd>
        </div>
        <div>
          <dt className="tech-label bg-card px-2 pt-2">Target</dt>
          <dd className="data-value bg-card px-2 pb-2 font-semibold">{formatMoney(target.target_amount)}</dd>
        </div>
        <div>
          <dt className="tech-label bg-card px-2 pt-2">{attained ? "Over by" : "Remaining"}</dt>
          <dd className="data-value bg-card px-2 pb-2 font-semibold">{formatMoney(Math.abs(remaining))}</dd>
        </div>
      </dl>

      <div className="mt-3 border-t pt-3">
        <TargetTrendChart data={data} target={target} height={compact ? 120 : 200} />
      </div>
    </section>
  );
}

export function TargetGrid({ data }: { data: PipelineData }) {
  // Yearly sales/revenue targets have their own chart, so keep them out here.
  const targets = data.targets.filter((target) => target.kind !== "sales" && target.kind !== "revenue");
  if (targets.length === 0) {
    return (
      <div className="flex min-h-28 items-center justify-center border border-dashed border-primary/40 bg-card/60 p-6 text-center">
        <div><div className="tech-label text-primary">Target channel // empty</div><p className="mt-1 text-[13px] text-muted-foreground">No targets yet. Add one in Settings to track progress here.</p></div>
      </div>
    );
  }
  const compact = targets.length > 1;
  return (
    <div
      className={
        compact ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "grid gap-3 lg:max-w-2xl"
      }
    >
      {targets.map((target) => (
        <TargetCard key={target.id} data={data} target={target} compact={compact} />
      ))}
    </div>
  );
}
