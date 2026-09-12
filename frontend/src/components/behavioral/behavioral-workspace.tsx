"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EndInterviewDialog } from "@/components/interview/interview-banner";
import { InterviewFeedback } from "@/components/interview/interview-feedback";
import { InterviewerPanel } from "@/components/interview/interviewer-panel";
import { Button } from "@/components/ui/button";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api } from "@/lib/api";
import { behavioralPlan, formatCountdown, remainingFromStart, type InterviewSession } from "@/lib/interview";
import { queryKeys } from "@/lib/queries";
import { cn } from "@/lib/utils";

const STAR_CHECK = [
  ["Situation", "one sentence of context"],
  ["Task", "what you owned"],
  ["Action", "what you did, as 'I'"],
  ["Result", "a number, then a lesson"],
] as const;

export function BehavioralWorkspace() {
  const search = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionId = search.get("id");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const sessionQuery = useQuery({
    queryKey: queryKeys.interview(sessionId ?? "none"),
    queryFn: () => api.get<InterviewSession>(`/api/v1/interviews/${sessionId}`),
    enabled: Boolean(sessionId),
  });
  const session = sessionQuery.data;

  useEffect(() => {
    if (!session || session.completed) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [session]);

  const remaining = session ? (session.completed ? 0 : remainingFromStart(session.started_at, session.duration_seconds, now)) : 0;

  useEffect(() => {
    if (session && !session.completed && remaining === 0) void sessionQuery.refetch();
  }, [remaining, session, sessionQuery]);

  function cache(next: InterviewSession) {
    queryClient.setQueryData(queryKeys.interview(next.id), next);
  }

  const send = useMutation({
    mutationFn: (content: string) => api.post<InterviewSession>(`/api/v1/interviews/${sessionId}/messages`, { content }),
    onSuccess: cache,
    onError: () => toast.error("Unable to send your answer."),
  });
  const hint = useMutation({
    mutationFn: () => api.post<InterviewSession>(`/api/v1/interviews/${sessionId}/hint`),
    onSuccess: cache,
    onError: () => toast.error("Unable to request a hint."),
  });
  const end = useMutation({
    mutationFn: () => api.post<InterviewSession>(`/api/v1/interviews/${sessionId}/end`),
    onSuccess: (next) => {
      cache(next);
      setConfirmEnd(false);
    },
    onError: () => toast.error("Unable to end the interview."),
  });

  if (!sessionId) {
    return <ErrorState message="Pick a track on the Behavioral page to start." onRetry={() => router.push("/behavioral")} />;
  }
  if (sessionQuery.isLoading && !session) return <CardSkeleton rows={8} />;
  if (sessionQuery.isError) return <ErrorState message="Unable to load this interview." onRetry={() => sessionQuery.refetch()} />;
  if (!session) return <ErrorState message="Interview not found." onRetry={() => router.push("/behavioral")} />;

  const plan = behavioralPlan(session);
  const questions = plan?.questions ?? [];
  const index = Math.min(plan?.current ?? 0, Math.max(0, questions.length - 1));
  const current = questions[index];
  const closing = session.phase === "CLOSING";
  const live = !session.completed;
  const busy = send.isPending || hint.isPending || end.isPending;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-steel-800 px-1 pb-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Behavioral Interview</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm">
            <h1 className="font-semibold tracking-tight">{session.problem_title || "Behavioral"}</h1>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{session.phase_label}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("text-sm tabular-nums", remaining <= 3 * 60 && live ? "text-accent" : "text-foreground")}>
            {formatCountdown(remaining)}
            <span className="ml-1.5 text-[12px] text-muted-foreground">{live ? "remaining" : "ended"}</span>
          </div>
          {live ? (
            <Button variant="ghost" size="sm" onClick={() => setConfirmEnd(true)}>
              End Interview
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => router.push("/behavioral")}>
              Exit
            </Button>
          )}
        </div>
      </header>

      <div className="mt-3 grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
        <section className="flex min-h-[18rem] flex-col overflow-hidden rounded-2xl border border-steel-800 bg-steel-900 lg:min-h-0">
          <div className="border-b border-steel-800 px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {closing ? "Closing" : `Question ${index + 1} of ${questions.length}`}
            </div>
            <h2 className="mt-1.5 text-sm font-semibold leading-6">
              {closing ? "That is all my questions. What questions do you have for me?" : (current?.question ?? "Loading…")}
            </h2>
            {current && !closing ? (
              <div className="mt-1 text-[12px] text-muted-foreground">{current.competency_title}</div>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-auto px-4 py-4 text-[13px] leading-6">
            {closing ? (
              <div>
                <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Ask about the work</h3>
                <ul className="mt-2 space-y-1.5 text-foreground/90">
                  <li>What did the team ship last quarter, and what got cut to ship it?</li>
                  <li>What does a bad week look like on this team?</li>
                  <li>How do decisions get made when two senior people disagree?</li>
                  <li>What would make the first ninety days a success?</li>
                </ul>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">STAR checklist</h3>
                  <ul className="mt-2 space-y-1.5">
                    {STAR_CHECK.map(([label, body]) => (
                      <li key={label} className="flex gap-2">
                        <span className="w-4 shrink-0 font-bold text-accent">{label[0]}</span>
                        <span>
                          <span className="font-medium">{label}</span>
                          <span className="text-muted-foreground"> · {body}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                {current?.looking_for.length ? (
                  <div>
                    <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">A strong answer</h3>
                    <ul className="mt-2 space-y-1.5 text-foreground/90">
                      {current.looking_for.map((line) => (
                        <li key={line} className="flex gap-2">
                          <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p className="text-[12px] text-muted-foreground">
                  Aim for about two minutes. After you answer, the interviewer will probe one gap, then move to the next question.
                </p>
              </>
            )}
          </div>
        </section>

        <div className="min-h-[22rem] min-w-0 lg:min-h-0">
          {session.completed ? (
            <InterviewFeedback session={session} onBack={() => router.push("/behavioral")} onRetry={() => router.push("/behavioral")} />
          ) : (
            <InterviewerPanel
              session={session}
              busy={busy}
              onSend={(content) => send.mutate(content)}
              onHint={() => hint.mutate()}
              onShowProblem={() => undefined}
              onEnd={() => setConfirmEnd(true)}
              showProblemButton={false}
              showEndButton={false}
            />
          )}
        </div>
      </div>

      <EndInterviewDialog open={confirmEnd} busy={end.isPending} onContinue={() => setConfirmEnd(false)} onConfirm={() => end.mutate()} />
    </div>
  );
}
