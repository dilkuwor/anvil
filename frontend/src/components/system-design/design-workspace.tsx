"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { EndInterviewDialog } from "@/components/interview/interview-banner";
import { InterviewFeedback } from "@/components/interview/interview-feedback";
import { InterviewerPanel } from "@/components/interview/interviewer-panel";
import { ArchitectureCanvas } from "@/components/system-design/architecture-canvas";
import { ScenarioPanel } from "@/components/system-design/scenario-panel";
import { Button } from "@/components/ui/button";
import { CardSkeleton, ErrorState, PageLoader } from "@/components/ui/state";
import { api } from "@/lib/api";
import {
  emptyArchitecture,
  formatCountdown,
  remainingFromStart,
  type ArchitectureGraph,
  type InterviewSession,
  type SystemDesignScenario,
} from "@/lib/interview";
import { queryKeys } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function DesignWorkspace() {
  const search = useSearchParams();
  const sessionId = search.get("id");
  const scenarioSlug = search.get("scenario");

  if (!sessionId && !scenarioSlug) {
    return <MissingSession />;
  }

  return <LoadedDesignWorkspace sessionId={sessionId} scenarioSlug={scenarioSlug} />;
}

function MissingSession() {
  const router = useRouter();
  return (
    <ErrorState
      message="Choose a system design scenario to start."
      onRetry={() => router.push("/system-design")}
    />
  );
}

