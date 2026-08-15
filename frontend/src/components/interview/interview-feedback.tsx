"use client";

import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { Button } from "@/components/ui/button";
import { formatMemory, formatRuntime } from "@/lib/utils";
import { formatScore, SCORE_ROWS, type InterviewSession } from "@/lib/interview";

export function InterviewFeedback({
  session,
  onBack,
  onRetry,
}: {
  session: InterviewSession;
  onBack: () => void;
  onRetry: () => void;
}) {
  const feedback = session.feedback;
  if (!feedback) {
    return (
      <section className="flex h-full min-h-[22rem] flex-col justify-center overflow-auto rounded-2xl border border-steel-800 bg-steel-900 px-5 py-6 xl:min-h-0">
        <p className="text-sm text-muted-foreground">Preparing your interview summary…</p>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-steel-800 bg-steel-900 xl:min-h-0">
      <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Mock Interview Complete
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">{session.problem_title}</h2>
          <DifficultyBadge difficulty={session.difficulty} />
        </div>

        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Overall Score</div>
          <div className="mt-0.5 text-3xl font-semibold tabular-nums tracking-tight">
            {formatScore(feedback.overall)} <span className="text-base font-medium text-muted-foreground">/ 10</span>
          </div>
        </div>

        <dl className="mt-5 space-y-2">
          {SCORE_ROWS.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-3 text-sm">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="tabular-nums text-foreground">
                {formatScore(feedback.scores[row.key])}
                <span className="text-muted-foreground">/10</span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="my-5 h-px bg-steel-800" />

        <section>
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            What you did well
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-6">
            {feedback.strengths.map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-5">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Areas to improve
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-foreground/90">
            {feedback.improvements.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-5">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Interviewer feedback
          </h3>
          <blockquote className="mt-2 text-sm leading-7 text-foreground">“{feedback.summary}”</blockquote>
        </section>

        <p className="mt-5 text-[12px] text-muted-foreground">
          {feedback.objective.submission_accepted ? "Submission accepted" : "Not accepted"}
          {" · "}
          {feedback.objective.tests_passed}/{feedback.objective.tests_total || "—"} tests
          {" · "}
          {feedback.objective.hints_used} hint{feedback.objective.hints_used === 1 ? "" : "s"}
          {" · "}
          {formatRuntime(feedback.objective.runtime_ms)}
          {" · "}
          {formatMemory(feedback.objective.memory_kb)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-steel-800 px-4 py-3">
        <Button variant="secondary" size="sm" onClick={onBack}>
          Back to Problem
        </Button>
        <Button size="sm" onClick={onRetry}>
          Try Another Mock Interview
        </Button>
      </div>
    </section>
  );
}
