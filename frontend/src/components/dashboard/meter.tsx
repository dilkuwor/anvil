import { cn } from "@/lib/utils";

export function Meter({
  value,
  tone = "bg-accent",
  label,
  className,
}: {
  value: number;
  tone?: string;
  label: string;
  className?: string;
}) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-1.5 overflow-hidden rounded-full bg-steel-800", className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={width}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500 ease-out", tone)}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
