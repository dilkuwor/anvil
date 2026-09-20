"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Lock, Play, Sparkles } from "lucide-react";

import { Meter } from "@/components/dashboard/meter";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section";
import { api } from "@/lib/api";
import type { RoadmapLearnLink } from "@/lib/learn";
import { queryKeys } from "@/lib/queries";
import type { RoadmapTopic } from "@/lib/roadmap";
import {
  getKeystoneStatus,
  getTopicKeystones,
} from "@/lib/roadmap-stories";
import { cn } from "@/lib/utils";

export function RoadmapPanel({
  topic,
  topics,
  progress = {},
  onClose,
}: {
  topic: RoadmapTopic;
  topics: RoadmapTopic[];
  progress?: Record<string, { watched: boolean; recalled: boolean }>;
  onClose: () => void;
}) {
  const byId = new Map(topics.map((item) => [item.id, item]));
  const prereqs = topic.prerequisites.map((id) => byId.get(id)).filter((item): item is RoadmapTopic => Boolean(item));
  const next = topic.next.map((id) => byId.get(id)).filter((item): item is RoadmapTopic => Boolean(item));
  const practiceHref = `/problems?tag=${topic.filterTag}`;
  const learn = useQuery({
    queryKey: queryKeys.learnRoadmap(topic.id),
    queryFn: () => api.get<RoadmapLearnLink>(`/api/v1/learn/roadmap/${topic.id}`),
  });
  const learnTopic = learn.data?.topic;
  const mockHref = learn.data?.mock_problem_slug
    ? `/problems/${learn.data.mock_problem_slug}`
    : practiceHref;

  const keystones = getTopicKeystones(topic.id);
  const primaryKeystone = keystones.find((s) => s.isPrimary);
  const primaryStatus = primaryKeystone ? getKeystoneStatus(primaryKeystone.slug, progress) : "not_started";
  const downstream = keystones.filter((s) => !s.isPrimary);

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-labelledby="roadmap-topic-title"
      className="ia-slide-in absolute inset-y-0 right-0 z-30 flex w-full max-w-md flex-col overflow-y-auto border-l border-steel-800 bg-steel-900 p-6 shadow-2xl md:w-[26rem]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionTitle>Topic</SectionTitle>
          <h2 id="roadmap-topic-title" className="mt-2 text-lg font-semibold tracking-tight">
            {topic.title}
          </h2>
          <p className="mt-1 text-[13px] font-medium text-muted-foreground">
            {topic.locked ? "Locked" : topic.status === "completed" ? "Completed" : topic.status === "in_progress" ? "In progress" : "Not started"}
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
          Close
        </button>
      </div>
      <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{topic.description}</p>
      {topic.locked ? (
        <p className="mt-3 rounded-lg border border-steel-800 bg-steel-950 px-3 py-2 text-[13px] leading-6">
          Locked until you start {prereqs.length ? prereqs.map((item) => item.title).join(", ") : "its prerequisites"}.
        </p>
      ) : null}
      <div className="mt-6">
        <div className="flex items-baseline justify-between text-sm">
          <span className="tabular-nums">
            {topic.solved} / {topic.total} problems solved
          </span>
          <span className="text-muted-foreground">{topic.percent}%</span>
        </div>
        <div className="mt-2">
          <Meter
            value={topic.percent}
            tone={topic.status === "completed" ? "bg-success" : "bg-accent"}
            label={`${topic.title} complete`}
            className="h-2"
          />
        </div>
      </div>
      {keystones.length > 0 ? (
        <div className="mt-6 rounded-xl border border-steel-800 bg-steel-950/70 p-4 shadow-inner">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Keystone Visual Story
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                primaryStatus === "recalled"
                  ? "border border-success/30 bg-success/15 text-success"
                  : primaryStatus === "watched"
                  ? "border border-accent/30 bg-accent/15 text-accent"
                  : "border border-steel-700 bg-steel-800/80 text-muted-foreground",
              )}
            >
              {primaryStatus === "recalled" ? "Recalled ✓" : primaryStatus === "watched" ? "Watched" : "Not started"}
            </span>
          </div>

          {primaryKeystone ? (
            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[14px] font-semibold tracking-tight text-foreground">
                  {primaryKeystone.title}
                </h3>
              </div>
              <p className="mt-0.5 text-[12px] font-medium text-accent">
                {primaryKeystone.metaphor}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                {primaryKeystone.insight}
              </p>

              <div className="mt-2.5 flex items-start gap-1.5 rounded-md border border-steel-800/90 bg-steel-900/60 px-2.5 py-1.5 text-[11px]">
                <span className="font-semibold text-rose-400 shrink-0">Trap:</span>
                <span className="italic text-muted-foreground">{primaryKeystone.trap}</span>
              </div>

              <div className="mt-3.5">
                <Button asChild size="sm" className="w-full">
                  <Link href={`/problems/${primaryKeystone.slug}?tab=story`}>
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                    {primaryStatus === "recalled"
                      ? "Review Story & Trap"
                      : primaryStatus === "watched"
                      ? "Practice Recall Run"
                      : "Launch Visual Story"}
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}

          {downstream.length > 0 ? (
            <div className="mt-4 border-t border-steel-800/80 pt-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground mb-2">
                Family Progression:
              </div>
              <div className="space-y-1.5">
                {downstream.map((story) => {
                  const status = getKeystoneStatus(story.slug, progress);
                  const locked = story.prereqSlug ? !progress[story.prereqSlug]?.recalled : false;
                  return (
                    <div
                      key={story.slug}
                      className="flex items-center justify-between gap-2 rounded-lg border border-steel-800 bg-steel-900/60 px-2.5 py-1.5 text-xs"
                    >
                      <div className="min-w-0 pr-1">
                        <div className="truncate font-medium text-foreground/90">{story.title}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{story.metaphor}</div>
                      </div>
                      {locked ? (
                        <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          Locked
                        </span>
                      ) : (
                        <Button asChild size="sm" variant="secondary" className="h-6 text-[11px] shrink-0 px-2">
                          <Link href={`/problems/${story.slug}?tab=story`}>
                            {status === "recalled" ? "Recalled ✓" : "Story →"}
                          </Link>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <dl className="mt-6 space-y-4 text-sm">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Prerequisites</dt>
          <dd className="mt-1">{prereqs.length ? prereqs.map((item) => item.title).join(", ") : "None"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Next topics</dt>
          <dd className="mt-1">{next.length ? next.map((item) => item.title).join(", ") : "Path complete"}</dd>
        </div>
      </dl>
      <div className="mt-8 flex flex-col gap-2">
        <Button asChild>
          <Link href={learnTopic?.href ?? practiceHref}>Open Topic</Link>
        </Button>
        {topic.total === 0 ? (
          <Button variant="secondary" disabled>
            No problems yet
          </Button>
        ) : (
          <Button asChild variant="secondary">
            <Link href={practiceHref}>Practice Problems</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href={mockHref}>Mock Interview</Link>
        </Button>
      </div>
    </aside>
  );
}
