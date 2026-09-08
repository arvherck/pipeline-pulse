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
import { setOpportunityStage } from "@/lib/pipeline.functions";
import {
  formatDate,
  formatMoney,
  type Lane,
  type Opportunity,
  type PipelineData,
} from "@/lib/pipeline-types";
import { actionRollups, laneOf, sum, useInvalidatePipeline, type ActionRollup } from "@/lib/use-pipeline";
import { exportWorkbook } from "@/lib/xlsx-export";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function KanbanBoard({ data }: { data: PipelineData }) {
  const move = useServerFn(setOpportunityStage);
  const invalidate = useInvalidatePipeline();
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [creating, setCreating] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const rollups = actionRollups(data);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  /** Columns are stages, so moving a card changes the deal's stage. */
  async function moveTo(opportunityId: string, laneId: string) {
    if (laneOf(data, opportunityId)?.id === laneId) return;
    const stage = data.lanes.find((l) => l.id === laneId)?.stage_value;
    if (!stage) {
      toast.error("That column isn't linked to a stage yet");
      return;
    }
    try {
      await move({ data: { opportunityId, stage } });
      await invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not move that card");
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    const laneId = event.over?.id;
    const opportunityId = event.active.id;
    if (typeof laneId !== "string" || typeof opportunityId !== "string") return;
    await moveTo(opportunityId, laneId);
  }

  /** Alt + Left/Right shifts a focused card to the neighbouring stage. */
  async function shiftLane(opportunity: Opportunity, direction: -1 | 1) {
    const current = laneOf(data, opportunity.id);
    const index = data.lanes.findIndex((l) => l.id === current?.id);
    const next = data.lanes[(index < 0 ? 0 : index) + direction];
    if (!next) {
      setAnnouncement(`${opportunity.name} is already in the ${direction === 1 ? "last" : "first"} stage`);
      return;
    }
    setAnnouncement(`${opportunity.name} moved to ${next.label}`);
    await moveTo(opportunity.id, next.id);
  }


  const panel = (
    <OpportunityPanel
      data={data}
      opportunity={selected}
      creating={creating}
      onClose={() => {
        setSelected(null);
        setCreating(false);
      }}
    />
  );

  const newButton = (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => exportWorkbook(data)}>
        Export Excel
      </Button>
      <Button size="sm" onClick={() => setCreating(true)}>
        New opportunity
      </Button>
    </div>
  );


  if (data.opportunities.length === 0) {
    return (
      <>
        <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
          <p>No opportunities yet — import a spreadsheet, or add one by hand.</p>
          <div className="mt-3">{newButton}</div>
        </div>
        {panel}
      </>
    );
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="tech-label border-l-2 border-primary pl-2">
          Key controls // Tab selects · Alt + ← / → moves · Enter opens
        </p>
        {newButton}
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-3">
          {data.lanes.map((lane) => (
            <LaneColumn
              key={lane.id}
              lane={lane}
              cards={data.opportunities.filter((o) => laneOf(data, o.id)?.id === lane.id)}
              rollups={rollups}
              onSelect={setSelected}
              onShift={shiftLane}
            />
          ))}
        </div>
      </DndContext>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
      {panel}
    </>
  );
}

function LaneColumn({
  lane,
  cards,
  rollups,
  onSelect,
  onShift,
}: {
  lane: Lane;
  cards: Opportunity[];
  rollups: Map<string, ActionRollup>;
  onSelect: (opportunity: Opportunity) => void;
  onShift: (opportunity: Opportunity, direction: -1 | 1) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: lane.id });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "tech-panel flex w-64 shrink-0 flex-col border-t-2 bg-card md:w-72",
        isOver && "border-primary bg-accent/50",
      )}
    >
      <header className="relative flex items-center gap-2 border-b border-l-4 px-3 py-2.5" style={{ borderLeftColor: lane.color }}>
        <span
          className="inline-block size-2 shrink-0 rounded-full"
          style={{ backgroundColor: lane.color }}
          aria-hidden
        />
        <h2 className="truncate font-display text-xs font-bold uppercase">{lane.label}</h2>
        <span className="data-value ml-auto bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{String(cards.length).padStart(2, "0")}</span>
      </header>
      <div className="data-value border-b px-3 py-2 text-xs font-semibold text-muted-foreground">
        {formatMoney(sum(cards.map((c) => c.deal_value)))}
      </div>
      <div className="flex flex-col gap-2 p-2">
        {cards.map((card) => (
          <Card
            key={card.id}
            opportunity={card}
            rollup={rollups.get(card.id) ?? null}
            onSelect={onSelect}
            onShift={onShift}
          />
        ))}
      </div>
    </section>
  );
}

function Card({
  opportunity,
  rollup,
  onSelect,
  onShift,
}: {
  opportunity: Opportunity;
  rollup: ActionRollup | null;
  onSelect: (opportunity: Opportunity) => void;
  onShift: (opportunity: Opportunity, direction: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opportunity.id,
  });

  return (
    <article
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      aria-label={`${opportunity.name}. Alt plus arrow keys move between lanes.`}
      onClick={() => onSelect(opportunity)}
      onKeyDown={(event) => {
        if (event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
          event.preventDefault();
          onShift(opportunity, event.key === "ArrowRight" ? 1 : -1);
          return;
        }
        if (event.key === "Enter" && !event.altKey) {
          event.preventDefault();
          onSelect(opportunity);
        }
      }}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}}
      className={cn(
        "group relative cursor-grab border bg-background p-3 text-left transition-[border-color,transform,box-shadow] after:absolute after:bottom-0 after:right-0 after:size-2 after:border-b after:border-r after:border-border hover:-translate-y-0.5 hover:border-primary hover:shadow-sm hover:after:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDragging && "opacity-60 shadow-md",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2"><span className="tech-label text-primary">{opportunity.id}</span><span className="tech-label">{opportunity.probability == null ? "--" : `${opportunity.probability}%`}</span></div>
      <p className="font-display text-sm font-bold leading-snug transition-colors group-hover:text-primary">{opportunity.name}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {opportunity.account_name ?? "—"}
      </p>
      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span className="data-value font-bold">{formatMoney(opportunity.deal_value)}</span>
        <span className="text-muted-foreground">{formatDate(opportunity.close_date)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate">{opportunity.stage ?? "—"}</span>
        <span className="truncate">{opportunity.owner ?? ""}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px]">
        {rollup && rollup.open > 0 ? (
          <span className="border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-primary">
            {rollup.open} open action{rollup.open === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="border border-border px-1.5 py-0.5 uppercase tracking-wide text-muted-foreground">
            No actions
          </span>
        )}
        {rollup && rollup.overdue > 0 ? (
          <span className="border border-destructive/50 bg-destructive/10 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-destructive">
            {rollup.overdue} overdue
          </span>
        ) : null}
        {rollup?.nextDue && rollup.overdue === 0 ? (
          <span className="text-muted-foreground">next {formatDate(rollup.nextDue)}</span>
        ) : null}
      </div>
    </article>
  );
}

