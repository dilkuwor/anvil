"use client";

import { AudioLines, Loader2, Pause, Play, SkipBack, SkipForward, Square, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  LessonReaderContext,
  useLessonReader,
  type LessonReaderValue,
  type ReaderStatus,
} from "@/components/tts/lesson-reader-context";
import type { SpeechSection } from "@/lib/lesson-speech";
import { fetchSpeech } from "@/lib/tts";
import { cn } from "@/lib/utils";

const SPEED_KEY = "anvil-tts-speed";
/** A silent WAV used to unlock the audio element inside the user's tap (needed on iOS). */
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
const POSITION_PREFIX = "anvil-tts-pos:";
export const SPEEDS = [0.8, 0.9, 1, 1.1, 1.25, 1.5];

function readSpeed(): number {
  try {
    const raw = Number(window.localStorage.getItem(SPEED_KEY));
    return SPEEDS.includes(raw) ? raw : 1;
  } catch {
    return 1;
  }
}

function readPosition(key: string): number {
  try {
    const raw = Number(window.localStorage.getItem(POSITION_PREFIX + key));
    return Number.isInteger(raw) && raw > 0 ? raw : 0;
  } catch {
    return 0;
  }
}

function writePosition(key: string, index: number | null) {
  try {
    if (index === null) window.localStorage.removeItem(POSITION_PREFIX + key);
    else window.localStorage.setItem(POSITION_PREFIX + key, String(index));
  } catch {
    // Browser storage is a convenience only.
  }
}

/** Scrolls the heading of the section being read into view, preferring an open overlay. */
function revealSection(id: string) {
  if (id === "intro" || id === "takeaways") return;
  const matches = Array.from(document.querySelectorAll<HTMLElement>(`[id="${CSS.escape(id)}"]`)).filter(
    (el) => el.getClientRects().length > 0,
  );
  const target = matches[matches.length - 1];
  if (!target) return;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
}

/**
 * Holds the audio player for one lesson. Each section is fetched as its own clip, the
 * next clip is fetched while the current one plays, and the position is remembered so
 * a listener can come back to where they left off.
 */
