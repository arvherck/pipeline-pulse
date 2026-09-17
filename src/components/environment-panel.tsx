import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { copyProductionToTest, setActiveWorkspace } from "@/lib/pipeline.functions";
import type { PipelineData } from "@/lib/pipeline-types";
import { useInvalidatePipeline } from "@/lib/use-pipeline";

/**
 * Switch between the two isolated workspaces. Nothing is ever deleted by
 * switching, so it is instant and reversible.
 */
export function EnvironmentPanel({ data }: { data: PipelineData }) {
  const switchWorkspace = useServerFn(setActiveWorkspace);
  const copyToTest = useServerFn(copyProductionToTest);
  const invalidate = useInvalidatePipeline();
  const [busy, setBusy] = useState(false);
  const [confirmCopy, setConfirmCopy] = useState(false);

  const isTest = data.workspace === "test";

  async function toggle(next: boolean) {
    setBusy(true);
    try {
      await switchWorkspace({ data: { workspace: next ? "test" : "production" } });
      await invalidate();
      toast.success(next ? "Now working in the test environment" : "Back in your real data");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not switch");
    } finally {
      setBusy(false);
    }
  }

  async function runCopy() {
    setBusy(true);
    try {
      const result = await copyToTest({ data: undefined });
      await invalidate();
      const count = result.counts["opportunities"] ?? 0;
      toast.success(`Copied ${count} ${count === 1 ? "deal" : "deals"} into the test environment`);
      setConfirmCopy(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Copy failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tech-panel">
      <header className="border-b-2 border-primary/20 bg-muted/40 px-4 py-3">
        <div className="tech-label mb-0.5 text-primary">Control module</div>
        <h2 className="font-display text-sm font-bold uppercase">Environment</h2>
        <p className="text-xs text-muted-foreground">
          Two completely separate sets of data. Switching does not delete anything.
        </p>
      </header>
      <div className="space-y-3 p-3">
        <label className="flex items-center justify-between gap-3 border border-border bg-muted/30 px-3 py-2.5">
          <span>
            <span className="block font-display text-xs font-bold uppercase">Test environment</span>
            <span className="block text-xs text-muted-foreground">
              {isTest
                ? "You are looking at practice data. Nothing here affects your real pipeline."
                : "You are looking at your real pipeline."}
            </span>
          </span>
          <Switch
            checked={isTest}
            disabled={busy}
            onCheckedChange={(next) => void toggle(next)}
            aria-label="Use the test environment"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled={busy} onClick={() => setConfirmCopy(true)}>
            Copy real data into test
          </Button>
          <span className="text-xs text-muted-foreground">
            Refills the test environment from your real one. Your real data is never changed.
          </span>
        </div>
      </div>

      <AlertDialog open={confirmCopy} onOpenChange={(open) => (open ? null : setConfirmCopy(false))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refill the test environment?</AlertDialogTitle>
            <AlertDialogDescription>
              Everything currently in the test environment is removed and replaced with a copy of
              your real data. Your real data is only read, never changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void runCopy();
              }}
            >
              {busy ? "Copying…" : "Copy into test"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
