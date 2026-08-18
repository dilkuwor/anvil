"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { LearnStatus } from "@/components/learn/learn-status";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { Button } from "@/components/ui/button";
import type { SystemDesignScenario } from "@/lib/interview";
import type { LearnStatus as LearnStatusValue } from "@/lib/learn";
import { applyScenarioWorkload, catalogLearnHref, type CatalogMode } from "@/lib/system-design-catalog";
import { newDesign, saveCurrent } from "@/system-design/state/persist";

type LessonHint = {
  href: string;
  status?: LearnStatusValue;
  estimated_minutes?: number;
};

export function SystemDesignProblemCard({
  item,
  primary,
  lesson,
  onInterview,
  interviewing,
}: {
  item: SystemDesignScenario;
  primary: CatalogMode;
  lesson?: LessonHint;
  onInterview: (slug: string) => void;
  interviewing?: boolean;
}) {
  const router = useRouter();
  const learnHref = lesson?.href ?? catalogLearnHref(item.learn_slug);

  function simulate() {
    if (item.sample_slug) {
      router.push(`/system-design/simulator?sample=${item.sample_slug}`);
      return;
    }
    saveCurrent(applyScenarioWorkload(newDesign(item.title), item));
    router.push(`/system-design/simulator?problem=${item.slug}`);
  }

  return (
    <article className="flex h-full flex-col rounded-2xl border border-steel-800 bg-steel-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight">{item.title}</h2>
        <DifficultyBadge difficulty={item.difficulty} />
      </div>
      <p className="mt-2 flex-1 text-[13px] leading-6 text-muted-foreground">{item.summary}</p>
      {lesson?.status ? (
        <div className="mt-2 flex items-center gap-3 text-[12px] text-muted-foreground">
          <LearnStatus status={lesson.status} />
          {lesson.estimated_minutes ? <span>{lesson.estimated_minutes} min</span> : null}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {learnHref ? (
          <Button asChild size="sm" variant={primary === "learn" ? "default" : "secondary"}>
            <Link href={learnHref}>Learn</Link>
          </Button>
        ) : null}
        <Button size="sm" variant={primary === "simulate" ? "default" : "secondary"} onClick={simulate}>
          {item.sample_slug ? "Load sample" : "Simulate"}
        </Button>
        <Button
          size="sm"
          variant={primary === "interview" ? "default" : "secondary"}
          disabled={interviewing}
          onClick={() => onInterview(item.slug)}
        >
          {interviewing ? "Starting…" : "Interview"}
        </Button>
      </div>
    </article>
  );
}
