"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, ChevronRight, Circle, Clock, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Meter } from "@/components/dashboard/meter";
import { CategoryIcon } from "@/components/learn/category-icon";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { api } from "@/lib/api";
import type { LearningCategoryDetail, LearningLessonSummary, LearningTopicDetail } from "@/lib/learn";
import { queryKeys } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function TopicSidebar({
  categorySlug,
  activeTopicSlug,
  activeLessonSlug,
}: {
  categorySlug: string;
  activeTopicSlug: string;
  activeLessonSlug?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const category = useQuery({
    queryKey: queryKeys.learnCategory(categorySlug),
    queryFn: () => api.get<LearningCategoryDetail>(`/api/v1/learn/categories/${categorySlug}`),
  });

  const activeTopic = useQuery({
    queryKey: queryKeys.learnTopic(activeTopicSlug),
    queryFn: () => api.get<LearningTopicDetail>(`/api/v1/learn/topics/${activeTopicSlug}`),
    enabled: Boolean(activeTopicSlug),
  });

  const data = category.data;
  if (!data) return null;

  if (collapsed) {
    return (
      <aside className="sticky top-16 hidden max-h-[calc(100vh-5rem)] w-14 shrink-0 flex-col items-center justify-between rounded-2xl border border-steel-800/90 bg-steel-900/95 p-2.5 shadow-sm backdrop-blur-xl lg:flex">
        <div className="flex flex-col items-center gap-3">
          <Link
            href={`/learn/${data.slug}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent hover:border-accent/40 transition-colors"
            title={data.title}
          >
            <CategoryIcon name={data.icon} className="h-4 w-4" />
          </Link>
          <div className="h-px w-6 bg-steel-800/80" />
          <nav aria-label="Collapsed topic icons" className="flex flex-col gap-1.5">
            {data.topics.map((t) => {
              const isTopicActive = t.slug === activeTopicSlug;
              return (
                <Link
                  key={t.id}
                  href={t.href}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all",
                    isTopicActive
                      ? "bg-accent text-white shadow-2xs"
                      : "text-muted-foreground hover:bg-steel-800 hover:text-foreground",
                  )}
                  title={`${t.title} (${t.completed_lessons}/${t.lesson_count})`}
                >
                  {t.title.charAt(0)}
                </Link>
              );
            })}
          </nav>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="mt-4 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-steel-800 hover:text-foreground transition-colors"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="sticky top-16 hidden max-h-[calc(100vh-5rem)] w-72 shrink-0 overflow-y-auto rounded-2xl border border-steel-800/90 bg-steel-900/95 p-4 shadow-sm backdrop-blur-xl lg:block scrollbar-none">
      {/* Category Header */}
      <div className="border-b border-steel-800/80 pb-3.5">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/learn/${data.slug}`}
            className="group flex items-center gap-2.5 text-xs font-bold text-foreground hover:text-accent transition-colors min-w-0"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent">
              <CategoryIcon name={data.icon} className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <span className="block truncate">{data.title}</span>
              <span className="text-[10px] font-medium text-muted-foreground">
                {data.completed_lessons}/{data.lesson_count} lessons complete
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-steel-800 hover:text-foreground transition-colors"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <ChevronDown className="h-3.5 w-3.5 rotate-90" />
          </button>
        </div>
        <div className="mt-2.5">
          <Meter value={data.percent} label={`${data.title} progress`} className="h-1" />
        </div>
      </div>

      {/* Topics & Lessons Accordion List */}
      <div className="mt-3.5 space-y-1">
        <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Curriculum Outline
        </p>

        <nav aria-label="Topic navigation" className="mt-2 space-y-1">
          {data.topics.map((t) => {
            const isTopicActive = t.slug === activeTopicSlug;
            const lessons = isTopicActive ? activeTopic.data?.lessons ?? [] : [];

            return (
              <div key={t.id} className="rounded-xl transition-colors">
                <Link
                  href={t.href}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs transition-all",
                    isTopicActive
                      ? "bg-steel-800/90 font-bold text-foreground shadow-2xs border border-steel-700/60"
                      : "text-muted-foreground hover:bg-steel-800/50 hover:text-foreground border border-transparent",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{t.title}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 text-[10px] tabular-nums font-semibold">
                    <span className={isTopicActive ? "text-accent" : "text-muted-foreground"}>
                      {t.completed_lessons}/{t.lesson_count}
                    </span>
                  </div>
                </Link>

                {/* If this topic is active, render its lessons */}
                {isTopicActive && lessons.length > 0 ? (
                  <div className="my-1 ml-3 border-l border-steel-800/80 pl-2 space-y-0.5">
                    {lessons.map((lesson) => {
                      const isLessonActive = lesson.slug === activeLessonSlug;
                      const isCompleted = lesson.status === "COMPLETED";

                      return (
                        <Link
                          key={lesson.id}
                          href={lesson.href}
                          className={cn(
                            "group flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[11px] transition-all",
                            isLessonActive
                              ? "bg-accent/15 font-bold text-accent shadow-2xs border border-accent/30"
                              : "text-muted-foreground hover:bg-steel-800/60 hover:text-foreground",
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            {isCompleted ? (
                              <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                            ) : isLessonActive ? (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent animate-pulse" />
                            ) : (
                              <Circle className="h-2.5 w-2.5 shrink-0 text-steel-600" />
                            )}
                            <span className="truncate">{lesson.title}</span>
                          </div>
                          <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground/80">
                            {lesson.estimated_minutes}m
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Switch Category footer link */}
      <div className="mt-4 border-t border-steel-800/80 pt-3">
        <Link
          href="/learn"
          className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-accent transition-colors px-1"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span>All Categories</span>
        </Link>
      </div>
    </aside>
  );
}
