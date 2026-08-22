import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle2; label: string; className: string }
> = {
  SOLVED: { icon: CheckCircle2, label: "Solved", className: "text-emerald-500 dark:text-emerald-400" },
  ATTEMPTED: { icon: CircleDot, label: "Attempted", className: "text-amber-500 dark:text-amber-400" },
  NOT_STARTED: { icon: Circle, label: "Not Started", className: "text-muted-foreground/50" },
};

export function StatusPip({ status, compact = false }: { status: string; compact?: boolean }) {
  const config = STATUS_CONFIG[status.toUpperCase()] ?? STATUS_CONFIG.NOT_STARTED;
  const Icon = config.icon;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-medium", config.className)}
      aria-label={config.label}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {compact ? null : <span>{config.label}</span>}
    </span>
  );
}

