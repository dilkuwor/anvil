"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { AuthPrompt } from "@/components/auth/auth-prompt";
import { Meter } from "@/components/dashboard/meter";
import { LearnStatus } from "@/components/learn/learn-status";
import { Breadcrumbs, PageHeader } from "@/components/layout/page-header";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { SystemDesignProblemCard } from "@/components/system-design/problem-card";
import { SectionCard, SectionTitle } from "@/components/ui/section";
import { CardSkeleton, ErrorState, PageLoader } from "@/components/ui/state";
import { api } from "@/lib/api";
import { actionLabel, type LearningLessonSummary, type LearningTopicDetail } from "@/lib/learn";
import { queryKeys } from "@/lib/queries";
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

  if (topic.isLoading) return <CardSkeleton rows={6} />;
  if (topic.isError || !topic.data) {
    return <ErrorState message="Unable to load this topic." onRetry={() => topic.refetch()} />;
  }

  const data = topic.data;
  const isDesignCatalog = data.slug === DESIGN_LEARN_TOPIC;
  const showRelated = data.related_problems.length > 0;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Breadcrumbs
          items={[
            { href: "/learn", label: "Learn" },
            { href: `/learn/${data.category_slug}`, label: data.category_title },
            { label: data.title },
          ]}
        />
        <PageHeader
          title={data.title}
          description={data.description}
          meta={
            <span className="inline-flex items-center gap-2">
              <DifficultyBadge difficulty={data.difficulty} />
              <span>
                {data.completed_lessons}/{data.lesson_count} lessons
              </span>
            </span>
          }
        />
        <Meter
          value={data.percent}
          tone={data.status === "COMPLETED" ? "bg-success" : "bg-accent"}
          label={`${data.title} complete`}
          className="h-1.5"
        />
      </div>

      <div className={showRelated ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]" : undefined}>
        {isDesignCatalog ? (
          <DesignProblemsCatalog lessons={data.lessons} />
        ) : (
          <SectionCard className="p-0">
            <ol>
              {data.lessons.map((lesson, index) => (
                <li key={lesson.id} className="border-t border-steel-800 first:border-t-0">
                  <Link href={lesson.href} className="flex items-start gap-3 px-4 py-3.5 hover:bg-steel-950/50">
                    <span className="mt-0.5 w-5 shrink-0 text-[12px] tabular-nums text-muted-foreground">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-sm font-medium">{lesson.title}</h2>
                        <span className="text-[12px] text-accent">{actionLabel(lesson.status)}</span>
                      </div>
                      <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{lesson.short_description}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-[12px] text-muted-foreground">
                        <LearnStatus status={lesson.status} />
                        <span>{lesson.estimated_minutes} min</span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </SectionCard>
        )}

        {showRelated ? (
          <aside className="space-y-4">
            <SectionCard className="p-0">
              <div className="px-5 pt-5">
                <SectionTitle>Related problems</SectionTitle>
              </div>
              <ul className="mt-2 divide-y divide-steel-800">
                {data.related_problems.map((problem) => (
                  <li key={problem.id}>
                    <Link
                      href={`/problems/${problem.slug}`}
                      className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-steel-950/50"
                    >
                      <span className="min-w-0 truncate font-medium">{problem.title}</span>
                      <DifficultyBadge difficulty={problem.difficulty} />
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </aside>
        ) : null}
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
