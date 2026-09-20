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

/** Whether the reader has finished a problem's Visual Story. Lives in this browser only. */
export function useStoryWatched(slug: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => getStoryProgress(slug).watched,
    () => false,
  );
}

/** Small link shown beside a problem that has a Visual Story. Opens the problem straight on the story. */
export function StoryBadge({ slug, className }: { slug: string; className?: string }) {
  const watched = useStoryWatched(slug);
  if (!getStory(slug)) return null;
  return (
    <Link
      href={`/problems/${slug}?tab=story`}
      title={watched ? "Visual Story · finished" : "Open the Visual Story"}
      aria-label={watched ? "Visual Story, finished" : "Open the Visual Story"}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10.5px] font-medium transition-colors",
        watched ? "border-teal/50 bg-teal/10 text-teal hover:bg-teal/20" : "border-accent/40 text-accent hover:bg-accent/10",
        className,
      )}
    >
      {watched ? <Check className="h-3 w-3" aria-hidden /> : <PlayCircle className="h-3 w-3" aria-hidden />}
      Story
    </Link>
  );
}
