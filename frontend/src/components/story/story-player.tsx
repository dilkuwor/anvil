"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Maximize2, Minimize2, RotateCcw, X } from "lucide-react";

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
  large: boolean;
  done: boolean;
  watched?: boolean;
  recalled?: boolean;
};

function storageKey(slug: string) {
  return `ia:story:${slug}`;
}

export function loadSavedStory(slug: string): Saved {
  const fallback: Saved = { example: 0, index: 0, large: false, done: false, watched: false, recalled: false };
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

/**
 * User-paced on purpose: nothing moves until the reader asks for the next step,
 * and the place is remembered so a session can be picked up later.
 */
export function StoryPlayer({ story, slug }: { story: AnyProblemStory; slug: string }) {
  const [saved] = useState(() => loadSavedStory(slug));
  const [example, setExample] = useState(() => Math.min(saved.example, story.examples.length - 1));
  const [index, setIndex] = useState(saved.index);
  const [large, setLarge] = useState(saved.large);
  const [done, setDone] = useState(saved.done);
  const [watched, setWatched] = useState(() => saved.watched ?? saved.done ?? false);
  const [recalled, setRecalled] = useState(() => saved.recalled ?? false);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [rejected, setRejected] = useState<Record<number, number[]>>({});
  const [revealed, setRevealed] = useState(false);
  // Full screen puts the picture beside the code and quiz, so nothing needs scrolling.
  const [full, setFull] = useState(false);

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
          large,
          done,
          watched,
          recalled,
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
  }, [slug, example, current, large, done, watched, recalled]);

  function go(next: number) {
    const target = Math.max(0, Math.min(frames.length - 1, next));
    setIndex(target);
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

  const body = large ? "text-[16px]" : "text-[13.5px]";

  const controls = (
    <div
      className={cn(
        "flex items-center gap-2",
        full ? "border-t border-steel-800 bg-background px-6 py-3" : "-mx-1 bg-steel-900/95 px-1 py-2 backdrop-blur"
      )}
    >
      <div className={cn("flex items-center gap-2 w-full", full && "mx-auto max-w-6xl")}>
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
      className={cn(
        "outline-none",
        full
          ? "fixed inset-0 z-50 flex flex-col overflow-hidden bg-background"
          : "flex flex-col gap-4"
      )}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Escape") setFull(false);
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
      {/* Top Bar: Stepper & Toolbar */}
      <div className={cn("shrink-0", full ? "border-b border-steel-800 px-6 py-3" : "")}>
        <div className={cn("flex flex-col gap-2.5", full && "mx-auto max-w-6xl w-full")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ol className="flex flex-wrap items-center gap-1.5">
              {SCENES.map((scene, position) => {
                const first = frames.findIndex((item) => item.scene === scene.id);
                if (first < 0) return null;
                return (
                  <li key={scene.id}>
                    <button
                      type="button"
                      aria-current={position === sceneIndex ? "step" : undefined}
                      className={cn(
                        "rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                        position === sceneIndex
                          ? "border-accent bg-accent/15 text-foreground"
                          : position < sceneIndex
                            ? "border-steel-800 text-foreground/80 hover:border-accent/50"
                            : "border-steel-800 text-muted-foreground hover:border-accent/50"
                      )}
                      onClick={() => go(first)}
                    >
                      {position + 1}. {scene.label}
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={large}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[12px] transition-colors",
                  large
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-steel-800 text-muted-foreground hover:border-accent/50 hover:text-foreground"
                )}
                onClick={() => setLarge((value) => !value)}
              >
                Larger text
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-steel-800 px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
                onClick={() => setFull((value) => !value)}
              >
                {full ? <Minimize2 className="h-3.5 w-3.5" aria-hidden /> : <Maximize2 className="h-3.5 w-3.5" aria-hidden />}
                {full ? "Exit full screen" : "Full screen"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
            <span className="font-medium text-foreground/80">Example:</span>
            {story.examples.map((item, position) => (
              <button
                key={item.input}
                type="button"
                title={item.note}
                className={cn(
                  "rounded-md border px-2 py-0.5 font-mono text-[12px] transition-colors",
                  position === example
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-steel-800 hover:border-accent/50 hover:text-foreground"
                )}
                onClick={() => pickExample(position)}
              >
                {item.label}
              </button>
            ))}
            {story.examples[example].note ? (
              <span className="ml-1 text-[12px] text-muted-foreground">
                ({story.examples[example].note})
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Viewport */}
      <div className={cn("flex-1", full ? "overflow-y-auto px-6 py-6" : "")}>
        <div className={cn("w-full", full && "mx-auto max-w-6xl")}>
          <div className={cn("grid gap-6 items-start", full ? "grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]" : "grid-cols-1")}>
            {/* Left Column: Visual Canvas & Step Captions */}
            <div className="flex min-w-0 flex-col gap-4">
              <div className="rounded-xl border border-steel-800/80 bg-steel-950/60 p-4 min-h-[4.25rem] flex items-center">
                <p aria-live="polite" className={cn("font-medium leading-relaxed text-foreground", large ? "text-[18px]" : "text-[15px]")}>
                  {frame.caption}
                </p>
              </div>

              {quiz?.kind === "cell" ? (
                <div className={cn("min-h-[7rem] rounded-xl border px-4 py-3.5 transition-colors", solved ? "border-teal/50 bg-teal/10" : "border-accent/50 bg-accent/10")}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Your turn</div>
                  <p className={cn("mt-1 font-semibold text-foreground", large ? "text-[17px]" : "text-[14.5px]")}>{quiz.question}</p>
                  {choice !== undefined ? (
                    <p aria-live="polite" className={cn("mt-2 flex items-start gap-2 text-foreground/90", body)}>
                      {solved ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-coral" aria-hidden />}
                      <span>{solved ? `Yes. ${quiz.why}` : `${quiz.feedback[choice] ?? quiz.otherwise} Try again.`}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col items-center justify-center rounded-xl border border-steel-800/80 bg-steel-950/40 p-4">
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
                  <p className="mt-2 text-center text-[11.5px] font-medium text-muted-foreground">
                    {story.metaphor.legend}
                  </p>
                ) : null}
              </div>

              {frame.scene === "insight" ? (
                <div className={cn("rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 font-semibold text-foreground", large ? "text-[17px]" : "text-[14px]")}>
                  Remember: {story.insight}
                </div>
              ) : null}
            </div>

            {/* Right column: only what the current step needs — a question, the code, or the memory card. */}
            <div className="flex min-w-0 flex-col gap-4">
              {quiz?.kind === "choice" ? (
                <div className="rounded-xl border border-steel-800 bg-steel-950/60 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Your turn — what happens next?</div>
                  <p className={cn("mt-1.5 font-medium text-foreground", large ? "text-[17px]" : "text-[14px]")}>{quiz.question}</p>
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
                  <pre className={cn("overflow-x-auto rounded-xl border border-steel-800/80 bg-steel-950/60 py-2.5 font-mono leading-6", large ? "text-[14px]" : "text-[12px]")}>
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
                  <p className={cn("mt-2 font-semibold text-foreground", large ? "text-[18px]" : "text-[15px]")}>A new example. You make the moves.</p>
                  <p className={cn("mt-1.5 text-muted-foreground", body)}>
                    When a question appears, answer it by clicking in the picture.
                  </p>
                </div>
              ) : null}

              {frame.scene === "card" && last ? (
                <div className="rounded-xl border border-teal/40 bg-teal/5 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">Memory card · {story.pattern}</div>
                  <p className={cn("mt-2 text-foreground", large ? "text-[18px]" : "text-[15px]")}>
                    You see: <span className="font-semibold">{story.trigger}</span>
                  </p>
                  {revealed ? (
                    <>
                      <p className={cn("mt-3 font-semibold text-foreground", large ? "text-[19px]" : "text-[15px]")}>
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
                      <pre className={cn("mt-1.5 overflow-x-auto rounded-lg border border-steel-800/80 bg-steel-950/60 p-3 font-mono leading-6 text-foreground/90", large ? "text-[13px]" : "text-[11.5px]")}>
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
      <div className={cn("shrink-0", !full && "sticky bottom-0")}>{controls}</div>
    </div>
  );
}
