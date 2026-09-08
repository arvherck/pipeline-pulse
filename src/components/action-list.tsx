import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addAction, deleteAction, updateAction } from "@/lib/pipeline.functions";
import {
  ACTION_PRIORITIES,
  ACTION_STATUSES,
  formatDate,
  type Action,
} from "@/lib/pipeline-types";
import { isActionOverdue, useInvalidatePipeline } from "@/lib/use-pipeline";
import { cn } from "@/lib/utils";

export function priorityClass(priority: string): string {
  if (priority === "High") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (priority === "Low") return "border-border bg-muted text-muted-foreground";
  return "border-primary/40 bg-primary/10 text-primary";
}

export function ActionBadge({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        className,
      )}
    >
      {text}
    </span>
  );
}

/** Follow-up actions for one opportunity: add, edit in place, remove. */
export function ActionList({
  opportunityId,
  actions,
}: {
  opportunityId: string;
  actions: Action[];
}) {
  const invalidate = useInvalidatePipeline();
  const create = useServerFn(addAction);
  const save = useServerFn(updateAction);
  const remove = useServerFn(deleteAction);

  const [text, setText] = useState("");
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<string>("Medium");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(work: () => Promise<unknown>, message?: string) {
    setBusy(true);
    try {
      await work();
      await invalidate();
      if (message) toast.success(message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save that action");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Follow-up actions
      </h3>

      <ul className="space-y-2">
        {actions.length === 0 ? (
          <li className="text-[13px] text-muted-foreground">No actions yet.</li>
        ) : null}
        {actions.map((action) => (
          <li
            key={action.id}
            className={cn(
              "tech-panel space-y-2 p-2.5",
              isActionOverdue(action) && "border-l-2 border-l-destructive",
            )}
          >
            <div className="flex items-start gap-2">
              <Input
                className={cn(
                  "h-8 flex-1 text-[13px]",
                  action.status === "Done" && "text-muted-foreground line-through",
                )}
                defaultValue={action.text}
                aria-label="Action"
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (!next || next === action.text) return;
                  void run(() => save({ data: { id: action.id, text: next } }));
                }}
              />
              <button
                type="button"
                className="shrink-0 px-1 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => void run(() => remove({ data: { id: action.id } }), "Action removed")}
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Input
                className="h-8 text-[13px]"
                placeholder="Owner"
                aria-label="Owner"
                defaultValue={action.owner ?? ""}
                onBlur={(e) => {
                  if (e.target.value === (action.owner ?? "")) return;
                  void run(() => save({ data: { id: action.id, owner: e.target.value } }));
                }}
              />
              <Input
                className="h-8 text-[13px]"
                type="date"
                aria-label="Due date"
                defaultValue={action.due_date ?? ""}
                onChange={(e) => {
                  void run(() => save({ data: { id: action.id, dueDate: e.target.value } }));
                }}
              />
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-[13px]"
                aria-label="Priority"
                value={action.priority}
                disabled={busy}
                onChange={(e) =>
                  void run(() => save({ data: { id: action.id, priority: e.target.value as never } }))
                }
              >
                {ACTION_PRIORITIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-[13px]"
                aria-label="Status"
                value={action.status}
                disabled={busy}
                onChange={(e) =>
                  void run(() => save({ data: { id: action.id, status: e.target.value as never } }))
                }
              >
                {ACTION_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <Textarea
              className="min-h-14 text-[13px]"
              placeholder="Notes"
              aria-label="Action notes"
              defaultValue={action.notes ?? ""}
              onBlur={(e) => {
                if (e.target.value === (action.notes ?? "")) return;
                void run(() => save({ data: { id: action.id, notes: e.target.value } }));
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              {isActionOverdue(action)
                ? `Overdue since ${formatDate(action.due_date)}`
                : action.due_date
                  ? `Due ${formatDate(action.due_date)}`
                  : "No due date"}
            </p>
          </li>
        ))}
      </ul>

      <div className="tech-panel space-y-2 border-l-2 border-l-primary p-2.5">
        <p className="tech-label text-primary">New action</p>
        <Input
          className="h-8 text-[13px]"
          placeholder="What needs to happen?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Input
            className="h-8 text-[13px]"
            placeholder="Owner"
            aria-label="New action owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
          <Input
            className="h-8 text-[13px]"
            type="date"
            aria-label="New action due date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-[13px]"
            aria-label="New action priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {ACTION_PRIORITIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <Textarea
          className="min-h-14 text-[13px]"
          placeholder="Notes (optional)"
          aria-label="New action notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button
          size="sm"
          disabled={!text.trim() || busy}
          onClick={() =>
            void run(async () => {
              await create({
                data: {
                  opportunityId,
                  text: text.trim(),
                  owner,
                  dueDate: due,
                  priority: priority as never,
                  status: "Open",
                  notes,
                },
              });
              setText("");
              setOwner("");
              setDue("");
              setNotes("");
              setPriority("Medium");
            }, "Action added")
          }
        >
          Add action
        </Button>
      </div>
    </section>
  );
}
