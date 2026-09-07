import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { OpportunityPanel } from "@/components/opportunity-panel";
import { setOpportunityLane } from "@/lib/pipeline.functions";
import {
  formatDate,
  formatMoney,
  type Lane,
  type Opportunity,
  type PipelineData,
} from "@/lib/pipeline-types";
import { laneOf, sum, useInvalidatePipeline } from "@/lib/use-pipeline";
import { cn } from "@/lib/utils";

export function KanbanBoard({ data }: { data: PipelineData }) {
  const move = useServerFn(setOpportunityLane);
  const invalidate = useInvalidatePipeline();
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  async function onDragEnd(event: DragEndEvent) {
    const laneId = event.over?.id;
    const opportunityId = event.active.id;
    if (typeof laneId !== "string" || typeof opportunityId !== "string") return;
    if (laneOf(data, opportunityId)?.id === laneId) return;
    try {
      await move({ data: { opportunityId, laneId } });
      await invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not move that card");
    }
  }

  if (data.opportunities.length === 0) {
    return (
      <p className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        No opportunities yet — head to Import data to load a spreadsheet export.
      </p>
    );
  }

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {data.lanes.map((lane) => (
            <LaneColumn
              key={lane.id}
              lane={lane}
              cards={data.opportunities.filter((o) => laneOf(data, o.id)?.id === lane.id)}
              onSelect={setSelected}
            />
          ))}
        </div>
      </DndContext>
      <OpportunityPanel data={data} opportunity={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function LaneColumn({
  lane,
  cards,
  onSelect,
}: {
  lane: Lane;
  cards: Opportunity[];
  onSelect: (opportunity: Opportunity) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: lane.id });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-64 shrink-0 flex-col rounded-md border bg-card",
        isOver && "border-primary bg-accent/40",
      )}
    >
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <span
          className="inline-block size-2 rounded-full"
          style={{ backgroundColor: lane.color }}
          aria-hidden
        />
        <h2 className="text-[13px] font-medium">{lane.label}</h2>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">{cards.length}</span>
      </header>
      <div className="px-2 pb-1 pt-2 text-[11px] text-muted-foreground">
        {formatMoney(sum(cards.map((c) => c.deal_value)))}
      </div>
      <div className="flex flex-col gap-2 p-2">
        {cards.map((card) => (
          <Card key={card.id} opportunity={card} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

function Card({
  opportunity,
  onSelect,
}: {
  opportunity: Opportunity;
  onSelect: (opportunity: Opportunity) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opportunity.id,
  });

  return (
    <article
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(opportunity)}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}}
      className={cn(
        "cursor-grab rounded border bg-background p-2 text-left",
        isDragging && "opacity-60",
      )}
    >
      <p className="text-[13px] font-medium leading-snug">{opportunity.name}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {opportunity.account_name ?? "—"}
      </p>
      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span className="font-medium tabular-nums">{formatMoney(opportunity.deal_value)}</span>
        <span className="text-muted-foreground">{formatDate(opportunity.close_date)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate">{opportunity.stage ?? "—"}</span>
        <span className="truncate">{opportunity.owner ?? ""}</span>
      </div>
    </article>
  );
}
