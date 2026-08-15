"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ResultPanel } from "@/components/editor/result-panel";
import { SplitPane } from "@/components/editor/split-pane";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { StatusPip } from "@/components/problems/status-pip";
import { SubmissionHistory } from "@/components/submissions/submission-history";
import { Button } from "@/components/ui/button";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { useTheme } from "@/components/theme/theme-provider";
import { api, type ExecutionResult, type ProblemDetail } from "@/lib/api";
import { queryKeys } from "@/lib/queries";

const Monaco = dynamic(() => import("@monaco-editor/react").then((mod) => mod.default), { ssr: false });

function storageKey(slug: string) {
  return `ia:code:${slug}`;
}

type ProblemTab = "problem" | "examples" | "constraints" | "hints" | "history";

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

  useEffect(() => {
    const handle = window.setTimeout(() => {
      localStorage.setItem(storageKey(problem.slug), code);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [code, problem.slug]);

  const run = useMutation({
    mutationFn: () => api.post<ExecutionResult>(`/api/v1/problems/${problem.id}/run`, { source_code: code }),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: queryKeys.progress });
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
    },
    onError: () => toast.error("Unable to execute submission."),
  });

  const busy = run.isPending || submit.isPending;
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
          <Button
            variant="ghost"
            size="sm"
            className="hidden xl:inline-flex"
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? "Show Problem" : "Hide Problem"}
          </Button>
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

  return (
    <div className="flex h-full min-h-[calc(100vh-6rem)] flex-col gap-3 xl:min-h-0 xl:flex-1">
      <div className="xl:hidden">{prompt}</div>
      <SplitPane left={prompt} right={editor} collapsed={collapsed} />
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
