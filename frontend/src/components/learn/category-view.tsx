"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Meter } from "@/components/dashboard/meter";
import { LearnStatus } from "@/components/learn/learn-status";
import { Breadcrumbs, PageHeader } from "@/components/layout/page-header";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { SectionCard } from "@/components/ui/section";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api } from "@/lib/api";
import { actionLabel, type LearningCategoryDetail } from "@/lib/learn";
import { queryKeys } from "@/lib/queries";

export function CategoryView({ slug }: { slug: string }) {
  const category = useQuery({
    queryKey: queryKeys.learnCategory(slug),
    queryFn: () => api.get<LearningCategoryDetail>(`/api/v1/learn/categories/${slug}`),
  });

  if (category.isLoading) return <CardSkeleton rows={6} />;
  if (category.isError || !category.data) {
    return <ErrorState message="Unable to load this category." onRetry={() => category.refetch()} />;
  }

  const data = category.data;
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Breadcrumbs items={[{ href: "/learn", label: "Learn" }, { label: data.title }]} />
        <PageHeader
          title={data.title}
          description={data.description}
          meta={`${data.completed_lessons}/${data.lesson_count} lessons`}
        />
        <Meter value={data.percent} label={`${data.title} lessons complete`} className="h-1.5" />
      </div>

      <SectionCard className="p-0">
        <div className="hidden md:block">
          <table className="w-full text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Topic</th>
                <th className="px-4 py-2.5 font-medium">Difficulty</th>
                <th className="px-4 py-2.5 font-medium">Lessons</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.topics.map((topic) => (
                <tr key={topic.id} className="border-t border-steel-800 hover:bg-steel-950/50">
                  <td className="px-4 py-3">
                    <Link href={topic.href} className="font-medium hover:text-accent">
                      {topic.title}
                    </Link>
                    <p className="mt-0.5 max-w-md text-[12px] leading-5 text-muted-foreground">{topic.description}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <DifficultyBadge difficulty={topic.difficulty} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="w-28">
                      <div className="mb-1 tabular-nums text-muted-foreground">
                        {topic.completed_lessons}/{topic.lesson_count}
                      </div>
                      <Meter
                        value={topic.percent}
                        tone={topic.status === "COMPLETED" ? "bg-success" : "bg-accent"}
                        label={`${topic.title} complete`}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <LearnStatus status={topic.status} />
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <Link href={topic.href} className="text-accent hover:text-accent-light">
                      {actionLabel(topic.status)}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-steel-800 md:hidden">
          {data.topics.map((topic) => (
            <Link key={topic.id} href={topic.href} className="block p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium">{topic.title}</h2>
                  <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{topic.description}</p>
                </div>
                <DifficultyBadge difficulty={topic.difficulty} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <LearnStatus status={topic.status} />
                <span className="text-[12px] tabular-nums text-muted-foreground">
                  {topic.completed_lessons}/{topic.lesson_count}
                </span>
              </div>
              <Meter
                value={topic.percent}
                tone={topic.status === "COMPLETED" ? "bg-success" : "bg-accent"}
                label={`${topic.title} complete`}
                className="mt-2"
              />
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
