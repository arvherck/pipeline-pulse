import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/app-shell";
import { PipelineTable } from "@/components/pipeline-table";
import { StatsStrip } from "@/components/stats-strip";
import { pipelineQueryOptions } from "@/lib/use-pipeline";

export const Route = createFileRoute("/_authenticated/table")({
  head: () => ({
    meta: [
      { title: "Table · Pipeline Tracker" },
      {
        name: "description",
        content: "Sortable, filterable table of every opportunity in the pipeline.",
      },
      { property: "og:title", content: "Table · Pipeline Tracker" },
      {
        property: "og:description",
        content: "Sortable, filterable table of every opportunity in the pipeline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TablePage,
});

function TablePage() {
  const { data } = useSuspenseQuery(pipelineQueryOptions);

  return (
    <AppShell>
      <header className="border-b pb-4"><div className="tech-label mb-1 text-primary">Record matrix // query ready</div><h1 className="font-display text-3xl font-bold uppercase">Table</h1></header>
      <StatsStrip data={data} />
      <PipelineTable data={data} />
    </AppShell>
  );
}
