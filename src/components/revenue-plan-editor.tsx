import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { monthLabel } from "@/lib/fiscal";
import { formatMoney, type Opportunity, type PipelineData } from "@/lib/pipeline-types";
import {
  defaultRevenuePlan,
  forecastValue,
  planTotal,
  revenueByMonth,
} from "@/lib/revenue-forecast";
import { resetRevenuePlan, saveRevenuePlan } from "@/lib/pipeline.functions";
import { useInvalidatePipeline } from "@/lib/use-pipeline";

/** Month-by-month revenue split for one deal, editable per month. */
export function RevenuePlanEditor({
  data,
  opportunity,
}: {
  data: PipelineData;
  opportunity: Opportunity;
}) {
  const save = useServerFn(saveRevenuePlan);
  const reset = useServerFn(resetRevenuePlan);
  const invalidate = useInvalidatePipeline();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const hasPlan = data.revenuePlans.some((plan) => plan.opportunity_id === opportunity.id);
  const rows = useMemo(() => {
    const current = revenueByMonth(opportunity, data.revenuePlans);
    const months = current.size > 0 ? [...current.keys()].sort() : defaultRevenuePlan(opportunity).map((e) => e.month);
    return months.map((month) => ({ month, amount: current.get(month) ?? 0 }));
  }, [opportunity, data.revenuePlans]);

  const values = rows.map((row) => ({
    month: row.month,
    amount: edits[row.month] === undefined ? row.amount : Number(edits[row.month]) || 0,
  }));
  const total = planTotal(values);
  const expected = forecastValue(opportunity);
  const dirty = Object.keys(edits).length > 0;

  if (rows.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Add contract start and end dates (or a close date) to plan revenue by month.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground">
        {hasPlan
          ? "Using your own monthly amounts."
          : "Spread evenly over the contract months, weighted by probability."}
      </p>

      <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
        {values.map((row) => (
          <div key={row.month} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">
              {monthLabel(row.month)}
            </span>
            <Input
              className="h-8 text-[13px]"
              inputMode="decimal"
              aria-label={`Revenue for ${monthLabel(row.month)}`}
              value={edits[row.month] ?? String(Math.round(row.amount))}
              onChange={(e) =>
                setEdits((prev) => ({ ...prev, [row.month]: e.target.value.replace(/[^0-9.-]/g, "") }))
              }
            />
          </div>
        ))}
      </div>

      <dl className="grid grid-cols-2 gap-px bg-border text-xs">
        <div>
          <dt className="tech-label bg-card px-2 pt-2">Plan total</dt>
          <dd className="data-value bg-card px-2 pb-2 font-semibold">{formatMoney(total)}</dd>
        </div>
        <div>
          <dt className="tech-label bg-card px-2 pt-2">Forecast value</dt>
          <dd className="data-value bg-card px-2 pb-2 font-semibold">{formatMoney(expected)}</dd>
        </div>
      </dl>
      {Math.abs(total - expected) > 1 ? (
        <p className="rounded-sm border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-400">
          The monthly amounts add up to {formatMoney(total)}, not {formatMoney(expected)}.
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={saving || !dirty}
          onClick={async () => {
            setSaving(true);
            try {
              await save({ data: { opportunityId: opportunity.id, months: values } });
              setEdits({});
              await invalidate();
              toast.success("Revenue plan saved");
            } finally {
              setSaving(false);
            }
          }}
        >
          Save plan
        </Button>
        {hasPlan || dirty ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await reset({ data: { opportunityId: opportunity.id } });
                setEdits({});
                await invalidate();
                toast.success("Back to an even spread");
              } finally {
                setSaving(false);
              }
            }}
          >
            Reset to even spread
          </Button>
        ) : null}
      </div>
    </div>
  );
}
