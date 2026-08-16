"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Meter } from "@/components/dashboard/meter";
import { CategoryIcon } from "@/components/learn/category-icon";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section";
import { CardSkeleton, ErrorState, PageLoader } from "@/components/ui/state";
import { api } from "@/lib/api";
import type { LearningCategoryCard, LearningProgressSummary, LearningSearchResponse } from "@/lib/learn";
import { queryKeys } from "@/lib/queries";
import { useSession } from "@/lib/session";

export function LearnIndex() {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const searching = trimmed.length >= 2;
  const { signedIn } = useSession();

  const categories = useQuery({
    queryKey: queryKeys.learnCategories,
    queryFn: () => api.get<LearningCategoryCard[]>("/api/v1/learn/categories"),
  });
  const progress = useQuery({
    queryKey: queryKeys.learnProgress,
    queryFn: () => api.get<LearningProgressSummary>("/api/v1/learn/progress"),
    enabled: signedIn,
  });
  const search = useQuery({
    queryKey: queryKeys.learnSearch(trimmed),
    queryFn: () => api.get<LearningSearchResponse>(`/api/v1/learn/search?q=${encodeURIComponent(trimmed)}`),
    enabled: searching,
  });

  if (categories.isLoading) return <CardSkeleton rows={4} />;
  if (categories.isError) return <ErrorState message="Unable to load Learn." onRetry={() => categories.refetch()} />;

  const totalLessons = progress.data?.total_lessons ?? categories.data?.reduce((sum, item) => sum + item.lesson_count, 0) ?? 0;
  const completed = progress.data?.completed_lessons ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Learn"
        description="Interview-focused lessons that lead into practice and mock interviews."
        meta={`${completed}/${totalLessons} lessons`}
      />

      <SectionCard className="overflow-hidden p-0">
        <div className="border-b border-steel-800 p-3">
          <label className="sr-only" htmlFor="learn-search">
            Search lessons
          </label>
          <Input
            id="learn-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search HashMap, CAP theorem, STAR…"
          />
        </div>

        {searching ? (
          <div className="divide-y divide-steel-800">
            {search.isLoading ? <PageLoader variant="inline" /> : null}
            {search.data && search.data.items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No matches for “{trimmed}”.</p>
            ) : null}
            {search.data?.items.map((item) => (
              <Link
                key={`${item.type}-${item.href}-${item.title}`}
                href={item.href}
                className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-steel-950/50"
              >
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{item.type}</div>
                  <div className="mt-0.5 truncate font-medium">{item.title}</div>
                  <div className="truncate text-[13px] text-muted-foreground">{item.subtitle}</div>
                </div>
                {item.difficulty ? <span className="shrink-0 text-[12px] text-muted-foreground">{item.difficulty}</span> : null}
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid gap-px bg-steel-800 sm:grid-cols-2">
            {categories.data?.map((category) => {
              const percent = category.lesson_count
                ? Math.round((100 * category.completed_lessons) / category.lesson_count)
                : 0;
              return (
                <Link
                  key={category.id}
                  href={`/learn/${category.slug}`}
                  className="flex flex-col bg-steel-900 p-5 hover:bg-steel-950/40"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-steel-800 bg-steel-950/50 text-accent">
                      <CategoryIcon name={category.icon} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold tracking-tight">{category.title}</h2>
                      <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-baseline justify-between text-[12px] text-muted-foreground">
                      <span>
                        {category.topic_count} topics · {category.lesson_count} lessons
                      </span>
                      <span className="tabular-nums">{percent}%</span>
                    </div>
                    <Meter value={percent} label={`${category.title} progress`} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
