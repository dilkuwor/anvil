"use client";

import { createContext, useContext } from "react";

import type { SpeechSection } from "@/lib/lesson-speech";

export type ReaderStatus = "idle" | "loading" | "playing" | "paused";

export type LessonReaderValue = {
  status: ReaderStatus;
  sections: SpeechSection[];
  /** Index into `sections` of the clip being read. */
  index: number;
  /** Heading id of the section being read, or null when idle. */
  activeId: string | null;
  speed: number;
  /** Start from the beginning, from a saved position, or from a given clip. */
  play: (index?: number) => void;
  /** Start reading at the first clip that belongs to a heading. */
  playSection: (id: string) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  stop: () => void;
  setSpeed: (speed: number) => void;
};

export const LessonReaderContext = createContext<LessonReaderValue | null>(null);

export function useLessonReader(): LessonReaderValue | null {
  return useContext(LessonReaderContext);
}
