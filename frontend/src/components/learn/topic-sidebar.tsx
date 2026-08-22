"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, ChevronRight, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Meter } from "@/components/dashboard/meter";
import { CategoryIcon } from "@/components/learn/category-icon";
import { api } from "@/lib/api";
import type { LearningCategoryDetail, LearningTopicDetail } from "@/lib/learn";
import { queryKeys } from "@/lib/queries";
import { cn } from "@/lib/utils";

const SIDEBAR_STORAGE_KEY = "anvil:learn:sidebar-collapsed";

export function useTopicSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return stored === "true";
    } catch {
      return false;
    }
  });

  const toggle = (next?: boolean) => {
    setCollapsed((prev) => {
      const val = next !== undefined ? next : !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(val));
      } catch {
        // ignore
      }
      return val;
    });
  };

  return [collapsed, toggle] as const;
}

export function TopicSidebar({
  categorySlug,
  activeTopicSlug,
  activeLessonSlug,
  collapsed: controlledCollapsed,
  onToggleCollapse,
}: {
  categorySlug: string;
  activeTopicSlug: string;
  activeLessonSlug?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const [internalCollapsed, internalToggle] = useTopicSidebarCollapsed();
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const toggle = onToggleCollapse ?? internalToggle;

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

  return (
    <aside
      className={cn(
        "hidden shrink-0 border-r border-steel-800/80 bg-steel-950/40 transition-[width,padding] duration-300 ease-in-out lg:flex flex-col scrollbar-none self-stretch",
        isCollapsed ? "w-13 p-2.5 items-center" : "w-72 p-4 sm:p-5",
      )}
      aria-label="Curriculum navigation"
    >
      {isCollapsed ? (
        <div className="flex w-full flex-col items-center">
          {/* Category Icon Box (h-9 w-9) */}
          <Link
            href={`/learn/${data.slug}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent hover:border-accent/40 hover:scale-105 transition-all shadow-2xs"
            title={`${data.title} Curriculum`}
            aria-label={`${data.title} Curriculum`}
          >
            <CategoryIcon name={data.icon} className="h-4 w-4" />
          </Link>

          <div className="my-2 h-px w-5 bg-steel-800/80" />

          {/* Expand Chevron Box (h-9 w-9) */}
          <button
            type="button"
            onClick={() => toggle()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-steel-800/80 bg-steel-900/60 text-muted-foreground hover:border-steel-700 hover:bg-steel-800 hover:text-foreground hover:scale-105 transition-all shadow-2xs"
            title="Expand Curriculum"
            aria-label="Expand Curriculum"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex w-full min-w-[16rem] flex-col overflow-y-auto scrollbar-none">
          {/* Category Header */}
          <div className="border-b border-steel-800/80 pb-3.5">
            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/learn/${data.slug}`}
                className="group flex items-center gap-2.5 text-xs font-bold text-foreground hover:text-accent transition-colors min-w-0"
                title={`${data.title} Curriculum`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent group-hover:scale-105 transition-transform">
                  <CategoryIcon name={data.icon} className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <span className="block truncate">{data.title}</span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {data.completed_lessons}/{data.lesson_count} completed ({data.percent}%)
                  </span>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => toggle()}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-steel-800 hover:text-foreground transition-colors"
                title="Collapse Curriculum"
                aria-label="Collapse Curriculum"
              >
                <ChevronDown className="h-3.5 w-3.5 rotate-90" />
              </button>
            </div>
            <div className="mt-2.5">
              <Meter
                value={data.percent}
                tone={data.percent === 100 ? "bg-success" : "bg-accent"}
                label={`${data.title} progress`}
                className="h-1"
              />
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
                          ? "bg-steel-800/90 font-bold text-foreground shadow-2xs border border-steel-700/70"
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
                      <div className="my-1.5 ml-3 border-l border-steel-800/80 pl-2.5 space-y-1">
                        {lessons.map((lesson, idx) => {
                          const isLessonActive = lesson.slug === activeLessonSlug;
                          const isCompleted = lesson.status === "COMPLETED";

                          return (
                            <Link
                              key={lesson.id}
                              href={lesson.href}
                              className={cn(
                                "group flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition-all",
                                isLessonActive
                                  ? "bg-accent/15 font-bold text-accent shadow-2xs border border-accent/30"
                                  : "text-muted-foreground hover:bg-steel-800/60 hover:text-foreground",
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                {isCompleted ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                ) : isLessonActive ? (
                                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent animate-pulse" />
                                ) : (
                                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-steel-700/80 text-[9px] font-bold text-steel-500">
                                    {idx + 1}
                                  </span>
                                )}
                                <span className="truncate">{lesson.title}</span>
                              </div>
                              <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground/80 font-mono">
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
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-accent transition-colors px-1"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>All Categories</span>
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
