import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Settings2 } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { KanbanBoard } from "@/components/kanban-board";
import { ManageLanesPanel } from "@/components/manage-lanes-panel";
import { StatsStrip } from "@/components/stats-strip";
import { Button } from "@/components/ui/button";
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
  const { data } = useSuspenseQuery(pipelineQueryOptions);
  const [lanesOpen, setLanesOpen] = useState(false);

  return (
    <AppShell>
      <header className="flex items-end justify-between border-b pb-4">
        <div><div className="tech-label mb-1 text-primary">Flow control // live</div><h1 className="font-display text-3xl font-bold uppercase">Board</h1></div>
        <Button size="icon" variant="outline" aria-label="Manage lanes" title="Manage lanes" onClick={() => setLanesOpen(true)}><Settings2 /></Button>
      </header>
      <StatsStrip data={data} />
      <KanbanBoard data={data} />
      <ManageLanesPanel data={data} open={lanesOpen} onClose={() => setLanesOpen(false)} />
    </AppShell>
  );
}

