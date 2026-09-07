import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  addAction,
  deleteAction,
  setStatusNotes,
  toggleAction,
} from "@/lib/pipeline.functions";
import {
  formatDate,
  formatMoney,
  labelFor,
  type Opportunity,
  type PipelineData,
} from "@/lib/pipeline-types";
import { useInvalidatePipeline } from "@/lib/use-pipeline";

export function OpportunityPanel({
  data,
  opportunity,
  onClose,
}: {
  data: PipelineData;
  opportunity: Opportunity | null;
  onClose: () => void;
}) {
  const invalidate = useInvalidatePipeline();
  const saveNotes = useServerFn(setStatusNotes);
  const createAction = useServerFn(addAction);
  const flipAction = useServerFn(toggleAction);
  const removeAction = useServerFn(deleteAction);

  const status = opportunity
    ? data.statuses.find((s) => s.opportunity_id === opportunity.id)
    : undefined;
  const [notes, setNotes] = useState(status?.notes ?? "");
  const [actionText, setActionText] = useState("");
  const [actionOwner, setActionOwner] = useState("");
  const [actionDue, setActionDue] = useState("");

  const opportunityId = opportunity?.id ?? "";
  useEffect(() => {
    if (!opportunityId) return;
    setNotes(data.statuses.find((s) => s.opportunity_id === opportunityId)?.notes ?? "");
  }, [opportunityId, data.statuses]);


  const actions = opportunity
    ? data.actions.filter((a) => a.opportunity_id === opportunity.id)
    : [];

  const label = (field: string) => labelFor(data.fieldLabels, field);

  const rows: Array<[string, string]> = opportunity
    ? [
        [label("account_name"), opportunity.account_name ?? "—"],
        [label("stage"), opportunity.stage ?? "—"],
        [label("owner"), opportunity.owner ?? "—"],
        [label("category"), opportunity.category ?? "—"],
        [label("region"), opportunity.region ?? "—"],
        [label("segment"), opportunity.segment ?? "—"],
        [label("deal_value"), formatMoney(opportunity.deal_value)],
        [label("weighted_value"), formatMoney(opportunity.weighted_value)],
        [
          label("probability"),
          opportunity.probability == null ? "—" : `${opportunity.probability}%`,
        ],
        [
          label("quality_score"),
          opportunity.quality_score == null ? "—" : String(opportunity.quality_score),
        ],
        [label("close_date"), formatDate(opportunity.close_date)],
        [label("fiscal_period"), opportunity.fiscal_period ?? "—"],
        [label("contract_start"), formatDate(opportunity.contract_start)],
        [label("contract_end"), formatDate(opportunity.contract_end)],
        [label("last_stage_change"), formatDate(opportunity.last_stage_change)],
        [label("age_days"), opportunity.age_days == null ? "—" : String(opportunity.age_days)],
        [
          label("stage_duration_days"),
          opportunity.stage_duration_days == null ? "—" : String(opportunity.stage_duration_days),
        ],
        [label("is_open"), opportunity.is_open ? "Open" : "Closed"],
        ...Object.entries(opportunity.custom_fields ?? {}).map(
          ([key, value]) => [key, value == null ? "—" : String(value)] as [string, string],
        ),
      ]
    : [];

  return (
    <Sheet open={Boolean(opportunity)} onOpenChange={(open) => (open ? null : onClose())}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {opportunity ? (
          <>
            <SheetHeader className="pb-0">
              <SheetTitle className="text-base leading-snug">{opportunity.name}</SheetTitle>
              <p className="text-xs text-muted-foreground">
                {opportunity.account_name ?? "No client"} · {opportunity.id}
              </p>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-8">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                {rows.map(([key, value]) => (
                  <div key={key} className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {key}
                    </dt>
                    <dd className="truncate">{value}</dd>
                  </div>
                ))}
              </dl>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status note
                </h3>
                <Textarea
                  className="mt-2 min-h-20 text-[13px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What's happening with this deal?"
                />
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={async () => {
                    await saveNotes({ data: { opportunityId: opportunity.id, notes } });
                    await invalidate();
                    toast.success("Note saved");
                  }}
                >
                  Save note
                </Button>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {actions.length === 0 ? (
                    <li className="text-[13px] text-muted-foreground">No actions yet.</li>
                  ) : null}
                  {actions.map((action) => (
                    <li key={action.id} className="flex items-start gap-2 text-[13px]">
                      <Checkbox
                        checked={action.done}
                        className="mt-0.5"
                        onCheckedChange={async (checked) => {
                          await flipAction({ data: { id: action.id, done: Boolean(checked) } });
                          await invalidate();
                        }}
                      />
                      <span className={action.done ? "line-through text-muted-foreground" : ""}>
                        {action.text}
                        {action.owner ? (
                          <span className="text-muted-foreground"> · {action.owner}</span>
                        ) : null}
                        {action.due_date ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · due {formatDate(action.due_date)}
                          </span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        className="ml-auto text-xs text-muted-foreground hover:text-destructive"
                        onClick={async () => {
                          await removeAction({ data: { id: action.id } });
                          await invalidate();
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 space-y-2">
                  <Input
                    className="h-8 text-[13px]"
                    placeholder="New action"
                    value={actionText}
                    onChange={(e) => setActionText(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Input
                      className="h-8 text-[13px]"
                      placeholder="Owner"
                      value={actionOwner}
                      onChange={(e) => setActionOwner(e.target.value)}
                    />
                    <Input
                      className="h-8 text-[13px]"
                      type="date"
                      value={actionDue}
                      onChange={(e) => setActionDue(e.target.value)}
                    />
                    <Button
                      size="sm"
                      disabled={!actionText.trim()}
                      onClick={async () => {
                        await createAction({
                          data: {
                            opportunityId: opportunity.id,
                            text: actionText.trim(),
                            owner: actionOwner,
                            dueDate: actionDue,
                          },
                        });
                        setActionText("");
                        setActionOwner("");
                        setActionDue("");
                        await invalidate();
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </section>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
