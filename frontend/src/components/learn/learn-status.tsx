import { cn } from "@/lib/utils";

const MARKS: Record<string, { mark: string; label: string; className: string }> = {
  COMPLETED: { mark: "✓", label: "Completed", className: "text-success" },
  IN_PROGRESS: { mark: "◐", label: "In progress", className: "text-accent-light" },
  NOT_STARTED: { mark: "○", label: "Not started", className: "text-muted-foreground" },
};

export function LearnStatus({ status, compact = false }: { status: string; compact?: boolean }) {
  const item = MARKS[status.toUpperCase()] ?? MARKS.NOT_STARTED;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", item.className)} aria-label={item.label}>
      <span aria-hidden className="font-medium">
        {item.mark}
      </span>
      {compact ? null : <span>{item.label}</span>}
    </span>
  );
}
