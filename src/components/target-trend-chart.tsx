import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney, type PipelineData, type Target } from "@/lib/pipeline-types";
import { seriesFor } from "@/lib/targets";

/** Recorded open-pipeline totals over time, against the target line. */
export function TargetTrendChart({
  data,
  target,
  height = 200,
}: {
  data: PipelineData;
  target: Target;
  height?: number;
}) {
  const points = seriesFor(data, target).map((snapshot) => ({
    date: snapshot.taken_on.slice(5),
    total: Number(snapshot.total),
  }));

  if (points.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        No history yet — it builds up each time you import or edit a deal.
      </p>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            stroke="hsl(var(--border))"
            width={64}
            tickFormatter={(value: number) => formatMoney(value)}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
            formatter={(value: number) => [formatMoney(value), "Open pipeline"]}
          />
          <ReferenceLine
            y={Number(target.target_amount)}
            stroke="hsl(var(--primary))"
            strokeDasharray="4 4"
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={points.length < 30}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
