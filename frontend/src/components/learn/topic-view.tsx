"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Meter } from "@/components/dashboard/meter";
import { LearnStatus } from "@/components/learn/learn-status";
import { Breadcrumbs, PageHeader } from "@/components/layout/page-header";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { Button } from "@/components/ui/button";
import { SectionCard, SectionTitle } from "@/components/ui/section";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api } from "@/lib/api";
import { actionLabel, type LearningTopicDetail } from "@/lib/learn";
import { queryKeys } from "@/lib/queries";

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
  const practiceHref = data.practice_tag ? `/problems?tag=${data.practice_tag}` : "/problems";
  const mockHref = data.related_problems[0] ? `/problems/${data.related_problems[0].slug}` : practiceHref;

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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
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

        <aside className="space-y-4">
          <SectionCard>
            <SectionTitle>Next step</SectionTitle>
            <div className="mt-3 flex flex-col gap-2">
              <Button asChild size="sm">
                <Link href={practiceHref}>Practice Problems</Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href={mockHref}>Mock Interview</Link>
              </Button>
            </div>
          </SectionCard>

          {data.related_problems.length ? (
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
          ) : null}
        </aside>
      </div>
    </div>
  );
}
