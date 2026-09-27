"use client";

import {
  Circle,
  CircleCheck,
  CircleHelp,
  Brain,
  Lightbulb,
  ListTree,
  PanelRightClose,
  PanelRightOpen,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { useLessonReader } from "@/components/tts/lesson-reader-context";
import { Button } from "@/components/ui/button";
import { CardHeader, SectionCard } from "@/components/ui/section";
import type { LearningLessonDetail } from "@/lib/learn";
import { cn } from "@/lib/utils";

const RAIL_STORAGE_KEY = "anvil-study-rail-collapsed";
const SELF_CHECK_PREFIX = "anvil-self-check:";

export type RailHeading = { id: string; text: string };

/** Remembered open/closed state of the right-hand study rail on wide screens. */
export function useStudyRailCollapsed(): [boolean, (next?: boolean) => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(RAIL_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const toggle = (next?: boolean) => {
    setCollapsed((prev) => {
      const value = next ?? !prev;
      try {
        localStorage.setItem(RAIL_STORAGE_KEY, String(value));
      } catch {
        // Browser storage is a convenience only.
      }
      return value;
    });
  };
  return [collapsed, toggle];
}

/**
 * Which section the reader is in: the one being read aloud when audio is on, otherwise the
 * last heading that has scrolled past the top of the screen.
 */
export function useActiveHeading(headings: RailHeading[]): string | null {
  const reader = useLessonReader();
  const [scrolled, setScrolled] = useState<string | null>(null);

  useEffect(() => {
    if (!headings.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      let current: string | null = null;
      for (const heading of headings) {
        const el = document.getElementById(heading.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= 140) current = heading.id;
        else break;
      }
      setScrolled((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [headings]);

  if (
    reader?.activeId &&
    reader.status !== "idle" &&
    headings.some((h) => h.id === reader.activeId)
  ) {
    return reader.activeId;
  }
  return scrolled;
}

function useSelfCheck(
  lessonId: string,
  count: number,
): [Set<number>, (index: number) => void] {
  const [done, setDone] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = JSON.parse(
        localStorage.getItem(SELF_CHECK_PREFIX + lessonId) ?? "[]",
      );
      return new Set(
        Array.isArray(raw)
          ? raw.filter((n) => Number.isInteger(n) && n < count)
          : [],
      );
    } catch {
      return new Set();
    }
  });
  const toggle = (index: number) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      try {
        localStorage.setItem(
          SELF_CHECK_PREFIX + lessonId,
          JSON.stringify([...next]),
        );
      } catch {
        // Browser storage is a convenience only.
      }
      return next;
    });
  };
  return [done, toggle];
}

