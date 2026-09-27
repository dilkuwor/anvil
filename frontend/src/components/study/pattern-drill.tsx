"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, X, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/state";
import {
  studyKeys,
  useAnswerDrill,
  useDrill,
  type DrillAnswer,
  type DrillItem,
} from "@/lib/study";
import { cn } from "@/lib/utils";

/** Answers faster than this count as fluent recognition, which the scheduler treats as a confident recall. */
const FLUENT_MS = 8000;

type Outcome = { item: DrillItem; answer: DrillAnswer; fast: boolean };

export function PatternDrill() {
  const drill = useDrill();
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);

  if (drill.isLoading) return <CardSkeleton rows={5} />;
  if (drill.isError)
    return (
      <ErrorState
        message="Unable to load the drill."
        onRetry={() => drill.refetch()}
      />
    );
  const items = drill.data?.items ?? [];
  if (!items.length) {
    return (
      <EmptyState
        title="Nothing to drill yet"
        body="The drill needs problems with written solutions."
      />
    );
  }

  const restart = () => {
    setIndex(0);
    setOutcomes([]);
    void queryClient.invalidateQueries({ queryKey: studyKeys.drill });
  };

  if (index >= items.length) {
    return <Summary outcomes={outcomes} onRestart={restart} />;
  }
  const item = items[index];
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/today"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Today
        </Link>
        <div
          className="flex items-center gap-1.5"
          aria-label={`${index + 1} of ${items.length}`}
        >
          {items.map((entry, i) => {
            const outcome = outcomes[i];
            return (
              <span
                key={entry.problem_id}
                className={cn(
                  "h-1.5 w-4 rounded-full",
                  outcome
                    ? outcome.answer.correct
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                    : i === index
                      ? "bg-accent"
                      : "bg-steel-800",
                )}
                aria-hidden
              />
            );
          })}
        </div>
        <span className="text-[12px] text-muted-foreground">
          {index + 1} of {items.length}
        </span>
      </div>
      <DrillCard
        key={item.problem_id}
        item={item}
        onDone={(answer, fast) => {
          setOutcomes((current) => [...current, { item, answer, fast }]);
          setIndex((current) => current + 1);
        }}
      />
    </div>
  );
}

function DrillCard({
  item,
  onDone,
}: {
  item: DrillItem;
  onDone: (answer: DrillAnswer, fast: boolean) => void;
}) {
  const answer = useAnswerDrill();
  const [choice, setChoice] = useState<number | null>(null);
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, [item.problem_id]);
  const result = answer.data;
  const [fast, setFast] = useState(false);

  function pick(i: number) {
    if (choice !== null || answer.isPending) return;
    const elapsed = startedAt.current
      ? Date.now() - startedAt.current
      : FLUENT_MS;
    const quick = elapsed < FLUENT_MS;
    setFast(quick);
    setChoice(i);
    answer.mutate({
      problemId: item.problem_id,
      choice: i,
      confidence: quick ? "sure" : "unsure",
      timeMs: Math.min(elapsed, 3_600_000),
    });
  }

  function next() {
    if (result) onDone(result, fast);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (result) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          next();
        }
        return;
      }
      const number = Number(event.key);
      if (
        Number.isInteger(number) &&
        number >= 1 &&
        number <= item.options.length
      ) {
        event.preventDefault();
        pick(number - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, choice, answer.isPending, item.options.length]);

  return (
    <SectionCard className="flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-600 dark:text-amber-300">
        <Zap className="h-3.5 w-3.5" aria-hidden />
        Which pattern solves this?
        <span className="ml-auto">
          <DifficultyBadge difficulty={item.difficulty} />
        </span>
      </div>
      <p className="text-[15.5px] leading-relaxed text-foreground">
        {item.statement}
      </p>
      {item.example_input ? (
        <p className="rounded-md bg-steel-950/40 px-3 py-2 font-mono text-[12.5px] text-muted-foreground">
          {item.example_input} → {item.example_output}
        </p>
      ) : null}
      <ul className="grid gap-2 sm:grid-cols-2">
        {item.options.map((option, i) => {
          const selected = choice === i;
          const showRight = result !== undefined && result.correct_index === i;
          const showWrong = result !== undefined && selected && !result.correct;
          return (
            <li key={option}>
              <button
                type="button"
                disabled={choice !== null}
                onClick={() => pick(i)}
                aria-pressed={selected}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-[14px] transition-colors disabled:cursor-default",
                  showRight
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : showWrong
                      ? "border-amber-500/50 bg-amber-500/10"
                      : selected
                        ? "border-accent bg-accent/10"
                        : "border-steel-800 bg-steel-900/60 hover:border-steel-700 hover:bg-steel-800/60",
                )}
              >
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-steel-700 text-[11px] text-muted-foreground">
                  {showRight ? (
                    <Check className="h-3 w-3 text-emerald-500" aria-hidden />
                  ) : showWrong ? (
                    <X className="h-3 w-3 text-amber-500" aria-hidden />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="font-medium text-foreground">{option}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {answer.isError ? (
        <p className="text-[13px] text-coral">
          Could not record the answer. Try again.
        </p>
      ) : null}
      {result ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-3",
            result.correct
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-amber-500/30 bg-amber-500/5",
          )}
        >
          <p className="text-[13px] font-semibold text-foreground">
            {result.correct
              ? fast
                ? "Right, and fast."
                : "Right."
              : `Not quite. It is ${result.family}.`}
            <span className="ml-2 font-normal text-muted-foreground">
              {result.pattern}
            </span>
          </p>
          <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
            {result.family_hint}
          </p>
          {result.trigger ? (
            <p className="mt-1 text-[13px] leading-6 text-foreground/90">
              <span className="font-medium">Trigger:</span> {result.trigger}
            </p>
          ) : null}
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <Link
              href={result.href}
              className="text-[13px] font-medium text-accent hover:underline"
            >
              {result.title} →
            </Link>
            <Button size="sm" onClick={next}>
              Next
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-[11.5px] text-muted-foreground/80">
          Press 1 to 4 to answer.
        </p>
      )}
    </SectionCard>
  );
}

function Summary({
  outcomes,
  onRestart,
}: {
  outcomes: Outcome[];
  onRestart: () => void;
}) {
  const right = outcomes.filter((item) => item.answer.correct).length;
  const fast = outcomes.filter(
    (item) => item.answer.correct && item.fast,
  ).length;
  const missed = outcomes.filter((item) => !item.answer.correct);
  return (
    <div className="mx-auto w-full max-w-2xl">
      <SectionCard className="p-5 sm:p-6">
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          Drill done
        </h2>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          {right} of {outcomes.length} right, {fast} recognised fast. Missed
          ones come back sooner in review.
        </p>
        {missed.length ? (
          <ul className="mt-4 space-y-2">
            {missed.map(({ answer }) => (
              <li
                key={answer.href}
                className="rounded-lg border border-steel-800 px-3 py-2 text-[13px]"
              >
                <Link
                  href={answer.href}
                  className="font-semibold text-foreground hover:text-accent"
                >
                  {answer.title}
                </Link>
                <span className="text-muted-foreground">
                  {" "}
                  · {answer.family}
                </span>
                {answer.trigger ? (
                  <p className="mt-0.5 text-muted-foreground">
                    {answer.trigger}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[13px] text-emerald-600 dark:text-emerald-300">
            Every pattern named. Nice.
          </p>
        )}
        <div className="mt-5 flex items-center gap-2">
          <Button onClick={onRestart}>Drill again</Button>
          <Button asChild variant="secondary">
            <Link href="/today">Back to Today</Link>
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
