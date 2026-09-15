import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { importState } from "@/lib/pipeline.functions";
import type { PipelineData } from "@/lib/pipeline-types";
import {
  bundleFilename,
  buildBundle,
  downloadJson,
  parseBundle,
  summarize,
  type StateBundle,
} from "@/lib/state-transfer";
import { useInvalidatePipeline } from "@/lib/use-pipeline";

export function StateTransferPanel({ data }: { data: PipelineData }) {
  const restore = useServerFn(importState);
  const invalidate = useInvalidatePipeline();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ bundle: StateBundle; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function exportNow() {
    downloadJson(bundleFilename(), buildBundle(data));
    toast.success("Saved a full backup of everything in the app");
  }

  async function chooseFile(file: File) {
    try {
      const bundle = parseBundle(await file.text());
      setPending({ bundle, name: file.name });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that file");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirmRestore() {
    if (!pending) return;
    setBusy(true);
    try {
      await restore({ data: { bundle: pending.bundle } });
      await invalidate();
      toast.success("Everything was replaced with the contents of that file");
      setPending(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tech-panel">
      <header className="border-b-2 border-primary/20 bg-muted/40 px-4 py-3">
        <div className="tech-label mb-0.5 text-primary">Control module</div>
        <h2 className="font-display text-sm font-bold uppercase">Backup &amp; restore</h2>
        <p className="text-xs text-muted-foreground">
          Save everything in the app to one JSON file, or load a file back to replace what is here.
        </p>
      </header>
      <div className="space-y-3 p-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportNow}>Export state</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            Import state
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void chooseFile(file);
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          The file holds opportunities, actions, board lanes, field names, picklists, targets,
          revenue plans, the fiscal year setting, snapshots, import history and change history.
        </p>
      </div>

      <AlertDialog open={pending != null} onOpenChange={(open) => (open ? null : setPending(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace everything with this file?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left">
                <p>
                  {pending?.name} contains {pending ? summarize(pending.bundle).join(", ") : ""}.
                </p>
                <p>
                  Everything currently in the app will be removed first and replaced by the contents
                  of this file. This cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void confirmRestore();
              }}
            >
              {busy ? "Restoring…" : "Replace everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
