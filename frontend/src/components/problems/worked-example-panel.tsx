"use client";

import { Check, Eye, EyeOff, Lock, Play } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  useCheckWorkedExample,
  useWorkedExample,
  type WorkedExample,
} from "@/lib/worked";

/**
 * Faded worked example. Level 0 shows the whole reference solution with its step notes.
 * Each level after that blanks one more block from the end, until the learner writes it all.
 */
export function WorkedExamplePanel({ slug }: { slug: string }) {
  const example = useWorkedExample(slug);
  if (example.isLoading) return <CardSkeleton rows={6} />;
  if (example.isError || !example.data) {
    const message =
      example.error instanceof ApiError && example.error.status === 403
        ? "Hidden while your mock interview on this problem is running."
        : "No worked example for this problem yet.";
    return <ErrorState message={message} />;
  }
  return <Ladder key={slug} slug={slug} example={example.data} />;
}

function Ladder({ slug, example }: { slug: string; example: WorkedExample }) {
  const total = example.total_levels;
  const nextLevel = Math.min(example.levels_done + 1, total);
  const [level, setLevel] = useState(() =>
    example.levels_done === 0 ? 0 : nextLevel,
  );
  const [filled, setFilled] = useState<Record<number, string>>({});
  const [peek, setPeek] = useState<Record<number, boolean>>({});
  const check = useCheckWorkedExample(slug);
  const blankFrom = total - level;
  const result = check.data;
  const complete = example.levels_done >= total;

  function update(index: number, value: string) {
    setFilled((current) => ({ ...current, [index]: value }));
  }

  function run() {
    const texts = example.blocks
      .map((_, i) => filled[i] ?? "")
      .slice(blankFrom);
    if (texts.some((text) => !text.trim())) return;
    check.mutate(
      { level, filled: texts },
      {
        onSuccess: (data) => {
          if (data.passed && level < total) {
            // Stay on the passed level so the learner sees the green state; the next tab unlocks.
          }
        },
      },
    );
  }

  const canCheck =
    level > 0 &&
    example.blocks
      .slice(blankFrom)
      .every((_, offset) => (filled[blankFrom + offset] ?? "").trim());

  return (
    <div className="space-y-4 text-[13.5px]">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Worked example
        </p>
        <h2 className="mt-0.5 text-[15px] font-bold text-foreground">
          {example.approach}
        </h2>
        {example.idea ? (
          <p className="mt-1 leading-6 text-muted-foreground">{example.idea}</p>
        ) : null}
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Study the full solution first. Each level hides one more block from
          the end for you to write. Passing the sample tests unlocks the next
          level.
        </p>
      </div>

      <div
        className="flex flex-wrap items-center gap-1.5"
        role="tablist"
        aria-label="Fading level"
      >
        <LevelTab active={level === 0} onClick={() => setLevel(0)}>
          Study
        </LevelTab>
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
          const done = n <= example.levels_done;
          const locked = n > nextLevel;
          return (
            <LevelTab
              key={n}
              active={level === n}
              done={done}
              locked={locked}
              onClick={() => !locked && setLevel(n)}
            >
              {n === total ? "Write it all" : `Level ${n}`}
            </LevelTab>
          );
        })}
        {complete ? (
          <span className="ml-1 text-[12px] font-medium text-emerald-600 dark:text-emerald-300">
            All levels passed
          </span>
        ) : null}
      </div>

      {example.steps.length ? (
        <ol className="space-y-1 rounded-lg border border-steel-800 bg-steel-950/30 px-4 py-3">
          {example.steps.map((step, i) => (
            <li key={step} className="flex gap-2 leading-6">
              <span className="w-4 shrink-0 text-right text-[12px] font-semibold text-accent">
                {i + 1}
              </span>
              <span className="text-foreground/90">{step}</span>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-steel-800 bg-steel-950/40 font-mono text-[12.5px] leading-5">
        <pre className="px-3 pt-2 text-foreground/90">{example.header}</pre>
        {example.blocks.map((block, i) => {
          const blank = level > 0 && i >= blankFrom;
          if (!blank) {
            return (
              <pre
                key={i}
                className="whitespace-pre px-3 py-1 text-foreground/90"
              >
                {block}
              </pre>
            );
          }
          const rows = Math.max(3, block.split("\n").length);
          return (
            <div
              key={i}
              className="border-y border-dashed border-accent/40 bg-accent/5 px-3 py-2"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-accent">
                  Block {i + 1} · write this part
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-sans text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setPeek((current) => ({ ...current, [i]: !current[i] }))
                  }
                >
                  {peek[i] ? (
                    <EyeOff className="h-3 w-3" aria-hidden />
                  ) : (
                    <Eye className="h-3 w-3" aria-hidden />
                  )}
                  {peek[i] ? "Hide reference" : "Peek"}
                </button>
              </div>
              <textarea
                aria-label={`Block ${i + 1}`}
                value={filled[i] ?? ""}
                rows={rows}
                spellCheck={false}
                onChange={(event) => update(i, event.target.value)}
                className="w-full resize-y rounded-md border border-input-border bg-background px-2 py-1.5 font-mono text-[12.5px] leading-5 text-input-foreground outline-none placeholder:text-input-placeholder"
                placeholder="// your code"
              />
              {peek[i] ? (
                <pre className="mt-1 whitespace-pre rounded-md bg-steel-900 px-2 py-1.5 text-muted-foreground">
                  {block}
                </pre>
              ) : null}
            </div>
          );
        })}
        <pre className="px-3 pb-2 text-foreground/90">{example.footer}</pre>
      </div>

      {level > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            onClick={run}
            disabled={!canCheck || check.isPending}
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            {check.isPending ? "Running…" : "Check with sample tests"}
          </Button>
          {check.isError ? (
            <span className="text-[12.5px] text-coral">
              {check.error instanceof ApiError
                ? check.error.message
                : "Could not run the code."}
            </span>
          ) : null}
          {result ? (
            <span
              className={cn(
                "text-[12.5px] font-medium",
                result.passed
                  ? "text-emerald-600 dark:text-emerald-300"
                  : "text-amber-600 dark:text-amber-300",
              )}
            >
              {result.passed
                ? level < total
                  ? `Passed. Level ${level + 1} unlocked.`
                  : "Passed. You wrote the whole solution."
                : `${result.result.passed} of ${result.result.total} sample tests passed.`}
            </span>
          ) : null}
        </div>
      ) : null}
      {result && !result.passed ? (
        <FailureNote
          status={result.result.status}
          compile={result.result.compile_output}
        />
      ) : null}
    </div>
  );
}

function FailureNote({
  status,
  compile,
}: {
  status: string;
  compile: string | null;
}) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[12.5px]">
      <p className="font-medium text-foreground">
        {status.replace(/_/g, " ").toLowerCase()}
      </p>
      {compile ? (
        <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11.5px] text-muted-foreground">
          {compile}
        </pre>
      ) : null}
      <p className="mt-1 text-muted-foreground">
        Compare with the step notes, or peek at the reference for that block.
      </p>
    </div>
  );
}

function LevelTab({
  active,
  done,
  locked,
  onClick,
  children,
}: {
  active: boolean;
  done?: boolean;
  locked?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-disabled={locked}
      disabled={locked}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed",
        active
          ? "border-accent bg-accent/10 text-foreground"
          : "border-steel-800 text-muted-foreground hover:text-foreground",
        locked && "opacity-50",
      )}
      onClick={onClick}
    >
      {done ? (
        <Check className="h-3 w-3 text-emerald-500" aria-hidden />
      ) : locked ? (
        <Lock className="h-3 w-3" aria-hidden />
      ) : null}
      {children}
    </button>
  );
}
