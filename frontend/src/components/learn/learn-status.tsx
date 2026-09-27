import { CheckCircle2, Circle } from "lucide-react";

import type { LearnState } from "@/lib/learn";

/** One status mark for every screen: empty dot, pulsing dot, tick, filled tick. */
export function LearnStatus({
  status,
  state,
  needsRefresh = false,
  compact = false,
}: {
  status: string;
  state?: LearnState;
  needsRefresh?: boolean;
  compact?: boolean;
}) {
  const s = state ?? legacyState(status);

  if (s === "mastered") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400" aria-label={needsRefresh ? "Mastered, needs a refresh" : "Mastered"}>
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 fill-emerald-500/25 text-emerald-400" />
        {compact ? null : <span>{needsRefresh ? "Needs a refresh" : "Mastered"}</span>}
      </span>
    );
  }

  if (s === "checked") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400" aria-label="Checked">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
        {compact ? null : <span>Checked</span>}
      </span>
    );
  }

  if (s === "learning") {
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

function legacyState(status: string): LearnState {
  const s = status.toUpperCase();
  if (s === "COMPLETED") return "checked";
  if (s === "IN_PROGRESS") return "learning";
  return "not_started";
}
