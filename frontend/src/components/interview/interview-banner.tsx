"use client";

import { Flag } from "lucide-react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  return (
    <ConfirmDialog
      open={open}
      icon={Flag}
      title="End this mock interview?"
      description="Your progress is saved, and your feedback is written up next."
      confirmLabel="End interview"
      busyLabel="Ending…"
      cancelLabel="Keep going"
      busy={busy}
      onConfirm={onConfirm}
      onCancel={onContinue}
    />
  );
}
