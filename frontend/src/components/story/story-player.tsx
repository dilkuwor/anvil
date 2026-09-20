"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { SCENES, type AnyProblemStory } from "./types";

export type StoryProgress = {
  watched: boolean;
  recalled: boolean;
};

type Saved = {
  example: number;
  index: number;
  done: boolean;
  watched?: boolean;
  recalled?: boolean;
  /** Scenes the reader has read to their last step. */
  read?: string[];
};

function storageKey(slug: string) {
  return `ia:story:${slug}`;
}

export function loadSavedStory(slug: string): Saved {
  const fallback: Saved = { example: 0, index: 0, done: false, watched: false, recalled: false };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      ...fallback,
      ...parsed,
      watched: parsed.watched ?? parsed.done ?? false,
      recalled: parsed.recalled ?? false,
    };
  } catch {
    return fallback;
  }
}

export function isStoryDone(slug: string): boolean {
  return loadSavedStory(slug).done;
}

export function isStoryWatched(slug: string): boolean {
  const saved = loadSavedStory(slug);
  return Boolean(saved.watched || saved.done);
}

export function isStoryRecalled(slug: string): boolean {
  return Boolean(loadSavedStory(slug).recalled);
}

export function getStoryProgress(slug: string): StoryProgress {
  const saved = loadSavedStory(slug);
  return {
    watched: Boolean(saved.watched || saved.done),
    recalled: Boolean(saved.recalled),
  };
}

// Text sizes: [in the problem pane, in focus mode]. Focus has the room, so it reads larger.
const SIZES = {
  body: ["text-[13.5px]", "text-[16px]"],
  caption: ["text-[15px]", "text-[18px]"],
  heading: ["text-[14.5px]", "text-[17px]"],
  code: ["text-[12px]", "text-[14px]"],
  small: ["text-[11.5px]", "text-[13px]"],
} as const;

/**
 * 5-Act progression stepper: clear numbered stages with act labels,
 * completion checkmarks, active highlighting, and per-act micro-progress.
 */
