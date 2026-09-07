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
    <section className="rounded-md border bg-card p-3">
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="truncate text-sm font-semibold">{targetTitle(target)}</h3>
        <span className={cn("text-sm font-semibold", attained && "text-primary")}>{percent}%</span>
      </header>
      <p className="truncate text-xs text-muted-foreground">
        {labelFor(data.fieldLabels, target.metric)} · {periodText(target)}
        {target.scope_field && target.scope_value
          ? ` · ${labelFor(data.fieldLabels, target.scope_field)}: ${target.scope_value}`
          : ""}
      </p>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>

      <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">So far</dt>
          <dd className="font-medium tabular-nums">{formatMoney(total)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Target</dt>
          <dd className="font-medium tabular-nums">{formatMoney(target.target_amount)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{attained ? "Over by" : "Remaining"}</dt>
          <dd className="font-medium tabular-nums">{formatMoney(Math.abs(remaining))}</dd>
        </div>
      </dl>

      <div className="mt-2 border-t pt-2">
        <TargetTrendChart data={data} target={target} height={compact ? 120 : 200} />
      </div>
    </section>
  );
}

export function TargetGrid({ data }: { data: PipelineData }) {
  if (data.targets.length === 0) {
    return (
      <p className="rounded-md border bg-card p-4 text-[13px] text-muted-foreground">
        No targets yet. Add one in Settings to track progress here.
      </p>
    );
  }
  const compact = data.targets.length > 1;
  return (
    <div
      className={
        compact ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "grid gap-3 lg:max-w-2xl"
      }
    >
      {data.targets.map((target) => (
        <TargetCard key={target.id} data={data} target={target} compact={compact} />
      ))}
    </div>
  );
}
