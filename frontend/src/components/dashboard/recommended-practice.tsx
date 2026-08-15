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
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="flex flex-col rounded-xl border border-steel-800 bg-steel-950/30 p-4"
            >
              <h3 className="text-[15px] font-medium leading-snug">{item.title}</h3>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <DifficultyBadge difficulty={item.difficulty} />
                <span className="text-[12px] text-muted-foreground">
                  {item.tags.map((tag) => tag.name).join(" · ") || "—"}
                </span>
              </div>
              <Link
                href={`/problems/${item.slug}`}
                className="mt-4 text-[13px] font-medium text-accent hover:text-accent-light"
              >
                Solve problem →
              </Link>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
