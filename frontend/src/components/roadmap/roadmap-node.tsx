import { Check, Lock } from "lucide-react";

import { Meter } from "@/components/dashboard/meter";
import type { RoadmapTopic } from "@/lib/roadmap";
import { NODE_HEIGHT, NODE_WIDTH } from "@/lib/roadmap";
import { cn } from "@/lib/utils";

function statusCopy(topic: RoadmapTopic): string {
  if (topic.locked) return "Locked";
  if (topic.status === "completed") return "Completed";
  if (topic.status === "in_progress") return "In progress";
  return "Not started";
}

export function RoadmapNode({
  topic,
  selected,
  recommended,
  dimmed,
  related,
  onSelect,
  onHover,
}: {
  topic: RoadmapTopic;
  selected: boolean;
  recommended: boolean;
  dimmed: boolean;
  related: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const completed = topic.status === "completed";
  const inProgress = topic.status === "in_progress";
  const tone = completed ? "bg-success" : inProgress ? "bg-accent" : "bg-steel-600";

  return (
    <button
      type="button"
      onClick={() => onSelect(topic.id)}
      onMouseEnter={() => onHover(topic.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(topic.id)}
      onBlur={() => onHover(null)}
      style={{ left: topic.x, top: topic.y, width: NODE_WIDTH, height: NODE_HEIGHT }}
      className={cn(
        "absolute cursor-pointer rounded-xl border px-3.5 py-3 text-left transition-[transform,box-shadow,opacity,border-color,background-color] duration-150",
        "bg-steel-900",
        completed && "border-success/80 bg-success/[0.06]",
        inProgress && !topic.locked && "border-accent",
        !completed && !inProgress && "border-steel-700",
        topic.locked && "border-steel-700 bg-steel-950",
        recommended && !selected && !topic.locked && "border-accent",
        related && !selected && "border-accent/60",
        selected && "z-20 border-accent ring-2 ring-accent/45",
        dimmed && "opacity-40",
        !dimmed && "opacity-100",
        "hover:z-30 hover:scale-[1.03] hover:border-accent/80",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-[15px] font-semibold leading-5 tracking-tight">{topic.title}</div>
        {completed ? (
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
        ) : topic.locked ? (
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : null}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[13px] tabular-nums">
        <span className={cn(topic.locked ? "text-muted-foreground" : "text-foreground/80")}>
          {topic.total === 0 ? "No problems yet" : `${topic.solved} / ${topic.total} solved`}
        </span>
        <span
          className={cn(
            "text-[11px] font-medium text-muted-foreground",
            completed && "text-success",
            inProgress && !topic.locked && "text-accent",
          )}
        >
          {statusCopy(topic)}
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <Meter value={topic.percent} tone={tone} label={`${topic.title} progress`} className="h-2 flex-1" />
        <span className="w-8 shrink-0 text-right text-[12px] font-medium tabular-nums text-muted-foreground">
          {topic.percent}%
        </span>
      </div>
    </button>
  );
}
