import { cn } from "@/lib/utils";

const TRACK = "var(--chart-track)";

export function DailyRing({
  done,
  total,
  size = 76,
  className,
}: {
  done: number;
  total: number;
  size?: number;
  className?: string;
}) {
  const r = 31;
  const circumference = 2 * Math.PI * r;
  const fraction = total > 0 ? Math.min(done / total, 1) : 0;
  const complete = total > 0 && done >= total;
  const label = total > 0 ? `${done} of ${total} tasks done today` : "No tasks planned today";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 76 76"
      role="img"
      aria-label={label}
      className={cn("shrink-0", className)}
    >
      <title>{label}</title>
      <circle cx="38" cy="38" r={r} fill="none" stroke={TRACK} strokeWidth="8" />
      <circle
        cx="38"
        cy="38"
        r={r}
        fill="none"
        stroke={complete ? "var(--teal)" : "var(--accent)"}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${(fraction * circumference).toFixed(1)} ${circumference.toFixed(1)}`}
        transform="rotate(-90 38 38)"
        className="transition-[stroke-dasharray] duration-500 ease-out motion-reduce:transition-none"
      />
      {complete ? (
        <path
          d="M27 39.5 34.5 47 50 30"
          fill="none"
          stroke="var(--teal)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <text x="38" y="43" textAnchor="middle" className="fill-foreground text-[15px] font-semibold">
          {done}/{total}
        </text>
      )}
    </svg>
  );
}
