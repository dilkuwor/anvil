"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BookOpen, CheckCircle2, Circle, CircleDot, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { AnswerCheckInput, AnswerCheckResult, LearningLessonDetail, LessonCheck as Check } from "@/lib/learn";
import { queryKeys } from "@/lib/queries";
import { quizHref } from "@/lib/study";
import { cn } from "@/lib/utils";

type Confidence = "sure" | "unsure";

/**
 * The knowledge check at the end of a lesson. One question at a time; a miss shows the
 * explanation and comes back at the end of the round. When every question has been answered
 * correctly once, the lesson marks itself Checked. No score, no gate, no red "failed".
 */
export function LessonCheck({ lesson }: { lesson: LearningLessonDetail }) {
  const checks = useMemo(() => lesson.checks ?? [], [lesson.checks]);
  const state = lesson.check_state ?? { total: checks.length, checked: 0, correct_ids: [], attempted_ids: [] };
  const alreadyChecked = checks.length > 0 && state.checked >= state.total;

  // Decided once per visit: a round in progress keeps its finish screen even after the
  // lesson refetches as checked. The next visit opens on the checked panel.
  const [mode, setMode] = useState<"panel" | "round">(alreadyChecked ? "panel" : "round");
  const [round, setRound] = useState(0);
  if (!checks.length) return null;

  return (
    <section id="knowledge-check" className="scroll-mt-20 rounded-2xl border border-steel-800/90 bg-steel-950/40">
      {mode === "panel" ? (
        <CheckedPanel
          lesson={lesson}
          onAgain={() => {
            setRound((n) => n + 1);
            setMode("round");
          }}
        />
      ) : (
        <Round key={round} lesson={lesson} checks={checks} initialCorrect={round === 0 ? state.correct_ids : []} />
      )}
    </section>
  );
}

function CheckedPanel({ lesson, onAgain }: { lesson: LearningLessonDetail; onAgain: () => void }) {
  const mastered = lesson.learn_state === "mastered";
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className={cn("h-5 w-5", mastered && "fill-emerald-500/25")} />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-foreground">{mastered ? "Lesson mastered" : "Lesson checked"}</p>
          <p className="text-[13px] text-muted-foreground">
            {lesson.review?.next_due_on
              ? `Its questions come back in review. Next one is due ${dueText(lesson.review.next_due_on)}.`
              : "Its questions will come back in review over the next days."}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link href={quizHref(`topic:${lesson.topic_slug}`)} className="text-[12px] font-medium text-accent hover:underline">
          Quiz the whole topic
        </Link>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onAgain}>
          <RotateCcw className="h-3.5 w-3.5" />
          Practice again
        </Button>
      </div>
    </div>
  );
}

