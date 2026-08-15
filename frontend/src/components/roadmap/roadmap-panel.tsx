import Link from "next/link";

import { Meter } from "@/components/dashboard/meter";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section";
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
          <h2 id="roadmap-topic-title" className="mt-2 text-xl font-semibold tracking-tight">
            {topic.title}
          </h2>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
          Close
        </button>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{topic.description}</p>
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
      {topic.total === 0 ? (
        <Button className="mt-8" disabled>
          No problems yet
        </Button>
      ) : (
        <Button asChild className="mt-8">
          <Link href={practiceHref}>Practice Topic</Link>
        </Button>
      )}
    </aside>
  );
}
