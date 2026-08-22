"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Clock, ListOrdered, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { LearningCategoryDetail, LearningLessonDetail, LearningTopicDetail } from "@/lib/learn";
import { queryKeys } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function LessonCurriculum({
  lesson,
  open,
  onClose,
}: {
  lesson: LearningLessonDetail;
  open: boolean;
  onClose: () => void;
}) {
  const topic = useQuery({
    queryKey: queryKeys.learnTopic(lesson.topic_slug),
    queryFn: () => api.get<LearningTopicDetail>(`/api/v1/learn/topics/${lesson.topic_slug}`),
  });

  const category = useQuery({
    queryKey: queryKeys.learnCategory(lesson.category_slug),
    queryFn: () => api.get<LearningCategoryDetail>(`/api/v1/learn/categories/${lesson.category_slug}`),
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const siblingTopics = category.data?.topics ?? [];
  const lessons = topic.data?.lessons ?? [];
  const currentIdx = lessons.findIndex((item) => item.slug === lesson.slug);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-background/60 backdrop-blur-xs transition-opacity"
        aria-label="Close curriculum outline"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Topic Curriculum Outline"
        className="relative flex h-full w-full max-w-md flex-col border-l border-steel-800/80 bg-steel-900 shadow-2xl md:w-[26rem]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-steel-800/80 bg-steel-950/40 px-5 py-4">
          <div className="min-w-0">
            <Link
              href={`/learn/${lesson.category_slug}`}
              className="text-[11px] font-bold uppercase tracking-wider text-accent hover:text-accent-light transition-colors"
            >
              {lesson.category_title}
            </Link>
            <h2 className="mt-1 truncate text-base font-bold tracking-tight text-foreground">
              {lesson.topic_title}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Lesson {currentIdx >= 0 ? currentIdx + 1 : 1} of {lessons.length || "–"}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-steel-800 hover:text-foreground transition-colors"
            aria-label="Close curriculum outline"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {siblingTopics.length > 1 ? (
          <div className="border-b border-steel-800/80 bg-steel-950/20 px-4 py-2.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Switch Topic in {lesson.category_title}
            </label>
            <select
              className="select-field mt-1.5 w-full text-xs"
              value={lesson.topic_slug}
              onChange={(e) => {
                const target = siblingTopics.find((t) => t.slug === e.target.value);
                if (target) window.location.href = target.href;
              }}
            >
              {siblingTopics.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.title} ({t.completed_lessons}/{t.lesson_count})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto p-4 space-y-2">
          <div className="pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Lessons in this topic
          </div>

          <ol className="space-y-1.5">
            {lessons.map((item, index) => {
              const active = item.slug === lesson.slug;
              const isCompleted = item.status === "COMPLETED";
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "group flex items-start gap-3 rounded-xl p-3 transition-all",
                      active
                        ? "border border-accent/40 bg-accent/10 shadow-2xs font-semibold text-foreground"
                        : "border border-steel-800/60 bg-steel-950/30 text-muted-foreground hover:border-steel-700 hover:bg-steel-800/60 hover:text-foreground",
                    )}
                  >
                    <span className="mt-0.5 flex shrink-0 items-center justify-center">
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />
                      ) : active ? (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                          {index + 1}
                        </span>
                      ) : (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-steel-700 text-[10px] font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-xs font-semibold leading-snug", active ? "text-foreground font-bold" : "text-foreground/90 group-hover:text-foreground")}>
                        {item.title}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{item.short_description}</p>
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Clock className="h-2.5 w-2.5" />
                          {item.estimated_minutes} min
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>

        <footer className="border-t border-steel-800/80 bg-steel-950/40 p-4">
          <Button asChild variant="outline" size="sm" className="w-full justify-center text-xs">
            <Link href={`/learn/${lesson.category_slug}/${lesson.topic_slug}`} onClick={onClose}>
              View Full Topic Hub →
            </Link>
          </Button>
        </footer>
      </aside>
    </div>
  );
}

export function LessonCurriculumCard({ lesson }: { lesson: LearningLessonDetail }) {
  const topic = useQuery({
    queryKey: queryKeys.learnTopic(lesson.topic_slug),
    queryFn: () => api.get<LearningTopicDetail>(`/api/v1/learn/topics/${lesson.topic_slug}`),
  });

  const lessons = topic.data?.lessons ?? [];
  const currentIdx = lessons.findIndex((item) => item.slug === lesson.slug);

  if (lessons.length <= 1) return null;

  return (
    <div className="rounded-2xl border border-steel-800/90 bg-steel-900/90 p-4 shadow-2xs">
      <div className="flex items-center justify-between gap-2 border-b border-steel-800/80 pb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Curriculum</p>
          <h3 className="truncate text-sm font-bold text-foreground">{lesson.topic_title}</h3>
        </div>
        <span className="rounded-full border border-steel-700/60 bg-steel-800/60 px-2 py-0.5 text-[10px] tabular-nums font-semibold text-muted-foreground">
          {currentIdx >= 0 ? currentIdx + 1 : 1} / {lessons.length}
        </span>
      </div>

      <ol className="mt-3 space-y-1.5">
        {lessons.map((item, index) => {
          const active = item.slug === lesson.slug;
          const isCompleted = item.status === "COMPLETED";
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  "group flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all",
                  active
                    ? "border border-accent/40 bg-accent/10 font-bold text-foreground shadow-2xs"
                    : "text-muted-foreground hover:bg-steel-800/60 hover:text-foreground",
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  ) : active ? (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-accent animate-pulse" />
                  ) : (
                    <Circle className="h-3 w-3 shrink-0 text-steel-600" />
                  )}
                  <span className="truncate">{item.title}</span>
                </div>
                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                  {item.estimated_minutes}m
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
