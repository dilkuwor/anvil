import Link from "next/link";

import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/state";
import type { RecommendedProblem } from "@/lib/api";

export function RecommendedPractice({ items, isNew }: { items: RecommendedProblem[]; isNew: boolean }) {
  return (
    <section className="rounded-2xl border border-steel-800 bg-steel-900/70 p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommended Practice</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isNew ? "Start with an Easy problem to begin your interview journey." : "Based on your recent practice"}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No recommendations yet." body="Browse the set or wait until more unsolved problems are available." />
          <Button asChild className="mt-3">
            <Link href="/problems">Browse Problems</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="flex flex-col rounded-2xl border border-steel-800 bg-steel-950/50 p-4">
              <h3 className="font-medium text-foreground">{item.title}</h3>
              <div className="mt-3">
                <DifficultyBadge difficulty={item.difficulty} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{item.tags.map((tag) => tag.name).join(" · ") || "—"}</p>
              <Button asChild variant="secondary" size="sm" className="mt-4 w-full">
                <Link href={`/problems/${item.slug}`}>Solve Problem →</Link>
              </Button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
