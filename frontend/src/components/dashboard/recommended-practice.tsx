import Link from "next/link";

import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { Button } from "@/components/ui/button";
import { SectionCard, SectionTitle } from "@/components/ui/section";
import type { RecommendedProblem } from "@/lib/api";

export function RecommendedPractice({ items, isNew }: { items: RecommendedProblem[]; isNew: boolean }) {
  return (
    <SectionCard>
      <SectionTitle>Recommended Practice</SectionTitle>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {isNew ? "Start with an Easy problem." : "Next unsolved problems matched to your progress."}
      </p>

      {items.length === 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">No unsolved problems left in the current set.</p>
          <Button asChild size="sm" variant="secondary">
            <Link href="/problems">Browse Problems</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-4 grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/problems/${item.slug}`}
              className="group flex flex-col justify-between rounded-xl border border-steel-800/90 bg-steel-950/40 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-steel-950/80 hover:shadow-md"
            >
              <div>
                <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-accent">
                  {item.title}
                </h3>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <DifficultyBadge difficulty={item.difficulty} />
                  <span className="text-[12px] text-muted-foreground">
                    {item.tags.map((tag) => tag.name).join(" · ") || "—"}
                  </span>
                </div>
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent transition-transform group-hover:translate-x-1">
                Solve problem →
              </span>
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
