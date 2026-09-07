import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/app-shell";
import { KanbanBoard } from "@/components/kanban-board";
import { StatsStrip } from "@/components/stats-strip";
import { pipelineQueryOptions } from "@/lib/use-pipeline";

export const Route = createFileRoute("/_authenticated/board")({
  head: () => ({
    meta: [
      { title: "Board · Pipeline Tracker" },
      { name: "description", content: "Lane-grouped view of every open sales opportunity." },
      { property: "og:title", content: "Board · Pipeline Tracker" },
      {
        property: "og:description",
        content: "Lane-grouped view of every open sales opportunity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BoardPage,
});

function BoardPage() {
  const { data } = useSuspenseQuery(pipelineQueryOptions());

  return (
    <AppShell>
      <StatsStrip data={data} />
      <KanbanBoard data={data} />
    </AppShell>
  );
}