function LoadedDesignWorkspace({
  sessionId: initialId,
  scenarioSlug,
}: {
  sessionId: string | null;
  scenarioSlug: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(initialId);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [architecture, setArchitecture] = useState<ArchitectureGraph>(emptyArchitecture());
  const saveTimer = useRef<number | null>(null);
  const hydrated = useRef(false);

  const sessionQuery = useQuery({
    queryKey: queryKeys.interview(sessionId ?? "none"),
    queryFn: () => api.get<InterviewSession>(`/api/v1/interviews/${sessionId}`),
    enabled: Boolean(sessionId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.completed) return false;
      return 15_000;
    },
  });

  const start = useMutation({
    mutationFn: async () => {
      if (!scenarioSlug) throw new Error("Missing scenario");
      const active = await api.get<{ session: InterviewSession | null }>(
        `/api/v1/interviews/system-design/active?scenario_slug=${encodeURIComponent(scenarioSlug)}`,
      );
      if (active.session) return active.session;
      return api.post<InterviewSession>("/api/v1/interviews/system-design", { scenario_slug: scenarioSlug });
    },
    onSuccess: (session) => {
      setSessionId(session.id);
      queryClient.setQueryData(queryKeys.interview(session.id), session);
      router.replace(`/system-design/interview?id=${session.id}`);
    },
    onError: () => toast.error("Unable to start the system design interview."),
  });

  const startedRef = useRef(false);
  useEffect(() => {
    if (!sessionId && scenarioSlug && !startedRef.current) {
      startedRef.current = true;
      start.mutate();
    }
  }, [sessionId, scenarioSlug, start]);

  const session = sessionQuery.data;

  useEffect(() => {
    if (!session?.architecture) return;
    if (!hydrated.current) {
      setArchitecture(session.architecture);
      hydrated.current = true;
    }
  }, [session?.architecture]);

  useEffect(() => {
    if (!session || session.completed) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [session]);

  const remaining = session
    ? session.completed
      ? 0
      : remainingFromStart(session.started_at, session.duration_seconds, now)
    : 0;

  useEffect(() => {
    if (session && !session.completed && remaining === 0) {
      void sessionQuery.refetch();
    }
  }, [remaining, session, sessionQuery]);

  function cacheSession(next: InterviewSession) {
    setSessionId(next.id);
    queryClient.setQueryData(queryKeys.interview(next.id), next);
    if (next.architecture) setArchitecture(next.architecture);
  }

  const sendMessage = useMutation({
    mutationFn: (content: string) => api.post<InterviewSession>(`/api/v1/interviews/${sessionId}/messages`, { content }),
    onSuccess: cacheSession,
    onError: () => toast.error("Unable to send your reply."),
  });

  const requestHint = useMutation({
    mutationFn: () => api.post<InterviewSession>(`/api/v1/interviews/${sessionId}/hint`),
    onSuccess: cacheSession,
    onError: () => toast.error("Unable to request a hint."),
  });

  const endInterview = useMutation({
    mutationFn: () => api.post<InterviewSession>(`/api/v1/interviews/${sessionId}/end`),
    onSuccess: (next) => {
      cacheSession(next);
      setConfirmEnd(false);
    },
    onError: () => toast.error("Unable to end the interview."),
  });

  const saveArchitecture = useMutation({
    mutationFn: (graph: ArchitectureGraph) =>
      api.put<InterviewSession>(`/api/v1/interviews/${sessionId}/architecture`, { architecture: graph }),
    onSuccess: cacheSession,
    onError: () => toast.error("Unable to save the architecture."),
  });

  function onArchitectureChange(next: ArchitectureGraph) {
    setArchitecture(next);
    if (!sessionId || session?.completed) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveArchitecture.mutate(next);
    }, 700);
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, []);

  if (!sessionId && start.isPending) {
    return <PageLoader />;
  }
  if (sessionQuery.isLoading && !session) {
    return <CardSkeleton rows={8} />;
  }
  if (sessionQuery.isError) {
    return <ErrorState message="Unable to load this interview." onRetry={() => sessionQuery.refetch()} />;
  }
  if (!session) {
    return <ErrorState message="Interview not found." onRetry={() => router.push("/system-design")} />;
  }

  const scenario = (session.scenario ?? null) as SystemDesignScenario | null;
  const busy = sendMessage.isPending || requestHint.isPending || endInterview.isPending;
  const live = !session.completed;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-steel-800 px-1 pb-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            System Design Interview
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm">
            <h1 className="font-semibold tracking-tight">{session.problem_title || "System Design"}</h1>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{session.phase_label}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("text-sm tabular-nums", remaining <= 5 * 60 && live ? "text-accent" : "text-foreground")}>
            {formatCountdown(remaining)}
            <span className="ml-1.5 text-[12px] text-muted-foreground">{live ? "remaining" : "ended"}</span>
          </div>
          {live ? (
            <Button variant="ghost" size="sm" onClick={() => setConfirmEnd(true)}>
              End Interview
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => router.push("/system-design")}>
              Exit
            </Button>
          )}
        </div>
      </header>

      <div className="mt-3 grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)_minmax(280px,340px)]">
        <div className="min-h-[18rem] min-w-0 lg:min-h-0">
          {scenario ? (
            <ScenarioPanel scenario={scenario} />
          ) : (
            <section className="flex h-full items-center justify-center rounded-2xl border border-steel-800 bg-steel-900 text-sm text-muted-foreground">
              Loading scenario…
            </section>
          )}
        </div>
        <div className="min-h-[28rem] min-w-0 lg:min-h-0">
          <ArchitectureCanvas value={architecture} onChange={onArchitectureChange} readOnly={!live} />
        </div>
        <div className="min-h-[22rem] min-w-0 lg:min-h-0">
          {session.completed ? (
            <InterviewFeedback
              session={session}
              onBack={() => router.push("/system-design")}
              onRetry={() => router.push("/system-design")}
            />
          ) : (
            <InterviewerPanel
              session={session}
              busy={busy}
              onSend={(content) => sendMessage.mutate(content)}
              onHint={() => requestHint.mutate()}
              onShowProblem={() => undefined}
              onEnd={() => setConfirmEnd(true)}
              showProblemButton={false}
              showEndButton={false}
            />
          )}
        </div>
      </div>

      <EndInterviewDialog
        open={confirmEnd}
        busy={endInterview.isPending}
        onContinue={() => setConfirmEnd(false)}
        onConfirm={() => endInterview.mutate()}
      />
    </div>
  );
}
