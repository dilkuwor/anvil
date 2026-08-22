"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Clock } from "lucide-react";

import { AuthPrompt } from "@/components/auth/auth-prompt";
import { Meter } from "@/components/dashboard/meter";
import { LearnHierarchyBar } from "@/components/learn/learn-hierarchy-bar";
import { LearnStatus } from "@/components/learn/learn-status";
import { TopicSidebar } from "@/components/learn/topic-sidebar";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { SystemDesignProblemCard } from "@/components/system-design/problem-card";
import { SectionCard, SectionTitle } from "@/components/ui/section";
import { CardSkeleton, ErrorState, PageLoader } from "@/components/ui/state";
import { api } from "@/lib/api";
import { actionLabel, type LearningCategoryDetail, type LearningLessonSummary, type LearningTopicDetail } from "@/lib/learn";
import { queryKeys } from "@/lib/queries";
import { cn } from "@/lib/utils";
import {
  DESIGN_LEARN_TOPIC,
  useStartDesignInterview,
  useSystemDesignCatalog,
} from "@/lib/system-design-catalog";

export function TopicView({ slug }: { slug: string }) {
  const topic = useQuery({
    queryKey: queryKeys.learnTopic(slug),
    queryFn: () => api.get<LearningTopicDetail>(`/api/v1/learn/topics/${slug}`),
  });

  const category = useQuery({
    queryKey: queryKeys.learnCategory(topic.data?.category_slug ?? ""),
    queryFn: () => api.get<LearningCategoryDetail>(`/api/v1/learn/categories/${topic.data!.category_slug}`),
    enabled: Boolean(topic.data?.category_slug),
  });

  if (topic.isLoading) return <CardSkeleton rows={6} />;
  if (topic.isError || !topic.data) {
    return <ErrorState message="Unable to load this topic." onRetry={() => topic.refetch()} />;
  }

  const data = topic.data;
  const isDesignCatalog = data.slug === DESIGN_LEARN_TOPIC;
  const showRelated = data.related_problems.length > 0;
  const siblingTopics = category.data?.topics ?? [];

  return (
    <div className="space-y-4">
      {/* Compact Hierarchy Bar */}
      <LearnHierarchyBar
        categorySlug={data.category_slug}
        categoryTitle={data.category_title}
        topicSlug={data.slug}
        topicTitle={data.title}
        totalLessons={data.lesson_count}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Left Column: Desktop Topic Sidebar */}
        <TopicSidebar categorySlug={data.category_slug} activeTopicSlug={data.slug} />

        {/* Right Column: Topic Details & Curriculum */}
        <div className="min-w-0 space-y-4">
          {/* Topic Header Card */}
          <div className="rounded-2xl border border-steel-800/90 bg-steel-900/90 p-5 sm:p-6 shadow-2xs">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{data.title}</h1>
                  <DifficultyBadge difficulty={data.difficulty} />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{data.description}</p>
              </div>

              <div className="shrink-0 text-right">
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {data.completed_lessons} / {data.lesson_count} lessons
                </span>
              </div>
            </div>

            <div className="mt-4">
              <Meter
                value={data.percent}
                tone={data.status === "COMPLETED" ? "bg-success" : "bg-accent"}
                label={`${data.title} complete`}
                className="h-1.5"
              />
            </div>

            {/* Mobile / Tablet Sibling Topic Selector */}
            {siblingTopics.length > 1 ? (
              <div className="mt-4 border-t border-steel-800/70 pt-3 lg:hidden">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Switch Topic in {data.category_title}
                </label>
                <select
                  className="select-field mt-1.5 w-full text-xs"
                  value={slug}
                  onChange={(e) => {
                    const target = siblingTopics.find((t) => t.slug === e.target.value);
                    if (target) window.location.href = target.href;
                  }}
                >
                  {siblingTopics.map((t) => (
                    <option key={t.id} value={t.slug}>
                      {t.title} ({t.completed_lessons}/{t.lesson_count} lessons)
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {/* Lessons List */}
          {isDesignCatalog ? (
            <DesignProblemsCatalog lessons={data.lessons} />
          ) : (
            <SectionCard className="p-0 overflow-hidden">
              <div className="border-b border-steel-800/80 bg-steel-950/40 px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Lessons ({data.lessons.length})
              </div>
              <ol className="divide-y divide-steel-800/80">
                {data.lessons.map((lesson, index) => (
                  <li key={lesson.id} className="transition-colors hover:bg-steel-950/50">
                    <Link href={lesson.href} className="flex items-start gap-4 p-4 sm:p-5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-steel-700/60 bg-steel-800 text-xs font-bold tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h2 className="text-base font-bold tracking-tight text-foreground transition-colors hover:text-accent">
                            {lesson.title}
                          </h2>
                          <span className="font-semibold text-xs text-accent">{actionLabel(lesson.status)} →</span>
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{lesson.short_description}</p>
                        <div className="mt-2.5 flex items-center gap-3 text-xs text-muted-foreground">
                          <LearnStatus status={lesson.status} />
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Clock className="h-3 w-3" />
                            {lesson.estimated_minutes} min read
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            </SectionCard>
          )}

          {/* Related Problems */}
          {showRelated ? (
            <SectionCard className="p-0">
              <div className="p-4 sm:p-5 pb-3">
                <SectionTitle>Related Problems</SectionTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">Put these concepts to work.</p>
              </div>
              <ul className="divide-y divide-steel-800/80 border-t border-steel-800/80">
                {data.related_problems.map((problem) => (
                  <li key={problem.id}>
                    <Link
                      href={`/problems/${problem.slug}`}
                      className="flex items-center justify-between gap-3 p-4 text-sm transition-colors hover:bg-steel-950/50"
                    >
                      <span className="min-w-0 truncate font-semibold text-foreground hover:text-accent">{problem.title}</span>
                      <DifficultyBadge difficulty={problem.difficulty} />
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DesignProblemsCatalog({ lessons }: { lessons: LearningLessonSummary[] }) {
  const catalog = useSystemDesignCatalog();
  const interview = useStartDesignInterview();

  if (catalog.isLoading) return <PageLoader variant="inline" />;
  if (catalog.isError || !catalog.data?.length) {
    return (
      <SectionCard className="p-0">
        <ol>
          {lessons.map((lesson, index) => (
            <li key={lesson.id} className="border-t border-steel-800 first:border-t-0">
              <Link href={lesson.href} className="flex items-start gap-3 px-4 py-3.5 hover:bg-steel-950/50">
                <span className="mt-0.5 w-5 shrink-0 text-[12px] tabular-nums text-muted-foreground">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-medium">{lesson.title}</h2>
                  <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{lesson.short_description}</p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </SectionCard>
    );
  }

  const lessonBySlug = new Map(lessons.map((lesson) => [lesson.slug, lesson]));
  const used = new Set((catalog.data ?? []).map((item) => item.learn_slug).filter(Boolean));
  const extra = lessons.filter((lesson) => !used.has(lesson.slug));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {catalog.data.map((item) => {
          const lesson = item.learn_slug ? lessonBySlug.get(item.learn_slug) : undefined;
          return (
            <SystemDesignProblemCard
              key={item.slug}
              item={item}
              primary="learn"
              lesson={
                lesson
                  ? { href: lesson.href, status: lesson.status, estimated_minutes: lesson.estimated_minutes }
                  : undefined
              }
              onInterview={interview.startInterview}
              interviewing={interview.startingSlug === item.slug}
            />
          );
        })}
      </div>
      {extra.map((lesson) => (
        <SectionCard key={lesson.id} className="p-4">
          <Link href={lesson.href} className="text-sm font-medium hover:text-accent">
            {lesson.title}
          </Link>
          <p className="mt-1 text-[13px] text-muted-foreground">{lesson.short_description}</p>
        </SectionCard>
      ))}
      {interview.authOpen ? <AuthPrompt kind="mock" onClose={interview.closeAuth} /> : null}
    </div>
  );
}
