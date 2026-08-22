import { CheckCircle2, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

export function LearnStatus({ status, compact = false }: { status: string; compact?: boolean }) {
  const s = status.toUpperCase();

  if (s === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400" aria-label="Completed">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
        {compact ? null : <span>Completed</span>}
      </span>
    );
  }

  if (s === "IN_PROGRESS") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent" aria-label="In progress">
        <span className="h-2 w-2 shrink-0 rounded-full bg-accent animate-pulse" />
        {compact ? null : <span>In progress</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground" aria-label="Not started">
      <Circle className="h-3 w-3 shrink-0 text-steel-500" />
      {compact ? null : <span>Not started</span>}
    </span>
  );
}
