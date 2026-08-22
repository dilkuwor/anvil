"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Meter } from "@/components/dashboard/meter";
import { CategoryIcon } from "@/components/learn/category-icon";
import { LearnCategoryNav } from "@/components/learn/learn-category-nav";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section";
import { CardSkeleton, ErrorState, PageLoader } from "@/components/ui/state";
import { api } from "@/lib/api";
import type { LearningCategoryCard, LearningProgressSummary, LearningSearchResponse } from "@/lib/learn";
import { queryKeys } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

import { Flame, Search } from "lucide-react";

export function LearnIndex() {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const searching = trimmed.length >= 2;
  const { signedIn } = useSession();
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Listen for "/" keyboard shortcut to focus search
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setQuery("");
        searchInputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (categories.isLoading) return <CardSkeleton rows={4} />;
  if (categories.isError) return <ErrorState message="Unable to load Learn." onRetry={() => categories.refetch()} />;

  const totalLessons = progress.data?.total_lessons ?? categories.data?.reduce((sum, item) => sum + item.lesson_count, 0) ?? 0;
  const completed = progress.data?.completed_lessons ?? 0;

  // Active category with progress
  const activeCat = progress.data?.categories?.find(
    (c) => c.completed_lessons > 0 && c.completed_lessons < c.lesson_count,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Learn"
        description="Interview-focused lessons that lead into practice and mock interviews."
        meta={`${completed}/${totalLessons} lessons`}
      />

      <LearnCategoryNav />

      {/* Resume Active Learning Banner */}
      {signedIn && activeCat ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-accent/30 bg-accent/10 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-2xs">
              <Flame className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Continue Learning</p>
              <h3 className="truncate text-sm font-bold text-foreground">{activeCat.title}</h3>
              <p className="text-xs text-muted-foreground">
                {activeCat.completed_lessons} of {activeCat.lesson_count} lessons complete
              </p>
            </div>
          </div>
          <Link
            href={`/learn/${activeCat.slug}`}
            className="shrink-0 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-accent-light transition-all hover:scale-[1.02]"
          >
            Resume Course →
          </Link>
        </div>
      ) : null}

      <SectionCard className="overflow-hidden p-0">
        <div className="relative border-b border-steel-800/80 bg-steel-950/30 p-3.5">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            id="learn-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search HashMap, CAP theorem, STAR… (Press / to search)"
            className="pl-9 pr-10 text-xs"
          />
          <kbd className="pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 rounded bg-steel-800 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline-block">
            /
          </kbd>
        </div>

        {searching ? (
          <div className="divide-y divide-steel-800/80">
            {search.isLoading ? <PageLoader variant="inline" /> : null}
            {search.data && search.data.items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">No matches for “{trimmed}”.</p>
            ) : null}
            {search.data?.items.map((item) => (
              <Link
                key={`${item.type}-${item.href}-${item.title}`}
                href={item.href}
                className="flex items-start justify-between gap-3 px-5 py-3.5 hover:bg-steel-800/50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">{item.type}</div>
                  <div className="mt-0.5 truncate font-semibold text-foreground">{item.title}</div>
                  <div className="truncate text-[13px] text-muted-foreground">{item.subtitle}</div>
                </div>
                {item.difficulty ? <span className="shrink-0 text-xs font-medium text-muted-foreground">{item.difficulty}</span> : null}
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid gap-px bg-steel-800/80 sm:grid-cols-2">
            {categories.data?.map((category, index) => (
              <Link
                key={category.id}
                href={`/learn/${category.slug}`}
                className={cn(
                  "group flex flex-col justify-between bg-steel-900 p-6 transition-all duration-150 hover:bg-steel-950/70",
                  index === (categories.data?.length ?? 0) - 1 && (categories.data?.length ?? 0) % 2 === 1 && "sm:col-span-2",
                )}
              >
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent transition-all duration-200 group-hover:scale-105 group-hover:border-accent/40 group-hover:bg-accent/15 group-hover:shadow-[0_0_12px_rgba(249,115,22,0.15)]">
                    <CategoryIcon name={category.icon} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-accent">
                      {category.title}
                    </h2>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{category.description}</p>
                  </div>
                </div>
                <div className="mt-6 space-y-2 pt-4 border-t border-steel-800/70">
                  <div className="flex items-baseline justify-between text-xs text-muted-foreground font-medium">
                    <span>
                      {category.topic_count} topics · {category.lesson_count} lessons
                    </span>
                    {signedIn ? (
                      <span className="font-mono text-xs text-foreground font-semibold">
                        {category.completed_lessons} / {category.lesson_count}
                      </span>
                    ) : null}
                  </div>
                  <Meter
                    value={
                      category.lesson_count
                        ? Math.round((100 * category.completed_lessons) / category.lesson_count)
                        : 0
                    }
                    label={`${category.title} progress`}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
