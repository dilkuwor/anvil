import type { ProgressSummary } from "@/lib/api";

const EASY = "#2dd4bf";
const MEDIUM = "#f97316";
const HARD = "#fb7185";
const TRACK = "var(--chart-track)";

type Segment = { value: number; color: string; label: string };

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const sweep = Math.max(0, Math.min(360, end - start));
  if (sweep <= 0) return "";
  if (sweep >= 359.9) {
    const a = polar(cx, cy, r, start);
    const b = polar(cx, cy, r, start + 180);
    return `M ${a.x} ${a.y} A ${r} ${r} 0 1 1 ${b.x} ${b.y} A ${r} ${r} 0 1 1 ${a.x} ${a.y}`;
  }
  const from = polar(cx, cy, r, start);
  const to = polar(cx, cy, r, start + sweep);
  const large = sweep > 180 ? 1 : 0;
  return `M ${from.x} ${from.y} A ${r} ${r} 0 ${large} 1 ${to.x} ${to.y}`;
}

export function ProgressRing({ data, compact = false }: { data: ProgressSummary; compact?: boolean }) {
  const total = Math.max(data.total_problems ?? 0, 0);
  const segments: Segment[] = [
    { value: data.easy_solved ?? 0, color: EASY, label: "Easy" },
    { value: data.medium_solved ?? 0, color: MEDIUM, label: "Medium" },
    { value: data.hard_solved ?? 0, label: "Hard", color: HARD },
  ];
  const cx = 120;
  const cy = 120;
  const r = 92;
  const gap = total > 0 ? 2 : 0;

  let cursor = 0;
  const arcs = segments
    .map((segment) => {
      const sweep = total === 0 ? 0 : (segment.value / total) * 360;
      const start = cursor + (sweep > 0 ? gap / 2 : 0);
      const end = cursor + sweep - (sweep > 0 ? gap / 2 : 0);
      cursor += sweep;
      return { ...segment, start, end, sweep };
    })
    .filter((segment) => segment.sweep > 0);

  const solved = data.total_solved ?? 0;
  const attempting = data.problems_attempting ?? 0;
  const description = `${solved} of ${total} problems solved. ${attempting} attempting. Easy ${data.easy_solved}, Medium ${data.medium_solved}, Hard ${data.hard_solved}.`;

  return (
    <div className={compact ? "relative mx-auto h-44 w-44" : "relative mx-auto h-56 w-56 sm:h-64 sm:w-64"}>
      <svg viewBox="0 0 240 240" className="h-full w-full" role="img" aria-label={description}>
        <title>{description}</title>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={TRACK} strokeWidth="16" />
        {arcs.map((segment) => (
          <path
            key={segment.label}
            d={arcPath(cx, cy, r, segment.start, segment.end)}
            fill="none"
            stroke={segment.color}
            strokeWidth="16"
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className={`font-semibold tabular-nums ${compact ? "text-2xl" : "text-3xl sm:text-4xl"}`}>
          {solved}/{total}
        </div>
        <div className="mt-1 text-sm text-success">✓ Solved</div>
        <div className="text-xs text-muted-foreground">{attempting} Attempting</div>
      </div>
    </div>
  );
}
