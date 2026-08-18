"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AuthPrompt } from "@/components/auth/auth-prompt";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api } from "@/lib/api";
import type { InterviewSession, SystemDesignScenario } from "@/lib/interview";
import { queryKeys } from "@/lib/queries";
import { useSession } from "@/lib/session";

export function ScenarioPicker() {
  const router = useRouter();
  const { signedIn } = useSession();
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const scenarios = useQuery({
    queryKey: queryKeys.designScenarios,
    queryFn: () => api.get<SystemDesignScenario[]>("/api/v1/interviews/scenarios"),
  });

  const start = useMutation({
    mutationFn: async (slug: string) => {
      const active = await api.get<{ session: InterviewSession | null }>(
        `/api/v1/interviews/system-design/active?scenario_slug=${encodeURIComponent(slug)}`,
      );
      if (active.session) return active.session;
      return api.post<InterviewSession>("/api/v1/interviews/system-design", { scenario_slug: slug });
    },
    onSuccess: (session) => {
      router.push(`/system-design/interview?id=${session.id}`);
    },
    onError: () => toast.error("Unable to start the system design interview."),
  });

  if (scenarios.isLoading) return <CardSkeleton rows={6} />;
  if (scenarios.isError) {
    return <ErrorState message="Unable to load system design scenarios." onRetry={() => scenarios.refetch()} />;
  }

  const items = scenarios.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Design Interview"
        description="Pick a scenario and walk through requirements, capacity, and architecture with an adaptive interviewer."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const starting = start.isPending && pendingSlug === item.slug;
          return (
            <article
              key={item.slug}
              className="flex h-full flex-col rounded-2xl border border-steel-800 bg-steel-900 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold tracking-tight">{item.title}</h2>
                <DifficultyBadge difficulty={item.difficulty} />
              </div>
              <p className="mt-2 flex-1 text-[13px] leading-6 text-muted-foreground">{item.summary}</p>
              <div className="mt-4">
                <Button
                  size="sm"
                  disabled={starting}
                  onClick={() => {
                    if (!signedIn) {
                      setAuthOpen(true);
                      return;
                    }
                    setPendingSlug(item.slug);
                    start.mutate(item.slug);
                  }}
                >
                  {starting ? "Starting…" : "Start Interview"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      {authOpen ? <AuthPrompt kind="mock" onClose={() => setAuthOpen(false)} /> : null}
    </div>
  );
}