export function StudyRail({
  lesson,
  headings,
  practiceHref,
  collapsible = false,
  onCollapse,
}: {
  lesson: LearningLessonDetail;
  headings: RailHeading[];
  /** Where "Practice problems" goes: the topic's practice tag list, or the first related problem. */
  practiceHref: string | null;
  /** Show the collapse chevron (wide screens only). */
  collapsible?: boolean;
  onCollapse?: () => void;
}) {
  const activeId = useActiveHeading(headings);
  const activeIndex = headings.findIndex((h) => h.id === activeId);
  const [answered, toggleAnswered] = useSelfCheck(
    lesson.id,
    lesson.interview_questions.length,
  );
  const behavioral = lesson.category_slug === "behavioral";
  const firstProblem = lesson.related_problems[0];
  const hasPractice = behavioral || Boolean(firstProblem);

  return (
    <>
      {headings.length > 1 ? (
        <SectionCard className="p-0">
          <CardHeader flush
            icon={ListTree}
            title="On this page"
            meta={
              activeIndex >= 0
                ? `${activeIndex + 1} of ${headings.length}`
                : undefined
            }
            action={
              collapsible ? (
                <button
                  type="button"
                  aria-label="Hide study panel (P)"
                  title="Hide study panel (P)"
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-steel-800 hover:text-foreground"
                  onClick={onCollapse}
                >
                  <PanelRightClose className="h-3.5 w-3.5" />
                </button>
              ) : undefined
            }
          />
          <nav aria-label="Page sections" className="space-y-0.5 p-2.5">
            {headings.map((h) => {
              const active = h.id === activeId;
              return (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  aria-current={active ? "location" : undefined}
                  className={cn(
                    "block truncate rounded-md border-l-2 px-2 py-1 text-xs transition-colors",
                    active
                      ? "border-accent bg-accent/[0.08] font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-steel-800/60 hover:text-foreground",
                  )}
                >
                  {h.text}
                </a>
              );
            })}
          </nav>
        </SectionCard>
      ) : null}

      {lesson.review || (lesson.checks?.length ?? 0) > 0 ? (
        <SectionCard className="p-0">
          <CardHeader flush
            icon={Brain}
            title="Memory"
            meta={
              lesson.learn_state === "mastered"
                ? lesson.needs_refresh
                  ? "needs a refresh"
                  : "mastered"
                : lesson.learn_state === "checked"
                  ? "checked"
                  : `${lesson.check_state?.checked ?? 0} of ${lesson.check_state?.total ?? lesson.checks?.length ?? 0} checked`
            }
          />
          <div className="space-y-1 p-4 text-[13px] leading-relaxed text-foreground/90">
            {lesson.review ? (
              <>
                <p>
                  {lesson.review.cards} question{lesson.review.cards === 1 ? "" : "s"} in review
                  {lesson.review.reviews ? ` · reviewed ${lesson.review.reviews} time${lesson.review.reviews === 1 ? "" : "s"}` : ""}
                </p>
                <p className="text-muted-foreground">
                  {lesson.review.next_due_on ? `Next review ${relativeDay(lesson.review.next_due_on)}.` : ""}
                  {lesson.needs_refresh ? " One question slipped; it is back in the queue." : ""}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                Answer the {lesson.checks?.length} questions at the end of the lesson. They then return in spaced review.
              </p>
            )}
          </div>
        </SectionCard>
      ) : null}

      {lesson.takeaways.length || lesson.interview_questions.length ? (
        <SectionCard className="p-0">
          <CardHeader flush
            icon={Lightbulb}
            title="Remember"
            meta={
              lesson.interview_questions.length
                ? `${answered.size} of ${lesson.interview_questions.length}`
                : undefined
            }
          />
          <div className="p-4">
            {lesson.takeaways.length ? (
              <ul className="space-y-2 text-[13px] leading-relaxed">
                {lesson.takeaways.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="flex h-5 w-3.5 shrink-0 items-center justify-center">
                      <CircleCheck
                        className="block h-3.5 w-3.5 text-emerald-400"
                        strokeWidth={2.25}
                        aria-hidden
                      />
                    </span>
                    <span className="min-w-0 break-words font-medium text-foreground/90">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {lesson.interview_questions.length ? (
              <SelfCheck
                questions={lesson.interview_questions}
                done={answered}
                onToggle={toggleAnswered}
                withDivider={lesson.takeaways.length > 0}
              />
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {hasPractice ? (
        <SectionCard className="p-0">
          <CardHeader flush
            icon={Target}
            title="Practice"
            meta={
              lesson.related_problems.length
                ? `${lesson.related_problems.length} problem${lesson.related_problems.length === 1 ? "" : "s"}`
                : undefined
            }
          />
          {lesson.related_problems.length ? (
            <ul className="divide-y divide-steel-800/80 border-b border-steel-800/80">
              {lesson.related_problems.map((problem) => (
                <li key={problem.id}>
                  <Link
                    href={`/problems/${problem.slug}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-xs transition-colors hover:bg-steel-950/50"
                  >
                    <span className="min-w-0 truncate font-semibold text-foreground hover:text-accent">
                      {problem.title}
                    </span>
                    <DifficultyBadge difficulty={problem.difficulty} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-col gap-2 p-4">
            {behavioral ? (
              <>
                <Button asChild size="sm" className="font-semibold">
                  <Link href={`/behavioral#${lesson.topic_slug}`}>
                    Write your STAR story
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="secondary"
                  className="font-semibold"
                >
                  <Link href="/behavioral">Mock Interview</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="sm" className="font-semibold">
                  <Link href={practiceHref ?? `/problems/${firstProblem.slug}`}>
                    Practice Problems
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="secondary"
                  className="font-semibold"
                >
                  <Link href={`/problems/${firstProblem.slug}`}>
                    Mock Interview
                  </Link>
                </Button>
              </>
            )}
          </div>
        </SectionCard>
      ) : null}
    </>
  );
}

/** Interview questions as a quiet self-test: tick the ones you can answer out loud. */
function SelfCheck({
  questions,
  done,
  onToggle,
  withDivider,
}: {
  questions: string[];
  done: Set<number>;
  onToggle: (index: number) => void;
  withDivider: boolean;
}) {
  const toggle = onToggle;
  return (
    <div
      className={cn(withDivider && "mt-3 border-t border-steel-800/80 pt-3")}
    >
      <p className="text-[11px] font-medium text-muted-foreground">
        Can you answer these out loud?
      </p>
      <ul className="mt-2 space-y-1">
        {questions.map((question, index) => {
          const checked = done.has(index);
          return (
            <li key={question}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggle(index)}
                className="flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left text-[13px] leading-relaxed transition-colors hover:bg-steel-800/60"
              >
                <span className="flex h-5 w-3.5 shrink-0 items-center justify-center">
                  {checked ? (
                    <CircleCheck
                      className="block h-3.5 w-3.5 text-emerald-400"
                      strokeWidth={2.25}
                      aria-hidden
                    />
                  ) : (
                    <Circle
                      className="block h-3.5 w-3.5 text-steel-600"
                      aria-hidden
                    />
                  )}
                </span>
                <span
                  className={cn(
                    "min-w-0 break-words font-medium",
                    checked ? "text-muted-foreground" : "text-foreground/90",
                  )}
                >
                  {question}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {questions.length ? (
        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <CircleHelp className="h-3 w-3" aria-hidden />
          Saying the answer out loud is the best way to keep it.
        </p>
      ) : null}
    </div>
  );
}

/** The thin tab shown at the right edge while the rail is collapsed. */
export function StudyRailEdgeTab({ onExpand }: { onExpand: () => void }) {
  return (
    <button
      type="button"
      aria-label="Show study panel (P)"
      title="Show study panel (P)"
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-steel-800/80 bg-steel-900/60 text-muted-foreground shadow-2xs transition-all hover:scale-105 hover:border-steel-700 hover:bg-steel-800 hover:text-foreground"
      onClick={onExpand}
    >
      <PanelRightOpen className="h-4 w-4" />
    </button>
  );
}

function relativeDay(iso: string): string {
  const due = new Date(`${iso}T12:00:00`).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime();
  const days = Math.round((due - today) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 14) return `in ${days} days`;
  return `on ${new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}
