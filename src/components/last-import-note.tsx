import { useQuery } from "@tanstack/react-query";

import type { ImportRun } from "@/lib/pipeline-types";
import { pipelineQueryOptions } from "@/lib/use-pipeline";
import { cn } from "@/lib/utils";

function exactTime(run: ImportRun): string {
  return new Date(run.imported_at).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(run: ImportRun): string {
  const minutes = Math.round((Date.now() - new Date(run.imported_at).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

/**
 * When data last came in. `variant="short"` is for the top bar,
 * `variant="full"` for the import page.
 */
export function LastImportNote({
  variant = "full",
  className,
}: {
  variant?: "short" | "full";
  className?: string;
}) {
  const { data } = useQuery(pipelineQueryOptions);
  const run = data?.importRuns?.[0];

  if (!run) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {variant === "short" ? "" : "No imports yet"}
      </span>
    );
  }

  const rows = `${run.row_count.toLocaleString()} row${run.row_count === 1 ? "" : "s"}`;

  return (
    <span
      className={cn("whitespace-nowrap text-xs text-muted-foreground", className)}
      title={`${exactTime(run)} · ${rows}`}
    >
      {variant === "short"
        ? `Imported ${relativeTime(run)}`
        : `Last import: ${exactTime(run)} · ${rows}`}
    </span>
  );
}
