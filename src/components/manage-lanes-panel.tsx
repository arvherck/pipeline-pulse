import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { deleteLane, saveLane } from "@/lib/pipeline.functions";
import type { Lane, PipelineData } from "@/lib/pipeline-types";
import { laneOf, useInvalidatePipeline } from "@/lib/use-pipeline";

export function ManageLanesPanel({
  data,
  open,
  onClose,
}: {
  data: PipelineData;
  open: boolean;
  onClose: () => void;
}) {
  const save = useServerFn(saveLane);
  const remove = useServerFn(deleteLane);
  const invalidate = useInvalidatePipeline();
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#64748b");
  const [pendingDelete, setPendingDelete] = useState<Lane | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const [busy, setBusy] = useState(false);

  const lanes = data.lanes;

  function countFor(laneId: string) {
    return data.opportunities.filter((o) => laneOf(data, o.id)?.id === laneId).length;
  }

  async function run(work: () => Promise<unknown>, failure: string) {
    setBusy(true);
    try {
      await work();
      await invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failure);
    } finally {
      setBusy(false);
    }
  }

  function update(lane: Lane, patch: Partial<Lane>) {
    const next = { ...lane, ...patch };
    return save({
      data: {
        id: next.id,
        label: next.label,
        position: next.position,
        color: next.color,
        isDefault: next.is_default,
      },
    });
  }

  function startDelete(lane: Lane) {
    if (lanes.length <= 1) {
      toast.error("You need at least one stage on the board");
      return;
    }
    setPendingDelete(lane);
    setMoveTo(lanes.find((l) => l.id !== lane.id)?.id ?? "");
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setPendingDelete(null);
          onClose();
        }
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <div className="tech-label text-primary">Board configuration</div>
          <SheetTitle className="text-sm">Manage stages</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          <p className="text-xs text-muted-foreground">
            Each column is a stage. Renaming one renames the stage on its deals; deleting one moves its deals to a stage you pick.
          </p>

          <ul className="space-y-1.5">
            {lanes.map((lane, index) => (
              <li key={lane.id} className="space-y-1.5">
                 <div className="tech-panel flex items-center gap-1.5 p-2">
                  <input
                    type="color"
                    className="size-7 shrink-0 rounded border bg-background"
                    value={lane.color}
                    aria-label={`Colour for ${lane.label}`}
                    onChange={(e) =>
                      run(() => update(lane, { color: e.target.value }), "Could not save the colour")
                    }
                  />
                  <Input
                    className="h-8 text-[13px]"
                    defaultValue={lane.label}
                    aria-label={`Name for ${lane.label}`}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (!value || value === lane.label) return;
                      void run(() => update(lane, { label: value }), "Could not rename the stage");
                    }}
                  />
                  <span className="w-6 shrink-0 text-center text-[11px] tabular-nums text-muted-foreground">
                    {countFor(lane.id)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="px-2"
                    disabled={busy || index === 0}
                    aria-label={`Move ${lane.label} up`}
                    onClick={() => {
                      const above = lanes[index - 1];
                      if (!above) return;
                      void run(async () => {
                        await update(lane, { position: above.position });
                        await update(above, { position: lane.position });
                      }, "Could not reorder stages");
                    }}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="px-2"
                    disabled={busy || index === lanes.length - 1}
                    aria-label={`Move ${lane.label} down`}
                    onClick={() => {
                      const below = lanes[index + 1];
                      if (!below) return;
                      void run(async () => {
                        await update(lane, { position: below.position });
                        await update(below, { position: lane.position });
                      }, "Could not reorder stages");
                    }}
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant={lane.is_default ? "secondary" : "ghost"}
                    className="px-2 text-[11px]"
                    disabled={busy || lane.is_default}
                    onClick={() =>
                      run(() => update(lane, { is_default: true }), "Could not set the default stage")
                    }
                  >
                    {lane.is_default ? "Default" : "Set default"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="px-2"
                    disabled={busy}
                    aria-label={`Delete ${lane.label}`}
                    onClick={() => startDelete(lane)}
                  >
                    ✕
                  </Button>
                </div>

                {pendingDelete?.id === lane.id && (
                   <div className="space-y-2 border border-destructive/30 bg-destructive/5 p-2.5">
                    <p className="text-xs">
                      Delete “{lane.label}”. Move its {countFor(lane.id)} deal
                      {countFor(lane.id) === 1 ? "" : "s"} to:
                    </p>
                    <select
                      className="h-8 w-full rounded-md border bg-background px-2 text-[13px]"
                      value={moveTo}
                      aria-label="Move deals to stage"
                      onChange={(e) => setMoveTo(e.target.value)}
                    >
                      {lanes
                        .filter((l) => l.id !== lane.id)
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.label}
                          </option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy || !moveTo}
                        onClick={() =>
                          run(async () => {
                            await remove({ data: { id: lane.id, reassignToLaneId: moveTo } });
                            setPendingDelete(null);
                          }, "Could not delete the stage")
                        }
                      >
                        Move &amp; delete
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPendingDelete(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="flex gap-2 border-t pt-3">
            <input
              type="color"
              className="size-8 shrink-0 rounded border bg-background"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              aria-label="New stage colour"
            />
            <Input
              className="h-8 text-[13px]"
              placeholder="New stage name"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <Button
              size="sm"
              disabled={busy || !newLabel.trim()}
              onClick={() =>
                run(async () => {
                  await save({
                    data: {
                      label: newLabel.trim(),
                      position: lanes.length,
                      color: newColor,
                      isDefault: false,
                    },
                  });
                  setNewLabel("");
                }, "Could not add the stage")
              }
            >
              Add
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
