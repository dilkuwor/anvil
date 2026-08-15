import type { WeakArea } from "@/lib/performance";

/** Renders only when real tag-performance data is supplied. Never invents percentages. */
export function WeakAreasPanel({ areas }: { areas: WeakArea[] }) {
  if (!areas.length) return null;
  return (
    <section className="rounded-xl border border-steel-800 bg-steel-900/60 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your Weak Areas</h2>
      <ul className="mt-4 space-y-3">
        {areas.map((area) => (
          <li key={area.slug}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{area.tag}</span>
              <span className="tabular-nums text-muted-foreground">{Math.round(area.proficiency)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-steel-800">
              <div className="h-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, area.proficiency))}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
