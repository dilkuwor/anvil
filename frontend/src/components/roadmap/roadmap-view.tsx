"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { RoadmapCanvas } from "@/components/roadmap/roadmap-canvas";
import { RoadmapPanel } from "@/components/roadmap/roadmap-panel";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api, type ProblemListResponse } from "@/lib/api";
import { queryKeys } from "@/lib/queries";
import { hydrateRoadmap, recommendNextTopic } from "@/lib/roadmap";

export function RoadmapView() {
  const problems = useQuery({
    queryKey: queryKeys.problems({ page_size: 100, source: "roadmap" }),
    queryFn: () => api.get<ProblemListResponse>("/api/v1/problems?page_size=100"),
  });

  const topics = useMemo(() => hydrateRoadmap(problems.data?.items ?? []), [problems.data?.items]);
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

  if (problems.isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <CardSkeleton rows={6} />
        </div>
      </div>
    );
  }
  if (problems.isError) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <ErrorState message="Unable to load the roadmap." onRetry={() => problems.refetch()} />
      </div>
    );
  }

  return (
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
  );
}
