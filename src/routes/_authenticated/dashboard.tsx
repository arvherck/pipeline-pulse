import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { NeedsAttention } from "@/components/needs-attention";
import { OpportunityPanel } from "@/components/opportunity-panel";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = data.opportunities.find((o) => o.id === selectedId) ?? null;

  return (
    <AppShell>
      <header className="flex items-end justify-between border-b pb-4">
        <div>
          <div className="tech-label mb-1 flex items-center gap-2 text-primary"><span className="size-1.5 bg-primary" />Command overview // live</div>
          <h1 className="font-display text-3xl font-bold uppercase text-foreground">Dashboard</h1>
        </div>
        <div className="hidden text-right md:block"><div className="tech-label">Workspace</div><div className="font-display text-sm font-semibold">Sales operations</div></div>
      </header>
      <StatsStrip data={data} />
      <section className="space-y-2">
        <div className="flex items-center gap-3"><h2 className="font-display text-sm font-bold uppercase">Target progress</h2><span className="h-px flex-1 bg-border" /><span className="tech-label">Forecast telemetry</span></div>
        <TargetGrid data={data} />
      </section>
      <NeedsAttention data={data} onOpen={setSelectedId} />
      <OpportunityPanel
        data={data}
        opportunity={selected}
        onClose={() => setSelectedId(null)}
      />
    </AppShell>
  );
}
