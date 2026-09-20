import { Check, Lock, Sparkles } from "lucide-react";

import { Meter } from "@/components/dashboard/meter";
import type { RoadmapTopic } from "@/lib/roadmap";
import { NODE_HEIGHT, NODE_WIDTH } from "@/lib/roadmap";
import type { KeystoneStatus, KeystoneStory } from "@/lib/roadmap-stories";
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
  keystone,
  keystoneStatus,
  isRecommendedKeystone,
  onSelect,
  onHover,
}: {
  topic: RoadmapTopic;
  selected: boolean;
  recommended: boolean;
  dimmed: boolean;
  related: boolean;
  keystone?: KeystoneStory;
  keystoneStatus?: KeystoneStatus;
  isRecommendedKeystone?: boolean;
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
        "absolute cursor-pointer rounded-xl border px-3.5 py-2.5 text-left transition-[transform,box-shadow,opacity,border-color,background-color] duration-150",
        "bg-steel-900",
        completed && "border-success/80 bg-success/[0.06]",
        inProgress && !topic.locked && "border-accent",
        !completed && !inProgress && "border-steel-700",
        topic.locked && "border-steel-700 bg-steel-950",
        recommended && !selected && !topic.locked && "border-accent",
        isRecommendedKeystone && !selected && !topic.locked && "border-accent ring-1 ring-accent/50",
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
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px] tabular-nums">
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
      <div className="mt-2 flex items-center gap-2">
        <Meter value={topic.percent} tone={tone} label={`${topic.title} progress`} className="h-1.5 flex-1" />
        <span className="w-8 shrink-0 text-right text-[11px] font-medium tabular-nums text-muted-foreground">
          {topic.percent}%
        </span>
      </div>
      {keystone ? (
        <div className="mt-2 flex items-center justify-between gap-1.5 border-t border-steel-800/80 pt-1 text-[11px]">
          <span className="flex min-w-0 items-center gap-1 font-medium text-muted-foreground truncate">
            <Sparkles
              className={cn("h-3 w-3 shrink-0", isRecommendedKeystone ? "text-accent animate-pulse" : "text-steel-400")}
              aria-hidden
            />
            <span className="truncate">{keystone.metaphor}</span>
          </span>
          <span
            className={cn(
              "shrink-0 text-[10px] font-semibold uppercase tracking-wider",
              keystoneStatus === "recalled"
                ? "text-success"
                : keystoneStatus === "watched"
                ? "text-accent"
                : "text-steel-500",
            )}
          >
            {keystoneStatus === "recalled" ? "Recalled" : keystoneStatus === "watched" ? "Watched" : "Story"}
          </span>
        </div>
      ) : null}
    </button>
  );
}
