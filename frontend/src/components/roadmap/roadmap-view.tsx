"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { RoadmapCanvas } from "@/components/roadmap/roadmap-canvas";
import { RoadmapPanel } from "@/components/roadmap/roadmap-panel";
import { Button } from "@/components/ui/button";
import { ErrorState, PageLoader } from "@/components/ui/state";
import { api, type ProblemListResponse } from "@/lib/api";
import type { ProblemListDetail } from "@/lib/lists";
import { queryKeys } from "@/lib/queries";
import { hydrateRoadmap, recommendNextTopic } from "@/lib/roadmap";

export function RoadmapView() {
  const params = useSearchParams();
  const listId = params.get("list")?.trim() || null;

  const problems = useQuery({
    queryKey: queryKeys.problems({ page_size: 100, source: "roadmap" }),
    queryFn: () => api.get<ProblemListResponse>("/api/v1/problems?page_size=100"),
    enabled: !listId,
  });
  const list = useQuery({
    queryKey: queryKeys.problemList(listId ?? ""),
    queryFn: () => api.get<ProblemListDetail>(`/api/v1/problem-lists/${listId}`),
    enabled: Boolean(listId),
  });

  const topics = useMemo(() => {
    const source = listId ? (list.data?.items ?? []) : (problems.data?.items ?? []);
    return hydrateRoadmap(source);
  }, [listId, list.data?.items, problems.data?.items]);
  const recommended = useMemo(() => recommendNextTopic(topics), [topics]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = topics.find((topic) => topic.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const loading = listId ? list.isLoading : problems.isLoading;
  const errored = listId ? list.isError : problems.isError;
  const retry = listId ? () => list.refetch() : () => problems.refetch();

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <PageLoader variant="inline" />
      </div>
    );
  }
  if (errored) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <ErrorState
          message={listId ? "Unable to load this list's roadmap." : "Unable to load the roadmap."}
          onRetry={retry}
        />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {list.data ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-steel-800 bg-steel-900/80 px-4 py-2">
          <p className="min-w-0 text-[13px]">
            <span className="font-medium">Roadmap for {list.data.name}</span>
            <span className="text-muted-foreground">
              {" "}
              · {list.data.problem_count} {list.data.problem_count === 1 ? "problem" : "problems"}
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link href={`/problems/lists/${list.data.id}`}>Open list</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href="/roadmap">Show all</Link>
            </Button>
          </div>
        </div>
      ) : null}
      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <RoadmapCanvas
          topics={topics}
          selectedId={selected?.id ?? null}
          recommendedId={recommended?.id ?? null}
          onSelect={setSelectedId}
        />
        {selected ? (
          <>
            <button
              type="button"
              className="absolute inset-0 z-20 bg-background/40"
              aria-label="Close topic details"
              onClick={() => setSelectedId(null)}
            />
            <RoadmapPanel topic={selected} topics={topics} onClose={() => setSelectedId(null)} />
          </>
        ) : null}
      </div>
    </div>
  );
}
