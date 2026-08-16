import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { Meter } from "@/components/dashboard/meter";

const SCORES = [
  { label: "Approach", value: "Clear" },
  { label: "Communication", value: "Strong" },
  { label: "Solution", value: "Correct with tradeoffs" },
];

export function HeroPreview() {
  return (
    <aside
      aria-hidden
      className="w-full min-w-0 max-w-4xl overflow-hidden rounded-2xl border border-steel-800 bg-steel-900 shadow-[0_28px_80px_-36px_rgba(0,0,0,0.65)]"
    >
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-steel-800 px-4 py-2.5">
        <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
        <p className="min-w-0 truncate text-[11px] text-muted-foreground">Practice → Learn → Interview → Improve</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-steel-800 px-4 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold tracking-tight">Pair Target</p>
            <DifficultyBadge difficulty="EASY" />
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">Hash map · two pointers</p>
        </div>
        <div className="flex items-center gap-3">
          <Meter value={30} label="Pair Target progress" className="h-1.5 w-28" />
          <span className="text-[12px] tabular-nums text-muted-foreground">3 / 10</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2">
        <div className="border-b border-steel-800 px-4 py-4 sm:border-b-0 sm:border-r">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">System Design</p>
          <p className="mt-2 text-sm font-medium">Capacity Estimation</p>
          <p className="mt-3 overflow-x-auto rounded-lg border border-steel-800 bg-steel-950/50 px-3 py-2 font-mono text-[12px] leading-5 text-muted-foreground">
            QPS = users × actions / 86,400
          </p>
        </div>

        <div className="px-4 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Mock Interview</p>
          <dl className="mt-3 space-y-2.5 text-[13px]">
            {SCORES.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
                <dd className="text-right font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </aside>
  );
}
