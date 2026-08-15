"use client";

import { formatCountdown } from "@/lib/interview";
import { cn } from "@/lib/utils";

export function InterviewBanner({
  phaseLabel,
  remainingSeconds,
}: {
  phaseLabel: string;
  remainingSeconds: number;
}) {
  const urgent = remainingSeconds <= 5 * 60;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-steel-800 bg-steel-900 px-4 py-2.5">
      <div>
        <div className="text-sm font-semibold tracking-tight">Mock Interview</div>
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{phaseLabel}</div>
      </div>
      <div className={cn("text-sm tabular-nums", urgent ? "text-accent" : "text-foreground")}>
        {formatCountdown(remainingSeconds)}
        <span className="ml-1.5 text-[12px] text-muted-foreground">remaining</span>
      </div>
    </div>
  );
}

export function EndInterviewDialog({
  open,
  busy,
  onContinue,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  onContinue: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-interview-title"
        className="w-full max-w-md rounded-2xl border border-steel-800 bg-steel-900 p-5 shadow-xl"
      >
        <h2 id="end-interview-title" className="text-base font-semibold">
          End this mock interview?
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Your current progress will be saved.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="h-8 rounded-md px-3 text-xs text-foreground hover:bg-steel-800"
            onClick={onContinue}
            disabled={busy}
          >
            Continue
          </button>
          <button
            type="button"
            className="h-8 rounded-md bg-accent px-3 text-xs font-medium text-primary-foreground hover:bg-accent-light disabled:opacity-50"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Ending…" : "End Interview"}
          </button>
        </div>
      </div>
    </div>
  );
}
