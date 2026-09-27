import { ListChecks } from "lucide-react";
import Link from "next/link";

import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { Button } from "@/components/ui/button";
import { CardHeader, SectionCard } from "@/components/ui/section";
import type { RecommendedProblem } from "@/lib/api";

export function RecommendedPractice({ items, isNew }: { items: RecommendedProblem[]; isNew: boolean }) {
  return (
    <SectionCard className="flex flex-col justify-between p-4">
      <div>
        <CardHeader
          icon={ListChecks}
          title="Recommended practice"
          meta={isNew ? "start easy" : "for your level"}
          action={
            <Link href="/problems" className="text-xs text-muted-foreground hover:text-accent transition-colors">
              Browse all →
            </Link>
          }
        />
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-steel-800 p-4 text-center">
            <p className="text-xs text-muted-foreground">All recommended problems solved.</p>
            <Button asChild size="sm" variant="secondary" className="mt-2 h-7 text-xs">
              <Link href="/problems">Explore problems</Link>
            </Button>
          </div>
        ) : (
          <ul className="-mx-1 divide-y divide-steel-800/70">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/problems/${item.slug}`}
                  className="group flex items-center gap-2.5 rounded-md px-1 py-2 transition-colors hover:bg-steel-800/40"
                >
                  <DifficultyBadge difficulty={item.difficulty} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground transition-colors group-hover:text-accent">
                    {item.title}
                  </span>
                  {item.tags[0] ? (
                    <span
                      className="hidden max-w-[10rem] shrink-0 truncate rounded-full border border-steel-800 bg-steel-950/60 px-2 py-0.5 text-[10.5px] text-muted-foreground sm:inline-block"
                      title={item.tags.map((tag) => tag.name).join(" · ")}
                    >
                      {item.tags[0].name}
                      {item.tags.length > 1 ? ` +${item.tags.length - 1}` : ""}
                    </span>
                  ) : null}
                  <span className="shrink-0 text-xs font-semibold text-accent transition-transform group-hover:translate-x-0.5">
                    Solve →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