export function LessonReaderProvider({
  sections,
  storageKey,
  onLocked,
  children,
}: {
  sections: SpeechSection[];
  storageKey: string;
  /** When set, the reader is locked (signed-out user): every attempt to play calls this instead. */
  onLocked?: () => void;
  children: ReactNode;
}) {
  const [status, setStatus] = useState<ReaderStatus>("idle");
  const [index, setIndex] = useState(0);
  // The bar is not rendered while idle, so reading storage here cannot cause a hydration mismatch.
  const [speed, setSpeedState] = useState(() => (typeof window === "undefined" ? 1 : readSpeed()));

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlsRef = useRef<Map<number, string>>(new Map());
  const pendingRef = useRef<Map<number, Promise<string>>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const statusRef = useRef<ReaderStatus>("idle");
  const speedRef = useRef(speed);
  const sectionsRef = useRef(sections);
  const playIndexRef = useRef<(at: number) => Promise<void>>(async () => undefined);

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  const setStatusBoth = useCallback((next: ReaderStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  /**
   * One audio element for the whole lesson. It is created and started (silently) inside
   * the user's click so mobile browsers allow later clips to play without another tap.
   */
  const ensureAudio = useCallback((): HTMLAudioElement => {
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audio.preload = "auto";
      audioRef.current = audio;
    }
    if (!audio.src || audio.src === SILENCE) {
      audio.src = SILENCE;
      audio.play().catch(() => undefined);
    }
    return audio;
  }, []);

  const releaseAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    }
  }, []);

  const stop = useCallback(() => {
    generationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    pendingRef.current.clear();
    releaseAudio();
    setStatusBoth("idle");
  }, [releaseAudio, setStatusBoth]);

  // Free cached clips when the lesson changes or the page goes away.
  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      stop();
      const audio = audioRef.current;
      if (audio) {
        audio.removeAttribute("src");
        audio.load();
        audioRef.current = null;
      }
      for (const url of urls.values()) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, [storageKey, stop]);

  const loadClip = useCallback((at: number): Promise<string> => {
    const cached = urlsRef.current.get(at);
    if (cached) return Promise.resolve(cached);
    const pending = pendingRef.current.get(at);
    if (pending) return pending;
    const section = sectionsRef.current[at];
    if (!section) return Promise.reject(new Error("No such section."));
    if (!abortRef.current) abortRef.current = new AbortController();
    const promise = fetchSpeech(section.text, abortRef.current.signal)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        urlsRef.current.set(at, url);
        return url;
      })
      .finally(() => pendingRef.current.delete(at));
    pendingRef.current.set(at, promise);
    return promise;
  }, []);

  const playIndex = useCallback(
    async (at: number) => {
      const total = sectionsRef.current.length;
      if (at < 0 || at >= total) {
        stop();
        writePosition(storageKey, null);
        return;
      }
      const generation = ++generationRef.current;
      releaseAudio();
      if (!abortRef.current) abortRef.current = new AbortController();
      setIndex(at);
      setStatusBoth("loading");
      writePosition(storageKey, at);
      try {
        const url = await loadClip(at);
        if (generation !== generationRef.current) return;
        const audio = ensureAudio();
        audio.src = url;
        audio.playbackRate = speedRef.current;
        audio.onended = () => {
          if (generation !== generationRef.current) return;
          void playIndexRef.current(at + 1);
        };
        audio.onerror = () => {
          if (generation !== generationRef.current) return;
          toast.error("Unable to play the audio.");
          stop();
        };
        await audio.play();
        if (generation !== generationRef.current) return;
        setStatusBoth("playing");
        revealSection(sectionsRef.current[at].id);
        if (at + 1 < total) loadClip(at + 1).catch(() => undefined);
      } catch (error) {
        if (generation !== generationRef.current) return;
        toast.error(error instanceof Error ? error.message : "Unable to start the reader.");
        stop();
      }
    },
    [ensureAudio, loadClip, releaseAudio, setStatusBoth, stop, storageKey],
  );

  useEffect(() => {
    playIndexRef.current = playIndex;
  }, [playIndex]);

  const play = useCallback(
    (at?: number) => {
      if (onLocked) {
        onLocked();
        return;
      }
      if (!sectionsRef.current.length) {
        toast.error("Nothing to read on this page.");
        return;
      }
      ensureAudio();
      if (at === undefined) {
        const saved = readPosition(storageKey);
        at = saved < sectionsRef.current.length ? saved : 0;
      }
      void playIndex(at);
    },
    [ensureAudio, onLocked, playIndex, storageKey],
  );

  const playSection = useCallback(
    (id: string) => {
      if (onLocked) {
        onLocked();
        return;
      }
      const at = sectionsRef.current.findIndex((section) => section.id === id);
      if (at < 0) return;
      ensureAudio();
      void playIndex(at);
    },
    [ensureAudio, onLocked, playIndex],
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (statusRef.current === "playing" && audio) {
      audio.pause();
      setStatusBoth("paused");
      return;
    }
    if (statusRef.current === "paused" && audio) {
      void audio.play().then(() => setStatusBoth("playing"));
      return;
    }
    if (statusRef.current === "idle") play();
  }, [play, setStatusBoth]);

  const next = useCallback(() => {
    void playIndex(index + 1);
  }, [index, playIndex]);

  const previous = useCallback(() => {
    void playIndex(Math.max(0, index - 1));
  }, [index, playIndex]);

  const setSpeed = useCallback((value: number) => {
    speedRef.current = value;
    setSpeedState(value);
    if (audioRef.current) audioRef.current.playbackRate = value;
    try {
      window.localStorage.setItem(SPEED_KEY, String(value));
    } catch {
      // Browser storage is a convenience only.
    }
  }, []);

  const value = useMemo<LessonReaderValue>(
    () => ({
      status,
      sections,
      index,
      activeId: status === "idle" ? null : (sections[index]?.id ?? null),
      speed,
      play,
      playSection,
      toggle,
      next,
      previous,
      stop,
      setSpeed,
    }),
    [status, sections, index, speed, play, playSection, toggle, next, previous, stop, setSpeed],
  );

  return <LessonReaderContext.Provider value={value}>{children}</LessonReaderContext.Provider>;
}

