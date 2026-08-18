"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import type { InterviewSession, SystemDesignScenario } from "@/lib/interview";
import { queryKeys } from "@/lib/queries";
import { useSession } from "@/lib/session";
import type { SystemDesign, WorkloadConfig } from "@/system-design/models/types";

export type CatalogMode = "learn" | "simulate" | "interview";

export const DESIGN_LEARN_CATEGORY = "system-design";
export const DESIGN_LEARN_TOPIC = "sd-design-problems";

export function catalogLearnHref(learnSlug: string | null | undefined) {
  if (!learnSlug) return null;
  return `/learn/${DESIGN_LEARN_CATEGORY}/${DESIGN_LEARN_TOPIC}/${learnSlug}`;
}

export function useSystemDesignCatalog() {
  return useQuery({
    queryKey: queryKeys.designScenarios,
    queryFn: () => api.get<SystemDesignScenario[]>("/api/v1/interviews/scenarios"),
  });
}

export function scenarioBySlug(items: SystemDesignScenario[] | undefined, slug: string | undefined) {
  if (!items || !slug) return undefined;
  return items.find((item) => item.slug === slug);
}

export function scenarioByLearnSlug(items: SystemDesignScenario[] | undefined, learnSlug: string | undefined) {
  if (!items || !learnSlug) return undefined;
  return items.find((item) => item.learn_slug === learnSlug);
}

export function scenarioWorkload(item: SystemDesignScenario): Partial<WorkloadConfig> {
  if (!item.workload) return {};
  return {
    dau: item.workload.dau,
    requestsPerUserDay: item.workload.requests_per_user_day,
    readRatio: item.workload.read_ratio,
    peakMultiplier: item.workload.peak_multiplier,
  };
}

export function applyScenarioWorkload(design: SystemDesign, item: SystemDesignScenario): SystemDesign {
  return {
    ...design,
    name: item.title,
    problemSlug: item.slug,
    workload: { ...design.workload, ...scenarioWorkload(item) },
  };
}

export function useStartDesignInterview() {
  const router = useRouter();
  const { signedIn } = useSession();
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

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

  function startInterview(slug: string) {
    if (!signedIn) {
      setAuthOpen(true);
      return;
    }
    setPendingSlug(slug);
    start.mutate(slug);
  }

  return {
    startInterview,
    startingSlug: start.isPending ? pendingSlug : null,
    authOpen,
    closeAuth: () => setAuthOpen(false),
  };
}
