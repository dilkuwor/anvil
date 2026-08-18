"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SIMULATOR_PROBLEMS } from "../models/problems";
import { newDesign, saveCurrent } from "../state/persist";

export function ProblemsPage() {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <PageHeader title="System Design Problems" description="Open a prompt in the simulator with realistic traffic already filled in." />
      <div className="grid gap-3 sm:grid-cols-2">
        {SIMULATOR_PROBLEMS.map((item) => (
          <article key={item.slug} className="flex flex-col rounded-2xl border border-steel-800 bg-steel-900 p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold">{item.title}</h2>
              <DifficultyBadge difficulty={item.difficulty} />
            </div>
            <p className="mt-2 flex-1 text-[13px] leading-6 text-muted-foreground">{item.prompt}</p>
            <div className="mt-4">
              <Button
                size="sm"
                onClick={() => {
                  const design = newDesign(item.title);
                  saveCurrent({
                    ...design,
                    problemSlug: item.slug,
                    workload: { ...design.workload, ...item.seed },
                  });
                  router.push(`/system-design/simulator?problem=${item.slug}`);
                }}
              >
                Open in Simulator
              </Button>
            </div>
          </article>
        ))}
      </div>
      <Link href="/system-design" className="text-[13px] text-muted-foreground hover:text-accent">
        ← System Design
      </Link>
    </div>
  );
}