function Round({
  lesson,
  checks,
  initialCorrect,
}: {
  lesson: LearningLessonDetail;
  checks: Check[];
  initialCorrect: string[];
}) {
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<string[]>(() => checks.filter((c) => !initialCorrect.includes(c.id)).map((c) => c.id));
  const [correctIds, setCorrectIds] = useState<Set<string>>(() => new Set(initialCorrect));
  const [choice, setChoice] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [compared, setCompared] = useState(false);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [result, setResult] = useState<AnswerCheckResult | null>(null);
  const [finishedRound, setFinishedRound] = useState(false);
  // Time from the first touch of a question to its submit, taken from event timestamps.
  const firstTouch = useRef<number | null>(null);

  const current = checks.find((c) => c.id === queue[0]) ?? null;
  const total = checks.length;
  const position = total - queue.length + 1;

  const answer = useMutation({
    mutationFn: ({ check, body }: { check: Check; body: AnswerCheckInput }) =>
      api.post<AnswerCheckResult>(`/api/v1/learn/lessons/${lesson.id}/checks/${check.id}/answer`, body),
    onSuccess: (out) => {
      setResult(out);
      if (out.correct) setCorrectIds((prev) => new Set(prev).add(out.check_id));
      if (out.just_checked) {
        toast.success("Lesson checked. Its questions will come back in review.");
        queryClient.invalidateQueries({ queryKey: queryKeys.learnLesson(lesson.slug) });
        queryClient.invalidateQueries({ queryKey: queryKeys.learnTopic(lesson.topic_slug) });
        queryClient.invalidateQueries({ queryKey: queryKeys.learnCategories });
        queryClient.invalidateQueries({ queryKey: ["study"] });
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to check that answer."),
  });

  useEffect(() => {
    firstTouch.current = null;
  }, [current?.id]);

  function touch(stamp: number) {
    if (firstTouch.current === null) firstTouch.current = stamp;
  }

  function elapsed(stamp: number): number | undefined {
    return firstTouch.current === null ? undefined : Math.min(Math.round(stamp - firstTouch.current), 3_600_000);
  }

  function submit(stamp: number) {
    if (!current || !confidence) return;
    if (current.kind === "short_answer") return;
    if (choice === null) return;
    answer.mutate({ check: current, body: { choice, confidence, time_ms: elapsed(stamp) } });
  }

  function submitShort(hadIt: boolean, stamp: number) {
    if (!current || !confidence) return;
    answer.mutate({ check: current, body: { text, correct: hadIt, confidence, time_ms: elapsed(stamp) } });
  }

  function next() {
    if (!current || !result) return;
    const rest = queue.slice(1);
    const requeue = result.correct ? rest : [...rest, current.id];
    setQueue(requeue);
    setChoice(null);
    setText("");
    setCompared(false);
    setConfidence(null);
    setResult(null);
    if (!requeue.length) setFinishedRound(true);
  }

  if (finishedRound || !current) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center sm:p-8">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <p className="text-lg font-semibold text-foreground">All {total} checked</p>
        <p className="max-w-md text-[13px] text-muted-foreground">
          The lesson is marked as checked. These questions will come back in your reviews so the ideas stay with you.
        </p>
        <Button asChild size="sm" className="mt-1">
          <Link href="/today">Back to Today</Link>
        </Button>
      </div>
    );
  }

  const isShort = current.kind === "short_answer";
  const canSubmit = confidence !== null && (isShort ? compared : choice !== null) && !answer.isPending;

  return (
    <div className="p-5 sm:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
            <CircleDot className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          </span>
          <h2 className="text-[13px] font-semibold tracking-tight text-foreground">Knowledge check</h2>
          <span className="text-[11px] text-muted-foreground">
            Question {position} of {total}
            {queue.length < total - correctIds.size + 1 ? "" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1" aria-label={`${correctIds.size} of ${total} checked`}>
          {checks.map((c) => (
            <span
              key={c.id}
              className={cn(
                "h-1.5 rounded-full transition-all",
                correctIds.has(c.id) ? "w-4 bg-emerald-400" : c.id === current.id ? "w-4 bg-accent" : "w-1.5 bg-steel-700",
              )}
            />
          ))}
          <span className="ml-1.5 text-[11px] tabular-nums text-muted-foreground">
            {correctIds.size} of {total} checked
          </span>
        </div>
      </header>

      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {current.kind === "spot_mistake" ? "Spot the mistake" : current.kind === "short_answer" ? "In your own words" : "Choose one"}
      </p>
      <p className="mt-1.5 text-[16px] leading-relaxed text-foreground">{current.prompt}</p>

      {isShort ? (
        <div className="mt-4 space-y-3">
          <textarea
            rows={3}
            value={text}
            disabled={compared}
            onChange={(event) => {
              touch(event.timeStamp);
              setText(event.target.value);
            }}
            placeholder="Say it the way you would to an interviewer."
            className="w-full resize-none rounded-lg border border-steel-700/80 bg-steel-950/40 px-3 py-2 text-[14px] leading-relaxed text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-80"
          />
          {compared ? (
            <div className="rounded-xl border border-accent/25 bg-accent/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">Model answer</p>
              <p className="mt-1 text-[14px] leading-relaxed text-foreground">{current.model_answer}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {current.options.map((option, index) => {
            const selected = choice === index;
            const showRight = result !== null && result.correct_index === index;
            const showWrong = result !== null && selected && !result.correct;
            return (
              <li key={option}>
                <button
                  type="button"
                  disabled={result !== null || answer.isPending}
                  onClick={(event) => {
                    touch(event.timeStamp);
                    setChoice(index);
                  }}
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[14px] leading-relaxed transition-colors",
                    showRight
                      ? "border-emerald-500/50 bg-emerald-500/10 text-foreground"
                      : showWrong
                        ? "border-amber-500/50 bg-amber-500/10 text-foreground"
                        : selected
                          ? "border-accent bg-accent/10 text-foreground"
                          : "border-steel-800 bg-steel-900/60 text-foreground/90 hover:border-steel-700 hover:bg-steel-800/60",
                  )}
                >
                  <span className="mt-0.5 shrink-0 text-muted-foreground">
                    {showRight ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : selected ? (
                      <CircleDot className="h-4 w-4 text-accent" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0">{option}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {result === null ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="How sure are you?">
            <span className="mr-1 text-[12px] text-muted-foreground">How sure?</span>
            {(["unsure", "sure"] as const).map((level) => (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={confidence === level}
                onClick={(event) => {
                  touch(event.timeStamp);
                  setConfidence(level);
                }}
                className={cn(
                  "h-8 rounded-full border px-3 text-[12px] font-medium transition-colors",
                  confidence === level
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-steel-700 text-muted-foreground hover:border-steel-600 hover:text-foreground",
                )}
              >
                {level === "sure" ? "Sure" : "Not sure"}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isShort && !compared ? (
              <Button type="button" size="sm" disabled={!text.trim() || !confidence} onClick={() => setCompared(true)}>
                Compare
              </Button>
            ) : isShort ? (
              <>
                <Button type="button" size="sm" variant="outline" disabled={!canSubmit} onClick={(event) => submitShort(false, event.timeStamp)}>
                  I missed it
                </Button>
                <Button type="button" size="sm" disabled={!canSubmit} onClick={(event) => submitShort(true, event.timeStamp)}>
                  I had it
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" disabled={!canSubmit} onClick={(event) => submit(event.timeStamp)}>
                {answer.isPending ? "Checking…" : "Check answer"}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "mt-4 rounded-xl border p-4",
            result.correct ? "border-emerald-500/30 bg-emerald-500/[0.06]" : "border-amber-500/30 bg-amber-500/[0.06]",
          )}
          role="status"
        >
          <p className={cn("text-[13px] font-semibold", result.correct ? "text-emerald-400" : "text-amber-500")}>
            {result.correct ? "Correct" : "Not quite"}
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Why</p>
          <p className="mt-0.5 text-[14px] leading-relaxed text-foreground">{result.explanation}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {!result.correct && result.section ? (
              <a
                href={`#${result.section}`}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Review this section
              </a>
            ) : null}
            <Button type="button" size="sm" className="ml-auto gap-1.5" onClick={next} autoFocus>
              {queue.length === 1 && result.correct ? "Finish" : "Continue"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          {!result.correct ? (
            <p className="mt-2 text-[11.5px] text-muted-foreground">This one comes back at the end of the round.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function dueText(iso: string): string {
  const due = new Date(`${iso}T12:00:00`).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime();
  const days = Math.round((due - today) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}
