import { ListChecks } from "lucide-react";
import Link from "next/link";

import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { Button } from "@/components/ui/button";
import { CardHeader, SectionCard } from "@/components/ui/section";
import type { RecommendedProblem } from "@/lib/api";

export function RecommendedPractice({ items, isNew }: { items: RecommendedProblem[]; isNew: boolean }) {
  return (
    <SectionCard className="flex flex-col justify-between p-4 sm:p-5">
      <div>
        <CardHeader
          icon={ListChecks}
          title="Recommended practice"
          action={
            <Link href="/problems" className="text-xs text-muted-foreground hover:text-accent transition-colors">
              Browse all →
            </Link>
          }
        />
        <p className="text-[12.5px] text-muted-foreground">
          {isNew ? "Start with an Easy problem to calibrate." : "Next problems picked for your current level."}
        </p>

        {items.length === 0 ? (
          <div className="mt-3.5 rounded-xl border border-dashed border-steel-800 p-5 text-center">
            <p className="text-xs text-muted-foreground">All recommended problems solved!</p>
            <Button asChild size="sm" variant="secondary" className="mt-2.5 h-7 text-xs">
              <Link href="/problems">Explore Problems</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/problems/${item.slug}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-steel-800/80 bg-steel-950/30 p-2.5 sm:p-3 transition-all duration-150 hover:border-accent/40 hover:bg-steel-800/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <DifficultyBadge difficulty={item.difficulty} />
                    <h3 className="truncate text-[13px] font-semibold text-foreground transition-colors group-hover:text-accent">
                      {item.title}
                    </h3>
                  </div>
                  {item.tags.length > 0 ? (
                    <p className="mt-1 truncate text-[11px] text-muted-foreground pl-0.5">
                      {item.tags.map((tag) => tag.name).join(" · ")}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs font-semibold text-accent transition-transform group-hover:translate-x-0.5">
                  Solve →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
