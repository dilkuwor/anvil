import { Check, Lock } from "lucide-react";

import { Meter } from "@/components/dashboard/meter";
import type { RoadmapTopic } from "@/lib/roadmap";
import { NODE_HEIGHT, NODE_WIDTH } from "@/lib/roadmap";
import { cn } from "@/lib/utils";

export function RoadmapNode({
  topic,
  selected,
  recommended,
  onSelect,
}: {
  topic: RoadmapTopic;
  selected: boolean;
  recommended: boolean;
  onSelect: (id: string) => void;
}) {
  const tone =
    topic.status === "completed" ? "bg-success" : topic.status === "in_progress" ? "bg-accent" : "bg-steel-600";

  return (
    <button
      type="button"
      onClick={() => onSelect(topic.id)}
      style={{ left: topic.x, top: topic.y, width: NODE_WIDTH, height: NODE_HEIGHT }}
      className={cn(
        "absolute rounded-xl border px-3 py-2.5 text-left transition-colors",
        "bg-steel-900 hover:border-steel-600",
        topic.status === "completed" && "border-success/50",
        topic.status === "in_progress" && "border-accent/70",
        topic.status === "not_started" && "border-steel-800",
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-background",
        recommended && !selected && "border-accent",
        topic.locked && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-[13px] font-medium leading-tight">{topic.title}</div>
        {topic.status === "completed" ? (
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
        ) : topic.locked ? (
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        ) : null}
      </div>
      <div className="mt-2 text-[11px] tabular-nums text-muted-foreground">
        {topic.total === 0 ? "No problems yet" : `${topic.solved} / ${topic.total} solved`}
      </div>
      <div className="mt-1.5">
        <Meter value={topic.percent} tone={tone} label={`${topic.title} progress`} />
      </div>
    </button>
  );
}
