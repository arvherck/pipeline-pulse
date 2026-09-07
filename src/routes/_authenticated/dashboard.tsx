import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/app-shell";
import { StatsStrip } from "@/components/stats-strip";
import { TargetGrid } from "@/components/target-cards";
import { pipelineQueryOptions } from "@/lib/use-pipeline";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Pipeline Tracker" },
      {
        name: "description",
        content: "Pipeline totals, target progress and the trend of open value over time.",
      },
      { property: "og:title", content: "Dashboard · Pipeline Tracker" },
      {
        property: "og:description",
        content: "Pipeline totals, target progress and the trend of open value over time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data } = useSuspenseQuery(pipelineQueryOptions);

  return (
    <AppShell>
      <h1 className="text-lg font-semibold">Dashboard</h1>
      <StatsStrip data={data} />
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Target progress</h2>
        <TargetGrid data={data} />
      </section>
    </AppShell>
  );
}
