"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ResultPanel } from "@/components/editor/result-panel";
import { SplitPane } from "@/components/editor/split-pane";
import { EndInterviewDialog, InterviewBanner } from "@/components/interview/interview-banner";
import { InterviewFeedback } from "@/components/interview/interview-feedback";
import { InterviewerPanel } from "@/components/interview/interviewer-panel";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { StatusPip } from "@/components/problems/status-pip";
import { SubmissionHistory } from "@/components/submissions/submission-history";
import { Button } from "@/components/ui/button";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { useTheme } from "@/components/theme/theme-provider";
import { api, type ExecutionResult, type ProblemDetail } from "@/lib/api";
import type { ActiveInterviewResponse, InterviewSession } from "@/lib/interview";
import { remainingFromStart } from "@/lib/interview";
import { queryKeys } from "@/lib/queries";

const Monaco = dynamic(() => import("@monaco-editor/react").then((mod) => mod.default), { ssr: false });

function storageKey(slug: string) {
  return `ia:code:${slug}`;
}

type ProblemTab = "problem" | "examples" | "constraints" | "hints" | "history";

function interviewStorageKey(slug: string) {
  return `ia:interview:${slug}`;
}

export function CodeWorkspace({ slug }: { slug: string }) {
  const problem = useQuery({
    queryKey: queryKeys.problem(slug),
    queryFn: () => api.get<ProblemDetail>(`/api/v1/problems/${slug}`),
  });

  if (problem.isLoading) {
    return <CardSkeleton rows={8} />;
  }
  if (problem.isError) {
    return <ErrorState message="Unable to load this problem." onRetry={() => problem.refetch()} />;
  }
  if (!problem.data) {
    return <ErrorState message="Problem not found." />;
  }

  return <LoadedWorkspace key={problem.data.slug} problem={problem.data} />;
}

