"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, Clock } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Meter } from "@/components/dashboard/meter";
import { CategoryIcon } from "@/components/learn/category-icon";
import { LearnCategoryNav } from "@/components/learn/learn-category-nav";
import { LearnHierarchyBar } from "@/components/learn/learn-hierarchy-bar";
import { LearnStatus } from "@/components/learn/learn-status";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section";
import { CardSkeleton, ErrorState, PageLoader } from "@/components/ui/state";
import { api } from "@/lib/api";
import { actionLabel, type LearningCategoryDetail, type LearningTopicDetail, type LearningTopicSummary } from "@/lib/learn";
import { queryKeys } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function CategoryView({ slug }: { slug: string }) {
  const [difficultyFilter, setDifficultyFilter] = useState<string>("ALL");

  const category = useQuery({
    queryKey: queryKeys.learnCategory(slug),
    queryFn: () => api.get<LearningCategoryDetail>(`/api/v1/learn/categories/${slug}`),
  });

  const rawTopics = category.data?.topics;

  const filteredTopics = useMemo(() => {
    if (!rawTopics) return [];
    if (difficultyFilter === "ALL") return rawTopics;
    return rawTopics.filter((t) => t.difficulty?.toUpperCase() === difficultyFilter);
  }, [rawTopics, difficultyFilter]);

  if (category.isLoading) return <CardSkeleton rows={6} />;
  if (category.isError || !category.data) {
    return <ErrorState message="Unable to load this category." onRetry={() => category.refetch()} />;
  }

  const data = category.data;

  // Find first uncompleted topic or first topic to continue
  const nextTopic = data.topics.find((t) => t.status !== "COMPLETED") ?? data.topics[0];

  return (
    <div className="space-y-4">
      {/* Compact Hierarchy Bar */}
      <LearnHierarchyBar
        categorySlug={slug}
        categoryTitle={data.title}
        totalLessons={data.lesson_count}
      />

      {/* Category Header Card */}
      <div className="rounded-2xl border border-steel-800/90 bg-steel-900/90 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent shadow-[0_0_12px_rgba(249,115,22,0.15)]">
              <CategoryIcon name={data.icon} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{data.title}</h1>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{data.description}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-xs font-semibold tabular-nums text-foreground">
              {data.completed_lessons} / {data.lesson_count} lessons ({data.percent}%)
            </span>
            {nextTopic ? (
              <Button asChild size="sm" className="h-8 gap-1.5 text-xs font-bold shadow-xs">
                <Link href={nextTopic.href}>
                  {data.completed_lessons > 0 ? "Continue Category →" : "Start Category →"}
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <Meter
            value={data.percent}
            tone={data.percent === 100 ? "bg-success" : "bg-accent"}
            label={`${data.title} lessons complete`}
            className="h-1.5"
          />
        </div>
      </div>

      <LearnCategoryNav activeCategorySlug={slug} />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Topics in {data.title} ({filteredTopics.length}{filteredTopics.length !== data.topics.length ? ` / ${data.topics.length}` : ""})
          </p>

          <div className="flex items-center gap-1 rounded-xl border border-steel-800/80 bg-steel-950/40 p-1">
            {["ALL", "EASY", "MEDIUM", "HARD"].map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setDifficultyFilter(diff)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all",
                  difficultyFilter === diff
                    ? "bg-steel-800 text-foreground border border-steel-700/80 shadow-2xs"
                    : "text-muted-foreground hover:bg-steel-800/40 hover:text-foreground border border-transparent",
                )}
              >
                {diff === "ALL" ? "All Levels" : diff.charAt(0) + diff.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredTopics.map((topic) => (
            <TopicAccordionCard key={topic.id} topic={topic} />
          ))}
          {filteredTopics.length === 0 ? (
            <div className="rounded-2xl border border-steel-800/80 bg-steel-900/40 p-8 text-center text-xs text-muted-foreground">
              No topics match the selected difficulty filter.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TopicAccordionCard({
  topic,
}: {
  topic: LearningTopicSummary;
}) {
  const [expanded, setExpanded] = useState(false);

  const topicDetail = useQuery({
    queryKey: queryKeys.learnTopic(topic.slug),
    queryFn: () => api.get<LearningTopicDetail>(`/api/v1/learn/topics/${topic.slug}`),
    enabled: expanded,
  });

  return (
    <SectionCard className="overflow-hidden p-0 transition-all">
      <div className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={topic.href}
              className="text-base font-bold tracking-tight text-foreground transition-colors hover:text-accent"
            >
              {topic.title}
            </Link>
            <DifficultyBadge difficulty={topic.difficulty} />
            <LearnStatus status={topic.status} />
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{topic.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-steel-800/60 pt-3 lg:border-t-0 lg:pt-0 shrink-0">
          <div className="w-28 sm:w-32">
            <div className="mb-1 flex justify-between text-xs tabular-nums text-muted-foreground font-semibold">
              <span>{topic.completed_lessons} / {topic.lesson_count}</span>
              <span>{topic.percent}%</span>
            </div>
            <Meter
              value={topic.percent}
              tone={topic.status === "COMPLETED" ? "bg-success" : "bg-accent"}
              label={`${topic.title} complete`}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
            >
              <span>{expanded ? "Hide Lessons" : `Lessons (${topic.lesson_count})`}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded && "rotate-180")} />
            </Button>
            <Button asChild size="sm" className="gap-1 text-xs font-bold">
              <Link href={topic.href}>
                {actionLabel(topic.status)} Topic →
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-steel-800/80 bg-steel-950/40 p-4 sm:p-5">
          {topicDetail.isLoading ? (
            <PageLoader variant="inline" />
          ) : topicDetail.isError || !topicDetail.data ? (
            <p className="text-xs text-rose-400">Unable to load topic lessons.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <span>Curriculum Outline</span>
                <Link href={topic.href} className="text-accent hover:text-accent-light font-semibold lowercase first-letter:uppercase">
                  Open full topic hub →
                </Link>
              </div>
              <ol className="divide-y divide-steel-800/60 rounded-xl border border-steel-800/80 bg-steel-900/60">
                {topicDetail.data.lessons.map((lesson, index) => {
                  const isCompleted = lesson.status === "COMPLETED";
                  return (
                    <li key={lesson.id} className="transition-colors hover:bg-steel-800/40">
                      <Link href={lesson.href} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-steel-800 text-[11px] font-bold tabular-nums text-muted-foreground">
                            {isCompleted ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-foreground hover:text-accent">
                              {lesson.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{lesson.short_description}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 text-xs">
                          <span className="hidden items-center gap-1 text-muted-foreground sm:inline-flex">
                            <Clock className="h-3 w-3 text-accent" />
                            {lesson.estimated_minutes} min
                          </span>
                          <LearnStatus status={lesson.status} />
                          <span className="font-bold text-accent">{actionLabel(lesson.status)} →</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      ) : null}
    </SectionCard>
  );
}
