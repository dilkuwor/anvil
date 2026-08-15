import { cn } from "@/lib/utils";

const MARKS: Record<string, { mark: string; label: string; className: string }> = {
  SOLVED: { mark: "✓", label: "Solved", className: "text-success" },
  ATTEMPTED: { mark: "◐", label: "Attempted", className: "text-accent-light" },
  NOT_STARTED: { mark: "○", label: "Not Started", className: "text-muted-foreground" },
};

export function StatusPip({ status, compact = false }: { status: string; compact?: boolean }) {
  const item = MARKS[status.toUpperCase()] ?? MARKS.NOT_STARTED;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-sm", item.className)}
      aria-label={item.label}
    >
      <span aria-hidden className="font-medium">
        {item.mark}
      </span>
      {compact ? null : <span>{item.label}</span>}
    </span>
  );
}