function LoadedWorkspace({ problem }: { problem: ProblemDetail }) {
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const [code, setCode] = useState(() => {
    if (typeof window === "undefined") return problem.starter_code;
    return localStorage.getItem(storageKey(problem.slug)) || problem.starter_code;
  });
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [tab, setTab] = useState<ProblemTab>("problem");
  const [collapsed, setCollapsed] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(interviewStorageKey(problem.slug));
  });
  const [interviewMode, setInterviewMode] = useState(() => Boolean(sessionId));
  const [showProblem, setShowProblem] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const prevErrorRef = useRef(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      localStorage.setItem(storageKey(problem.slug), code);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [code, problem.slug]);

  const sessionQuery = useQuery({
    queryKey: queryKeys.interview(sessionId ?? "none"),
    queryFn: () => api.get<InterviewSession>(`/api/v1/interviews/${sessionId}`),
    enabled: Boolean(sessionId) && interviewMode,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.completed) return false;
      return 15_000;
    },
  });
  const session = sessionQuery.data;

  useEffect(() => {
    if (!interviewMode || !session || session.completed) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [interviewMode, session]);

  const remaining = session
    ? session.completed
      ? 0
      : remainingFromStart(session.started_at, session.duration_seconds, now)
    : 0;

  useEffect(() => {
    if (interviewMode && session && !session.completed && remaining === 0) {
      void sessionQuery.refetch();
    }
  }, [remaining, interviewMode, session, sessionQuery]);

  useEffect(() => {
    const isError = sessionQuery.isError && interviewMode;
    if (isError && !prevErrorRef.current) {
      prevErrorRef.current = true;
      setInterviewMode(false);
      setSessionId(null);
      sessionStorage.removeItem(interviewStorageKey(problem.slug));
    }
    if (!sessionQuery.isError) {
      prevErrorRef.current = false;
    }
  }, [sessionQuery.isError, interviewMode, problem.slug]);

  function cacheSession(next: InterviewSession) {
    setSessionId(next.id);
    queryClient.setQueryData(queryKeys.interview(next.id), next);
    sessionStorage.setItem(interviewStorageKey(problem.slug), next.id);
  }

  function leaveInterview() {
    setInterviewMode(false);
    setShowProblem(false);
    setConfirmEnd(false);
    setSessionId(null);
    sessionStorage.removeItem(interviewStorageKey(problem.slug));
  }

  const startInterview = useMutation({
    mutationFn: async () => {
      const active = await api.get<ActiveInterviewResponse>(
        `/api/v1/interviews/active?problem_id=${problem.id}`,
      );
      if (active.session) return active.session;
      return api.post<InterviewSession>("/api/v1/interviews", { problem_id: problem.id });
    },
    onSuccess: (data) => {
      cacheSession(data);
      setInterviewMode(true);
      setShowProblem(false);
    },
    onError: () => toast.error("Unable to start mock interview."),
  });

  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      api.post<InterviewSession>(`/api/v1/interviews/${sessionId}/messages`, { content }),
    onSuccess: cacheSession,
    onError: () => toast.error("Unable to send your response."),
  });

  const requestHint = useMutation({
    mutationFn: () => api.post<InterviewSession>(`/api/v1/interviews/${sessionId}/hint`),
    onSuccess: cacheSession,
    onError: () => toast.error("Unable to request a hint."),
  });

  const notifyEvent = useMutation({
    mutationFn: (payload: {
      type: "RUN" | "SUBMIT";
      status: string;
      passed: number;
      total: number;
      runtime_ms: number | null;
      memory_kb: number | null;
    }) => api.post<InterviewSession>(`/api/v1/interviews/${sessionId}/events`, payload),
    onSuccess: cacheSession,
  });

  const endInterview = useMutation({
    mutationFn: () => api.post<InterviewSession>(`/api/v1/interviews/${sessionId}/end`),
    onSuccess: (data) => {
      cacheSession(data);
      setConfirmEnd(false);
    },
    onError: () => toast.error("Unable to end the interview."),
  });

  const retryInterview = useMutation({
    mutationFn: () => api.post<InterviewSession>("/api/v1/interviews", { problem_id: problem.id }),
    onSuccess: (data) => {
      cacheSession(data);
      setInterviewMode(true);
      setShowProblem(false);
    },
    onError: () => toast.error("Unable to start another mock interview."),
  });

  function reportInterview(type: "RUN" | "SUBMIT", data: ExecutionResult) {
    if (!interviewMode || !sessionId || session?.completed) return;
    notifyEvent.mutate({
      type,
      status: data.status,
      passed: data.passed,
      total: data.total,
      runtime_ms: data.runtime_ms,
      memory_kb: data.memory_kb,
    });
  }

  const run = useMutation({
    mutationFn: () => api.post<ExecutionResult>(`/api/v1/problems/${problem.id}/run`, { source_code: code }),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: queryKeys.progress });
      reportInterview("RUN", data);
    },
    onError: () => toast.error("Unable to execute submission."),
  });

  const submit = useMutation({
    mutationFn: () =>
      api.post<ExecutionResult>(`/api/v1/problems/${problem.id}/submit`, {
        source_code: code,
        language: "JAVA",
      }),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: queryKeys.problem(problem.slug) });
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.progress });
      queryClient.invalidateQueries({ queryKey: ["problems"] });
      if (data.status === "ACCEPTED") toast.success("Accepted. Problem marked solved.");
      reportInterview("SUBMIT", data);
    },
    onError: () => toast.error("Unable to execute submission."),
  });

  const busy = run.isPending || submit.isPending;
  const interviewBusy =
    startInterview.isPending ||
    sendMessage.isPending ||
    requestHint.isPending ||
    endInterview.isPending ||
    retryInterview.isPending;
  const interviewLive = interviewMode && Boolean(session) && !session?.completed;
  const interviewDone = interviewMode && Boolean(session?.completed);
  const tabs: { id: ProblemTab; label: string }[] = [
    { id: "problem", label: "Problem" },
    { id: "examples", label: "Examples" },
    { id: "constraints", label: "Constraints" },
    { id: "hints", label: "Hints" },
    { id: "history", label: "History" },
  ];

  const prompt = (
    <section className="flex h-full min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-steel-800 bg-steel-900 xl:min-h-0">
      <div className="border-b border-steel-800 px-4 py-3">
        <Link href="/problems" className="text-[12px] text-muted-foreground hover:text-accent">
          ← Problems
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
          <h1 className="text-lg font-semibold tracking-tight">{problem.title}</h1>
          <DifficultyBadge difficulty={problem.difficulty} />
          <StatusPip status={problem.status} />
          {interviewLive || interviewDone ? (
            <Button variant="ghost" size="sm" onClick={() => setShowProblem(false)}>
              Hide Problem
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-accent/40 text-accent hover:bg-accent/10"
              disabled={startInterview.isPending}
              onClick={() => startInterview.mutate()}
            >
              {startInterview.isPending ? "Starting…" : "Mock Interview"}
            </Button>
          )}
        </div>
        <div className="mt-1 text-[12px] text-muted-foreground">{problem.tags.map((tag) => tag.name).join(" · ")}</div>
      </div>
      <div className="flex gap-0.5 overflow-x-auto border-b border-steel-800 px-2" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`shrink-0 px-3 py-2 text-[13px] ${tab === item.id ? "border-b-2 border-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-5 py-4 text-sm leading-7 text-foreground">
        {tab === "problem" ? <ProblemBody problem={problem} /> : null}
        {tab === "examples" ? <ExamplesBody problem={problem} /> : null}
        {tab === "constraints" ? <ConstraintsBody problem={problem} /> : null}
        {tab === "hints" ? <HintsBody problem={problem} /> : null}
        {tab === "history" ? (
          <SubmissionHistory
            problemId={problem.id}
            onLoadCode={(source) => {
              setCode(source);
              toast.message("Loaded previous submission into the editor.");
            }}
          />
        ) : null}
      </div>
    </section>
  );

  const editor = (
    <section className="flex min-h-[28rem] flex-1 flex-col overflow-hidden rounded-2xl border border-steel-800 bg-editor-surface xl:min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-steel-800 px-3 py-2">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Java · Solution</div>
          <div className="text-[11px] text-muted-foreground">JDK types are imported automatically.</div>
        </div>
        <div className="flex items-center gap-2">
          {interviewLive || interviewDone ? (
            <Button
              variant="ghost"
              size="sm"
              className="hidden xl:inline-flex"
              onClick={() => setShowProblem((value) => !value)}
            >
              {showProblem ? "Hide Problem" : "Show Problem"}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="hidden xl:inline-flex"
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? "Show Problem" : "Hide Problem"}
            </Button>
          )}
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => run.mutate()}>
            {run.isPending ? "Running…" : "Run"}
          </Button>
          <Button size="sm" disabled={busy} onClick={() => submit.mutate()}>
            {submit.isPending ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </div>
      <div className="min-h-[18rem] flex-1">
        <Monaco
          language="java"
          theme={theme === "dark" ? "vs-dark" : "vs"}
          value={code}
          onChange={(value) => setCode(value ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
          }}
          height="100%"
        />
      </div>
      <div className="max-h-64 overflow-auto border-t border-steel-800 px-4 py-3">
        <ResultPanel result={result} />
      </div>
    </section>
  );

  const interviewer =
    interviewDone && session ? (
      <InterviewFeedback session={session} onBack={leaveInterview} onRetry={() => retryInterview.mutate()} />
    ) : interviewLive && session ? (
      <InterviewerPanel
        session={session}
        busy={interviewBusy}
        onSend={(content) => sendMessage.mutate(content)}
        onHint={() => requestHint.mutate()}
        onShowProblem={() => setShowProblem(true)}
        onEnd={() => setConfirmEnd(true)}
      />
    ) : interviewMode && startInterview.isPending ? (
      <section className="flex h-full min-h-[22rem] items-center justify-center rounded-2xl border border-steel-800 bg-steel-900 text-sm text-muted-foreground xl:min-h-0">
        Starting mock interview…
      </section>
    ) : null;

  const left = interviewMode && !showProblem && interviewer ? interviewer : prompt;

  return (
    <div className="flex h-full min-h-[calc(100vh-6rem)] flex-col gap-3 xl:min-h-0 xl:flex-1">
      {interviewMode ? (
        <InterviewBanner
          phaseLabel={session?.phase_label ?? (startInterview.isPending ? "Introduction" : "…")}
          remainingSeconds={remaining}
        />
      ) : null}
      <div className="flex flex-col gap-3 xl:hidden">
        {interviewer}
        {showProblem || !interviewMode ? prompt : null}
      </div>
      <SplitPane left={left} right={editor} collapsed={interviewMode ? false : collapsed} />
      <EndInterviewDialog
        open={confirmEnd}
        busy={endInterview.isPending}
        onContinue={() => setConfirmEnd(false)}
        onConfirm={() => endInterview.mutate()}
      />
    </div>
  );
}

function ProblemBody({ problem }: { problem: ProblemDetail }) {
  return (
    <div className="space-y-4">
      <MarkdownLike text={problem.description} />
      <p className="text-xs text-muted-foreground">
        Target {problem.time_complexity} time, {problem.space_complexity} extra space. Limit {problem.time_limit_ms}ms.
      </p>
    </div>
  );
}

function ExamplesBody({ problem }: { problem: ProblemDetail }) {
  if (!problem.examples.length) {
    return <p className="text-muted-foreground">No examples for this problem.</p>;
  }
  return (
    <div className="space-y-3">
      {problem.examples.map((example, index) => (
        <div key={index} className="rounded-lg border border-steel-800 bg-steel-950/70 p-3">
          <div className="text-xs uppercase text-muted-foreground">Example {index + 1}</div>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-foreground">Input: {example.input}</pre>
          <pre className="whitespace-pre-wrap font-mono text-xs text-foreground">Output: {example.output}</pre>
          {example.explanation ? <p className="mt-1 text-muted-foreground">{example.explanation}</p> : null}
        </div>
      ))}
    </div>
  );
}

function ConstraintsBody({ problem }: { problem: ProblemDetail }) {
  return (
    <div className="space-y-4">
      <pre className="whitespace-pre-wrap font-mono text-xs text-foreground">{problem.constraints}</pre>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Input format</h2>
        <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-foreground">{problem.input_format}</pre>
      </div>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Output format</h2>
        <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-foreground">{problem.output_format}</pre>
      </div>
    </div>
  );
}

function HintsBody({ problem }: { problem: ProblemDetail }) {
  if (!problem.hints.length) {
    return <p className="text-muted-foreground">No hints for this problem.</p>;
  }
  return (
    <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
      {problem.hints.map((hint) => (
        <li key={hint}>{hint}</li>
      ))}
    </ol>
  );
}

function MarkdownLike({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      {text.split("\n\n").map((para) => (
        <p key={para} dangerouslySetInnerHTML={{ __html: formatInline(para) }} />
      ))}
    </div>
  );
}

function formatInline(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-steel-800 px-1 py-0.5 font-mono text-xs text-accent-light">$1</code>')
    .replace(/\n/g, "<br />");
}