function ActStepper({
  frames,
  current,
  readScenes,
  watched,
  onJump,
}: {
  frames: { scene: string }[];
  current: number;
  readScenes: string[];
  watched: boolean;
  onJump: (index: number) => void;
}) {
  const present = SCENES.map((scene, position) => {
    const first = frames.findIndex((item) => item.scene === scene.id);
    const count = frames.filter((item) => item.scene === scene.id).length;
    return { ...scene, position, first, count };
  }).filter((scene) => scene.first >= 0);

  return (
    <div
      role="tablist"
      aria-label="Story acts"
      className="grid grid-cols-5 gap-1 rounded-xl border border-steel-800/80 bg-steel-950/70 p-1 backdrop-blur-sm shadow-inner"
    >
      {present.map((scene, index) => {
        const end = scene.first + scene.count - 1;
        const here = current >= scene.first && current <= end;
        const read = watched || readScenes.includes(scene.id) || current > end;
        const progress = here
          ? Math.min(1, Math.max(0, (current - scene.first + 1) / scene.count))
          : read
            ? 1
            : 0;

        return (
          <button
            key={scene.id}
            type="button"
            role="tab"
            aria-selected={here}
            aria-label={`${index + 1}. ${scene.label}`}
            title={`${index + 1}. ${scene.label} (${scene.count} step${scene.count === 1 ? "" : "s"})`}
            onClick={() => onJump(scene.first)}
            className={cn(
              "group relative flex flex-col items-center justify-center gap-1 rounded-lg py-1.5 px-1 sm:px-2 transition-all duration-200 outline-none select-none cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              here
                ? "bg-accent/15 border border-accent/50 text-foreground font-semibold shadow-xs"
                : read
                  ? "bg-steel-900/60 border border-steel-800/60 text-foreground/85 hover:bg-steel-850 hover:text-foreground hover:border-steel-750"
                  : "bg-transparent border border-transparent text-muted-foreground/60 hover:bg-steel-900/40 hover:text-muted-foreground"
            )}
          >
            <div className="flex w-full items-center justify-center gap-1.5 min-w-0">
              {read && !here ? (
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal/20 text-teal transition-colors">
                  <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                </div>
              ) : (
                <div
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                    here
                      ? "bg-accent text-steel-950 shadow-xs"
                      : "bg-steel-800 text-muted-foreground/80 group-hover:text-muted-foreground"
                  )}
                >
                  {index + 1}
                </div>
              )}
              <span className="truncate text-xs font-medium tracking-tight hidden lg:inline">
                {scene.label}
              </span>
              <span className="truncate text-[11px] font-medium tracking-tight lg:hidden">
                {scene.short}
              </span>
            </div>

            {/* Progress track at bottom of each segment */}
            <div className="w-full h-1 rounded-full bg-steel-800/60 overflow-hidden mt-0.5">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300 ease-out motion-reduce:transition-none",
                  here ? "bg-accent" : read ? "bg-teal/70" : "bg-transparent"
                )}
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Interactive example selector with input preview and notes, or static pill when single example.
 */
function ExampleSelector({
  examples,
  selected,
  onSelect,
  compact = false,
}: {
  examples: { label: string; input: string; expected: string; note?: string }[];
  selected: number;
  onSelect: (index: number) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const currentExample = examples[selected] ?? examples[0];

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Choose dataset example"
        title={
          currentExample.note
            ? `Data: ${currentExample.label} — ${currentExample.note}`
            : `Data: ${currentExample.label}`
        }
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex h-8 items-center justify-center rounded-lg border transition-colors cursor-pointer",
          compact
            ? "w-8 p-0"
            : "gap-1.5 px-2.5 font-mono text-[11px]",
          open
            ? "border-accent/50 bg-steel-850 text-accent shadow-xs"
            : "border-steel-800 bg-steel-900/80 text-muted-foreground hover:border-steel-750 hover:bg-steel-850 hover:text-foreground"
        )}
      >
        <Filter className="h-3.5 w-3.5 shrink-0" />
        {!compact ? (
          <>
            <span className="truncate max-w-[120px] font-medium">{currentExample.label}</span>
            <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
          </>
        ) : null}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Story examples"
          className="absolute right-0 top-full mt-1.5 z-40 w-72 max-w-[90vw] rounded-xl border border-steel-750 bg-steel-900/98 p-1.5 shadow-2xl backdrop-blur-md"
        >
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {examples.length > 1 ? "Select Dataset / Example" : "Dataset Details"}
          </div>
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {examples.map((item, index) => {
              const isSelected = index === selected;
              return (
                <button
                  key={item.input}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelect(index);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg px-2.5 py-2 text-left transition-colors cursor-pointer",
                    isSelected
                      ? "bg-accent/15 border border-accent/30 text-foreground"
                      : "border border-transparent text-muted-foreground hover:bg-steel-800/80 hover:text-foreground"
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {item.label}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-accent shrink-0" />}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground/80 truncate w-full">
                    {item.input}
                  </div>
                  {item.note ? (
                    <p className="text-[11px] text-muted-foreground/90 leading-tight line-clamp-2 mt-0.5">
                      {item.note}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * User-paced on purpose: nothing moves until the reader asks for the next step,
 * and the place is remembered so a session can be picked up later.
 */
export function StoryPlayer({ story, slug, startFocused = false }: { story: AnyProblemStory; slug: string; startFocused?: boolean }) {
  const [saved] = useState(() => loadSavedStory(slug));
  const [example, setExample] = useState(() => Math.min(saved.example, story.examples.length - 1));
  const [index, setIndex] = useState(saved.index);
  const [readScenes, setReadScenes] = useState<string[]>(() => saved.read ?? []);
  const [done, setDone] = useState(saved.done);
  const [watched, setWatched] = useState(() => saved.watched ?? saved.done ?? false);
  const [recalled, setRecalled] = useState(() => saved.recalled ?? false);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [rejected, setRejected] = useState<Record<number, number[]>>({});
  const [revealed, setRevealed] = useState(false);
  // Focus mode takes the story out of the problem pane: two columns, larger type.
  const [focus, setFocus] = useState(startFocused);
  const rootRef = useRef<HTMLDivElement>(null);

  const frames = useMemo(() => story.frames(story.examples[example].input), [story, example]);
  const current = Math.min(index, frames.length - 1);
  const frame = frames[current];
  const last = current >= frames.length - 1;
  const sceneIndex = SCENES.findIndex((scene) => scene.id === frame.scene);
  const View = story.View;
  const quiz = frame.quiz;
  const choice = picked[current];
  // A "cell" question stays open until the right box is found; a wrong click teaches, it does not end it.
  const solved = quiz ? (quiz.kind === "cell" ? choice === quiz.answer : choice !== undefined) : true;
  const waiting = !solved;

  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey(slug),
        JSON.stringify({
          example,
          index: current,
          done,
          watched,
          recalled,
          read: readScenes,
        })
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("ia:story:update", {
            detail: {
              slug,
              watched,
              recalled,
            },
          })
        );
      }
    } catch {
      // Private mode: the story still works, it just will not remember the place.
    }
  }, [slug, example, current, done, watched, recalled, readScenes]);

  useEffect(() => {
    if (!focus) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    rootRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [focus]);

  function go(next: number) {
    const target = Math.max(0, Math.min(frames.length - 1, next));
    setIndex(target);
    const landed = frames[target];
    if (landed && frames[target + 1]?.scene !== landed.scene) {
      setReadScenes((value) => (value.includes(landed.scene) ? value : [...value, landed.scene]));
    }
    const targetFrame = frames[target];
    if (targetFrame?.scene === "card" && !watched) {
      setWatched(true);
    }
    if (target >= frames.length - 1) {
      if (!done) setDone(true);
      if (targetFrame?.scene === "card" && !targetFrame.quiz && !recalled) {
        setRecalled(true);
      }
    }
  }

  function pickExample(next: number) {
    setExample(next);
    setIndex(0);
    setPicked({});
    setRejected({});
    setRevealed(false);
  }

  function handlePickCell(cell: number) {
    if (quiz?.kind !== "cell" || solved) return;
    setPicked((value) => ({ ...value, [current]: cell }));
    if (cell !== quiz.answer) {
      setRejected((prev) => {
        const currentList = prev[current] ?? [];
        return currentList.includes(cell) ? prev : { ...prev, [current]: [...currentList, cell] };
      });
    } else if (last && frame.scene === "card" && !recalled) {
      setRecalled(true);
      if (!done) setDone(true);
    }
  }

  function handlePickChoice(position: number) {
    setPicked((value) => ({ ...value, [current]: position }));
    if (last && frame.scene === "card" && quiz?.kind === "choice" && position === quiz.answer && !recalled) {
      setRecalled(true);
      if (!done) setDone(true);
    }
  }

  const step = focus ? 1 : 0;
  const body = SIZES.body[step];
  const caption = SIZES.caption[step];
  const heading = SIZES.heading[step];
  // The right column exists only when this step has something to put in it.
  const hasSide = quiz?.kind === "choice" || frame.scene === "solution" || frame.scene === "card";

  const controls = (
    <div
      className={cn(
        "flex items-center gap-2",
        focus ? "border-t border-steel-800 bg-background px-6 py-3" : "-mx-5 border-t border-steel-800/80 bg-steel-900 px-5 py-2.5"
      )}
    >
      <div className={cn("flex items-center gap-2 w-full", focus && "mx-auto max-w-6xl")}>
        <Button variant="secondary" disabled={current === 0} onClick={() => go(current - 1)}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Back
        </Button>
        <Button className="flex-1" disabled={last || waiting} onClick={() => go(current + 1)}>
          {waiting ? (quiz?.kind === "cell" ? (quiz.numbered ? "Click in the picture (or press its number)" : "Click in the picture") : "Answer to continue") : last ? "End of story" : "Next"}
          {waiting || last ? null : <ChevronRight className="h-4 w-4" aria-hidden />}
        </Button>
        {waiting ? (
          <Button variant="ghost" onClick={() => go(current + 1)}>
            Skip
          </Button>
        ) : null}
        <Button variant="ghost" aria-label="Start over" onClick={() => pickExample(example)}>
          <RotateCcw className="h-4 w-4" aria-hidden />
        </Button>
        <span className="w-16 text-right text-[12px] tabular-nums text-muted-foreground">
          {current + 1} / {frames.length}
        </span>
      </div>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={cn(
        "outline-none",
        focus
          ? "fixed inset-0 z-50 flex flex-col overflow-hidden bg-background"
          : "flex flex-col gap-4"
      )}
      tabIndex={0}
      onKeyDown={(event) => {
        const tag = (event.target as HTMLElement)?.tagName;
        const typing = tag === "INPUT" || tag === "TEXTAREA" || (event.target as HTMLElement)?.isContentEditable;
        if (event.key === "Escape" && focus) {
          event.preventDefault();
          setFocus(false);
          return;
        }
        if (
          !typing &&
          (event.key === "f" || event.key === "F") &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey
        ) {
          event.preventDefault();
          setFocus((value) => !value);
          return;
        }
        if (quiz?.kind === "cell" && quiz.numbered && !solved && /^[0-9]$/.test(event.key)) {
          const cell = Number(event.key);
          if (cell < quiz.cells) {
            event.preventDefault();
            handlePickCell(cell);
            return;
          }
        }
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowRight" && !waiting) go(current + 1);
        if (event.key === "ArrowLeft") go(current - 1);
      }}
    >
      {/* Top Bar: single streamlined row with stepper and controls */}
      <div className={cn("shrink-0", focus ? "border-b border-steel-800/80 bg-steel-950/60 backdrop-blur-md px-6 py-2.5" : "pb-1")}>
        <div className={cn("flex items-center gap-2", focus && "mx-auto max-w-6xl w-full justify-between")}>
          {focus ? (
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 border border-accent/25 text-accent shadow-xs">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-sm text-foreground tracking-tight">
                {story.metaphor.name}
              </span>
              {recalled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-semibold text-teal border border-teal/30">
                  <Check className="h-2.5 w-2.5 stroke-[2.5]" /> Recalled
                </span>
              ) : watched ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent border border-accent/30">
                  Watched
                </span>
              ) : null}
            </div>
          ) : null}

          {/* Stepper takes main space */}
          <div className={cn("min-w-0 flex-1", focus && "max-w-2xl mx-auto")}>
            <ActStepper
              frames={frames}
              current={current}
              readScenes={readScenes}
              watched={watched}
              onJump={go}
            />
          </div>

          {/* Controls: Data Dropdown (Funnel) + Fullscreen Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            <ExampleSelector
              examples={story.examples}
              selected={example}
              onSelect={pickExample}
              compact={!focus}
            />
            <button
              type="button"
              aria-expanded={focus}
              aria-label={focus ? "Exit fullscreen (Esc)" : "Fullscreen (F)"}
              title={focus ? "Exit fullscreen (Esc)" : "Fullscreen (F)"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-steel-800 bg-steel-900/80 text-muted-foreground transition-colors hover:border-steel-750 hover:bg-steel-850 hover:text-foreground cursor-pointer"
              onClick={() => setFocus((value) => !value)}
            >
              {focus ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport */}
      <div className={cn("flex-1", focus ? "overflow-y-auto px-6 py-6" : "")}>
        <div className={cn("w-full", focus && "mx-auto max-w-6xl")}>
          <div
            className={cn(
              "grid items-start gap-6",
              focus && hasSide ? "grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]" : "grid-cols-1",
              // No code and no question on this step: the picture gets the stage to itself.
              focus && !hasSide && "mx-auto max-w-[56rem]",
            )}
          >
            {/* Left Column: Visual Canvas & Step Captions */}
            <div className="flex min-w-0 flex-col gap-4">
              <div className="rounded-xl border border-steel-800/80 bg-steel-950/60 p-3.5 min-h-[4rem] flex flex-col justify-center">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent">
                    <Sparkles className="h-3 w-3" />
                    {story.metaphor.name}
                  </span>
                  {recalled ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal">
                      <Check className="h-2.5 w-2.5 stroke-[2.5]" /> Recalled
                    </span>
                  ) : watched ? (
                    <span className="text-[10px] font-semibold text-accent/80">
                      Watched
                    </span>
                  ) : null}
                </div>
                <p aria-live="polite" className={cn("font-medium leading-relaxed text-foreground", caption)}>
                  {frame.caption}
                </p>
              </div>

              {quiz?.kind === "cell" ? (
                <div className={cn("min-h-[7rem] rounded-xl border px-4 py-3.5 transition-colors", solved ? "border-teal/50 bg-teal/10" : "border-accent/50 bg-accent/10")}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Your turn</div>
                  <p className={cn("mt-1 font-semibold text-foreground", heading)}>{quiz.question}</p>
                  {choice !== undefined ? (
                    <p aria-live="polite" className={cn("mt-2 flex items-start gap-2 text-foreground/90", body)}>
                      {solved ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-coral" aria-hidden />}
                      <span>{solved ? `Yes. ${quiz.why}` : `${quiz.feedback[choice] ?? quiz.otherwise} Try again.`}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* Pictures cap themselves at 320px; here the stage decides, so the picture fits the room it has. */}
              <div
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border border-steel-800/80 bg-steel-950/40 p-4",
                  focus ? (hasSide ? "[&_svg]:!max-h-[min(52vh,30rem)]" : "[&_svg]:!max-h-[min(58vh,36rem)]") : "[&_svg]:!max-h-[min(40vh,20rem)]",
                )}
              >
                <View
                  state={frame.state}
                  pick={
                    quiz?.kind === "cell"
                      ? {
                          onPick: solved ? () => undefined : handlePickCell,
                          picked: choice ?? null,
                          answer: quiz.answer,
                          rejected: rejected[current] ?? [],
                        }
                      : undefined
                  }
                />
                {sceneIndex >= 2 ? (
                  <p className={cn("mt-2 text-center font-medium text-muted-foreground", SIZES.small[step])}>
                    {story.metaphor.legend}
                  </p>
                ) : null}
              </div>

              {frame.scene === "insight" ? (
                <div className={cn("rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 font-semibold text-foreground", heading)}>
                  Remember: {story.insight}
                </div>
              ) : null}
            </div>

            {/* Right column: only what the current step needs — a question, the code, or the memory card. */}
            <div className="flex min-w-0 flex-col gap-4">
              {quiz?.kind === "choice" ? (
                <div className="rounded-xl border border-steel-800 bg-steel-950/60 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Your turn — what happens next?</div>
                  <p className={cn("mt-1.5 font-medium text-foreground", heading)}>{quiz.question}</p>
                  <div className="mt-3 flex flex-col gap-2">
                    {quiz.options.map((option, position) => {
                      const right = position === quiz.answer;
                      const chosen = choice === position;
                      return (
                        <button
                          key={option}
                          type="button"
                          disabled={choice !== undefined}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                            body,
                            choice === undefined && "border-steel-800 hover:border-accent/60",
                            choice !== undefined && right && "border-teal bg-teal/10 text-foreground",
                            choice !== undefined && chosen && !right && "border-coral bg-coral/10 text-foreground",
                            choice !== undefined && !chosen && !right && "border-steel-800 text-muted-foreground"
                          )}
                          onClick={() => handlePickChoice(position)}
                        >
                          {choice !== undefined && right ? <Check className="h-4 w-4 shrink-0 text-teal" aria-hidden /> : null}
                          {choice !== undefined && chosen && !right ? <X className="h-4 w-4 shrink-0 text-coral" aria-hidden /> : null}
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {choice !== undefined ? (
                    <p className={cn("mt-3 text-foreground/90", body)}>
                      {choice === quiz.answer ? "Correct. " : "Not quite. "}
                      {quiz.why}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {frame.scene === "solution" ? (
                <div className="flex flex-col gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Algorithm Execution
                  </div>
                  <pre className={cn("overflow-x-auto rounded-xl border border-steel-800/80 bg-steel-950/60 py-2.5 font-mono leading-6", SIZES.code[step])}>
                    {story.code.map((line, position) => (
                      <div
                        key={position}
                        className={cn(
                          "px-3 transition-colors duration-150",
                          position === frame.codeLine
                            ? "border-l-2 border-accent bg-accent/15 text-foreground font-semibold"
                            : "border-l-2 border-transparent text-muted-foreground"
                        )}
                      >
                        {line || " "}
                      </div>
                    ))}
                  </pre>
                </div>
              ) : null}

              {/* Deliberately no rules here: the practice run is recall, so the panel must not hand over the answers. */}
              {frame.scene === "card" && !last ? (
                <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Practice run · your turn</div>
                  <p className={cn("mt-2 font-semibold text-foreground", caption)}>A new example. You make the moves.</p>
                  <p className={cn("mt-1.5 text-muted-foreground", body)}>
                    When a question appears, answer it by clicking in the picture.
                  </p>
                </div>
              ) : null}

              {frame.scene === "card" && last ? (
                <div className="rounded-xl border border-teal/40 bg-teal/5 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">Memory card · {story.pattern}</div>
                  <p className={cn("mt-2 text-foreground", caption)}>
                    You see: <span className="font-semibold">{story.trigger}</span>
                  </p>
                  {revealed ? (
                    <>
                      <p className={cn("mt-3 font-semibold text-foreground", caption)}>
                        {story.metaphor.name}: {story.insight}
                      </p>
                      <dl className={cn("mt-3 space-y-1.5 text-foreground/90", body)}>
                        {story.traps.map((trap) => (
                          <div key={trap.name}>
                            <dt className="inline font-semibold text-coral">{trap.name}: </dt>
                            <dd className="inline">{trap.rule}</dd>
                          </div>
                        ))}
                        <div>
                          <dt className="inline font-semibold">Time {story.complexity.time}: </dt>
                          <dd className="inline">
                            {story.complexity.timeWhy}. The slow way is {story.complexity.slow}.
                          </dd>
                        </div>
                        <div>
                          <dt className="inline font-semibold">Space {story.complexity.space}: </dt>
                          <dd className="inline">{story.complexity.spaceWhy}.</dd>
                        </div>
                      </dl>
                      <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">The same skeleton every time</div>
                      <pre className={cn("mt-1.5 overflow-x-auto rounded-lg border border-steel-800/80 bg-steel-950/60 p-3 font-mono leading-6 text-foreground/90", SIZES.small[step])}>
                        {story.template.join("\n")}
                      </pre>
                      {story.siblings.length ? (
                        <div className="mt-3 text-[13px] text-muted-foreground">
                          Same skeleton:{" "}
                          {story.siblings.map((item, position) => (
                            <span key={item.slug}>
                              {position ? " · " : ""}
                              <Link href={`/problems/${item.slug}`} className="text-accent hover:underline">
                                {item.title}
                              </Link>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="mt-3">
                      <p className={cn("text-foreground/90", body)}>What do you think of? Say the picture and the trap in your head first.</p>
                      <Button className="mt-3" onClick={() => setRevealed(true)}>
                        Reveal the card
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Controls Bar */}
      <div className={cn("shrink-0", !focus && "sticky -bottom-4 z-10")}>{controls}</div>
    </div>
  );
}
