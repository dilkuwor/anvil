"use client";

import { useSyncExternalStore } from "react";

import {
  type KeystoneStory,
  KEYSTONE_STORIES,
  recommendNextKeystone,
} from "./roadmap-stories";
import { getStoryProgress, type StoryProgress } from "@/components/story/story-player";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("ia:story:update", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("ia:story:update", callback);
    window.removeEventListener("storage", callback);
  };
}

let cachedProgress: Record<string, StoryProgress> = {};
let cachedSnapshot = "";

function getSnapshot(): string {
  if (typeof window === "undefined") return "{}";
  const map: Record<string, StoryProgress> = {};
  for (const story of KEYSTONE_STORIES) {
    map[story.slug] = getStoryProgress(story.slug);
  }
  const serialized = JSON.stringify(map);
  if (serialized !== cachedSnapshot) {
    cachedSnapshot = serialized;
    cachedProgress = map;
  }
  return cachedSnapshot;
}

function getServerSnapshot(): string {
  return "{}";
}

export function useKeystoneProgress() {
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const progress = cachedProgress;
  const recommended: KeystoneStory | null = recommendNextKeystone(progress);

  return {
    progress,
    recommended,
  };
}
