"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Meter } from "@/components/dashboard/meter";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section";
import { api } from "@/lib/api";
import type { RoadmapLearnLink } from "@/lib/learn";
import { queryKeys } from "@/lib/queries";
import type { RoadmapTopic } from "@/lib/roadmap";

export function RoadmapPanel({
  topic,
  topics,
  onClose,
}: {
  topic: RoadmapTopic;
  topics: RoadmapTopic[];
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

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-labelledby="roadmap-topic-title"
      className="ia-slide-in absolute inset-y-0 right-0 z-30 flex w-full flex-col overflow-y-auto border-l border-steel-800 bg-steel-900 p-6 shadow-2xl sm:w-1/2"
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
