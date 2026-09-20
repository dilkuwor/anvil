"use client";

import { Check, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

import { getStory } from "./registry";
import { getStoryProgress } from "./story-player";

function subscribe(callback: () => void) {
  window.addEventListener("ia:story:update", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("ia:story:update", callback);
    window.removeEventListener("storage", callback);
  };
}

/** Subscribes to visual story state in this browser. */
export function useStoryProgressState(slug: string): { watched: boolean; recalled: boolean } {
  const state = useSyncExternalStore(
    subscribe,
    () => {
      const p = getStoryProgress(slug);
      return `${p.watched ? 1 : 0}-${p.recalled ? 1 : 0}`;
    },
    () => "0-0",
  );
  const [w, r] = state.split("-").map((v) => v === "1");
  return { watched: w, recalled: r };
}

/** Whether the reader has finished a problem's Visual Story. Lives in this browser only. */
export function useStoryWatched(slug: string): boolean {
  return useStoryProgressState(slug).watched;
}

/** Small link shown beside a problem that has a Visual Story. Opens the problem straight on the story. */
export function StoryBadge({ slug, className }: { slug: string; className?: string }) {
  const { watched, recalled } = useStoryProgressState(slug);
  if (!getStory(slug)) return null;

  return (
    <Link
      href={`/problems/${slug}?tab=story`}
      title={
        recalled
          ? "Visual Story · Recalled"
          : watched
          ? "Visual Story · Watched (Practice pending)"
          : "Open the Visual Story"
      }
      aria-label={
        recalled
          ? "Visual Story, Recalled"
          : watched
          ? "Visual Story, Watched"
          : "Open the Visual Story"
      }
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10.5px] font-medium transition-colors",
        recalled
          ? "border-success/50 bg-success/10 text-success hover:bg-success/20"
          : watched
          ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
          : "border-steel-700 bg-steel-800/40 text-muted-foreground hover:border-accent/50 hover:text-foreground",
        className,
      )}
    >
      {recalled ? (
        <Check className="h-3 w-3 text-success" aria-hidden />
      ) : (
        <PlayCircle
          className={cn("h-3 w-3", watched ? "text-accent" : "text-muted-foreground")}
          aria-hidden
        />
      )}
      {recalled ? "Recalled" : watched ? "Watched" : "Story"}
    </Link>
  );
}