/** The Listen / Stop trigger that sits in a toolbar. */
export function LessonReaderButton({ iconOnly = false, className }: { iconOnly?: boolean; className?: string }) {
  const reader = useLessonReader();
  if (!reader) return null;
  const active = reader.status !== "idle";
  const label = active ? "Stop reading" : "Listen to this lesson";
  return (
    <Button
      type="button"
      size={iconOnly ? "icon" : "sm"}
      variant="ghost"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "shrink-0 text-muted-foreground hover:text-accent",
        iconOnly && "h-9 w-9 hover:bg-background hover:text-foreground",
        active && "text-accent",
        className,
      )}
      onClick={() => (active ? reader.stop() : reader.play())}
    >
      {active ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      {iconOnly ? null : <span className="ml-1.5">{active ? "Stop" : "Listen"}</span>}
    </Button>
  );
}

/** Transport controls shown while a lesson is being read. */
export function LessonReaderBar({ className }: { className?: string }) {
  const reader = useLessonReader();
  if (!reader || reader.status === "idle") return null;
  const { status, sections, index, speed } = reader;
  const section = sections[index];
  const total = sections.length;
  const loading = status === "loading";

  return (
    <div
      role="region"
      aria-label="Lesson reader"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-accent/25 bg-accent/[0.06] px-3 py-2",
        className,
      )}
    >
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Previous section"
          title="Previous section"
          onClick={reader.previous}
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          className="h-9 w-9 rounded-full bg-accent text-white hover:bg-accent-light"
          aria-label={status === "playing" ? "Pause" : "Play"}
          title={status === "playing" ? "Pause" : "Play"}
          disabled={loading}
          onClick={reader.toggle}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === "playing" ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="ml-0.5 h-4 w-4" />
          )}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Next section"
          title="Next section"
          disabled={index + 1 >= total}
          onClick={reader.next}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-w-0 flex-1" aria-live="polite">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
          {loading ? "Loading" : status === "paused" ? "Paused" : "Reading"} · {index + 1} of {total}
        </p>
        <p className="truncate text-xs font-medium text-foreground">
          {section?.title}
          {section?.part ? <span className="text-muted-foreground"> · part {section.part}</span> : null}
        </p>
      </div>

      <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="sr-only">Reading speed</span>
        <select
          value={speed}
          onChange={(event) => reader.setSpeed(Number(event.target.value))}
          className="h-7 rounded-md border border-steel-700 bg-steel-900 px-1.5 text-[11px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
          aria-label="Reading speed"
        >
          {SPEEDS.map((value) => (
            <option key={value} value={value}>
              {value}×
            </option>
          ))}
        </select>
      </label>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label="Stop reading"
        title="Stop"
        onClick={reader.stop}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** Small speaker on a heading: play just that section, and show when it is being read. */
export function SectionListenButton({ id, className }: { id: string; className?: string }) {
  const reader = useLessonReader();
  if (!reader || !reader.sections.some((section) => section.id === id)) return null;
  const active = reader.activeId === id;
  return (
    <button
      type="button"
      aria-label={active ? "Reading this section" : "Listen to this section"}
      title={active ? "Reading this section" : "Listen to this section"}
      className={cn(
        "ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-steel-800 hover:text-accent",
        active && "text-accent",
        className,
      )}
      onClick={() => (active ? reader.toggle() : reader.playSection(id))}
    >
      {active ? (
        <AudioLines className={cn("h-3.5 w-3.5", reader.status === "playing" && "reader-wave")} />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
