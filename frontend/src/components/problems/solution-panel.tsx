"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Copy, Eye, PlayCircle, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { NotesPanel } from "@/components/notes/notes-drawer";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { Button } from "@/components/ui/button";
import { ErrorState, PageLoader } from "@/components/ui/state";
import { api, ApiError, type ProblemDetail, type ProblemSolution, type SolutionApproach } from "@/lib/api";
import { queryKeys } from "@/lib/queries";
import { cn } from "@/lib/utils";

function revealedKey(slug: string) {
  return `ia:solution:revealed:${slug}`;
}

/**
 * The written reference for a problem. Nothing is fetched or shown until the reader asks:
 * trying first is what makes the solution stick.
 */
export function SolutionPanel({
  problem,
  hasStory,
  onOpenStory,
  onLoadCode,
}: {
  problem: ProblemDetail;
  hasStory: boolean;
  onOpenStory: () => void;
  onLoadCode: (code: string) => void;
}) {
  const [revealed, setRevealed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(revealedKey(problem.slug)) === "1";
    } catch {
      return false;
    }
  });

  const solution = useQuery({
    queryKey: queryKeys.problemSolution(problem.slug),
    queryFn: () => api.get<ProblemSolution>(`/api/v1/problems/${problem.slug}/solution`),
    enabled: revealed,
    retry: false,
  });

  function reveal() {
    setRevealed(true);
    try {
      localStorage.setItem(revealedKey(problem.slug), "1");
    } catch {
      // Private mode: it simply asks again next time.
    }
  }

  if (!revealed) {
    return (
      <div className="rounded-xl border border-steel-800/80 bg-steel-950/40 p-5">
        <h2 className="text-[15px] font-semibold text-foreground">Try it yourself first</h2>
        <p className="mt-1.5 text-[13.5px] leading-6 text-muted-foreground">
          Working on a problem before you read the answer is what makes the answer stay. Even ten minutes of being stuck helps.
        </p>
        <ul className="mt-3 space-y-1 text-[13.5px] leading-6 text-foreground/90">
          <li>• Stuck on where to start? Open the Hints tab.</li>
          {hasStory ? <li>• Want to see the idea as pictures? Watch the Visual Story.</li> : null}
          <li>• Ready to check your work or learn the approach? Reveal the solution.</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={reveal}>
            <Eye className="h-4 w-4" aria-hidden />
            Reveal the solution
          </Button>
          {hasStory ? (
            <Button variant="outline" onClick={onOpenStory}>
              <PlayCircle className="h-4 w-4" aria-hidden />
              Visual Story
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (solution.isLoading) return <PageLoader variant="inline" />;
  if (solution.isError || !solution.data) {
    const message = solution.error instanceof ApiError ? solution.error.message : "Unable to load the solution.";
    return <ErrorState message={message} onRetry={() => solution.refetch()} />;
  }

  const data = solution.data;
  const main = data.approaches.filter((item) => !item.is_alternative);
  const alternatives = data.approaches.filter((item) => item.is_alternative);
  const best = main.find((item) => item.is_optimal) ?? main.at(-1);

  return (
    <div className="space-y-3 text-[13.5px] leading-6">
      {/* 1. The idea: the two sentences worth remembering, always open. */}
      <div className="rounded-xl border border-accent/40 bg-accent/10 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">The idea</span>
          {data.pattern ? <span className="rounded-full border border-accent/40 px-2 py-0.5 text-[11px] font-medium text-accent">{data.pattern}</span> : null}
        </div>
        <p className="mt-1.5 text-[15px] font-medium leading-7 text-foreground">
          <Inline text={data.summary} />
        </p>
        {data.trigger ? (
          <p className="mt-2 text-muted-foreground">
            <span className="font-semibold text-foreground/90">You can spot it when you see: </span>
            <Inline text={data.trigger} />
          </p>
        ) : null}
        {best ? (
          <p className="mt-2 text-muted-foreground">
            <span className="font-semibold text-foreground/90">Best cost: </span>
            {best.time_complexity} time · {best.space_complexity} space
          </p>
        ) : null}
      </div>

      <Section title="Approaches, from the obvious way to the best" count={main.length} defaultOpen>
        <div className="space-y-2.5">
          {main.map((approach) => (
            <Approach key={approach.position} approach={approach} onLoadCode={onLoadCode} />
          ))}
        </div>
      </Section>

      {/* Breadth, not ranking: these are different algorithms that also work, worth recognising by name. */}
      {alternatives.length ? (
        <Section title="Other algorithms that also solve this" count={alternatives.length}>
          <p className="mb-2.5 text-muted-foreground">
            Not better or worse than the one above, just a different idea. Knowing the name is often enough.
          </p>
          <div className="space-y-2.5">
            {alternatives.map((approach) => (
              <Approach key={approach.position} approach={approach} onLoadCode={onLoadCode} />
            ))}
          </div>
        </Section>
      ) : null}

      {data.walkthrough.rows.length ? (
        <Section title="Walk through one example" defaultOpen>
          <p className="font-mono text-[12.5px] text-foreground/90">{data.walkthrough.input}</p>
          <div className="mt-2 overflow-x-auto rounded-lg border border-steel-800/80">
            <table className="w-full text-left text-[12.5px]">
              <thead className="bg-steel-950/60 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  {data.walkthrough.columns.map((column) => (
                    <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.walkthrough.rows.map((row, index) => (
                  <tr key={index} className="border-t border-steel-800/70 align-top">
                    {row.map((cell, position) => (
                      <td key={position} className={cn("px-3 py-2", position < 2 || position >= row.length - 3 ? "whitespace-nowrap font-mono" : "text-foreground/90")}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.walkthrough.result ? <p className="mt-2 font-semibold text-foreground">{data.walkthrough.result}</p> : null}
        </Section>
      ) : null}

      {data.mistakes.length ? (
        <Section title="Common mistakes" count={data.mistakes.length}>
          <ul className="space-y-2.5">
            {data.mistakes.map((item) => (
              <li key={item.name} className="rounded-lg border border-steel-800/80 bg-steel-950/40 p-3">
                <div className="font-semibold text-foreground">{item.name}</div>
                <p className="mt-1.5 flex items-start gap-2 text-foreground/90">
                  <X className="mt-1 h-4 w-4 shrink-0 text-coral" aria-hidden />
                  <span>
                    <Inline text={item.wrong} />
                  </span>
                </p>
                <p className="mt-1 flex items-start gap-2 text-foreground/90">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-teal" aria-hidden />
                  <span>
                    <Inline text={item.right} />
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {data.edge_cases.length ? (
        <Section title="Inputs to test" count={data.edge_cases.length}>
          <ul className="divide-y divide-steel-800/70 rounded-lg border border-steel-800/80">
            {data.edge_cases.map((item) => (
              <li key={item.input} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2">
                <code className="font-mono text-[12.5px] text-foreground">{item.input}</code>
                <span className="font-mono text-[12.5px] text-teal">→ {item.expected}</span>
                <span className="text-muted-foreground">{item.why}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {data.interview_script.length ? (
        <Section title="How to say it in an interview">
          <ol className="space-y-1.5">
            {data.interview_script.map((line, index) => (
              <li key={index} className="flex gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-steel-800 text-[11px] font-semibold text-foreground/90">{index + 1}</span>
                <span className="text-foreground/90">
                  <Inline text={line} />
                </span>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {data.follow_ups.length ? (
        <Section title="Follow-up questions" count={data.follow_ups.length}>
          <p className="mb-2 text-muted-foreground">Answer each one in your head before you open it.</p>
          <ul className="space-y-2">
            {data.follow_ups.map((item) => (
              <li key={item.question}>
                <details className="group/q rounded-lg border border-steel-800/80 bg-steel-950/40">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-medium text-foreground">
                    <Inline text={item.question} />
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open/q:rotate-180 motion-reduce:transition-none" aria-hidden />
                  </summary>
                  <p className="border-t border-steel-800/70 px-3 py-2 text-foreground/90">
                    <Inline text={item.answer} />
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <div className="rounded-xl border border-steel-800/80 bg-steel-950/40 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Make it stick</div>
        <p className="mt-1.5 text-foreground/90">Write the idea in your own words. One or two sentences is enough.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-steel-800 py-0.5 pl-1 pr-2.5 text-[12.5px] font-medium text-foreground/90">
            <NotesPanel context={{ sourceType: "PROBLEM", sourceId: problem.id, sourceTitle: problem.title }} />
            My notes
          </span>
          {hasStory ? (
            <Button variant="outline" size="sm" onClick={onOpenStory}>
              <PlayCircle className="h-4 w-4" aria-hidden />
              Watch the Visual Story
            </Button>
          ) : null}
        </div>
        {data.related.length ? (
          <div className="mt-3 border-t border-steel-800/70 pt-3">
            <div className="text-[12px] font-semibold text-foreground/90">Same idea, next problems</div>
            <ul className="mt-1.5 space-y-1">
              {data.related.map((item) => (
                <li key={item.slug} className="flex items-center gap-2">
                  <Link href={`/problems/${item.slug}`} className="text-accent hover:underline">
                    {item.title}
                  </Link>
                  <DifficultyBadge difficulty={item.difficulty} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Approach({ approach, onLoadCode }: { approach: SolutionApproach; onLoadCode: (code: string) => void }) {
  const [showCode, setShowCode] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(approach.code);
      toast.message("Code copied.");
    } catch {
      toast.error("Unable to copy.");
    }
  }

  return (
    <details open={approach.is_optimal} className={cn("group/approach rounded-lg border bg-steel-950/40", approach.is_optimal ? "border-teal/40" : "border-steel-800/80")}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-3 py-2.5">
        {approach.is_alternative ? null : (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-steel-800 text-[11px] font-semibold text-foreground/90">{approach.position + 1}</span>
        )}
        <span className="font-semibold text-foreground">{approach.name}</span>
        {approach.is_optimal ? <span className="rounded-full border border-teal/50 bg-teal/10 px-2 py-0.5 text-[10.5px] font-semibold text-teal">Best</span> : null}
        {approach.is_alternative ? <span className="rounded-full border border-accent/50 bg-accent/10 px-2 py-0.5 text-[10.5px] font-semibold text-accent">Another way</span> : null}
        <span className="ml-auto font-mono text-[12px] text-muted-foreground">
          {approach.time_complexity} · {approach.space_complexity}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open/approach:rotate-180 motion-reduce:transition-none" aria-hidden />
      </summary>
      <div className="space-y-3 border-t border-steel-800/70 px-3 py-3">
        <p className="text-foreground">
          <Inline text={approach.idea} />
        </p>
        <ol className="space-y-1">
          {approach.steps.map((step, index) => (
            <li key={index} className="flex gap-2.5 text-foreground/90">
              <span className="w-4 shrink-0 text-right font-mono text-[12px] text-muted-foreground">{index + 1}.</span>
              <span>
                <Inline text={step} />
              </span>
            </li>
          ))}
        </ol>
        <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
          <dt className="font-semibold text-foreground/90">Time {approach.time_complexity}</dt>
          <dd className="text-muted-foreground">{approach.time_why}</dd>
          <dt className="font-semibold text-foreground/90">Space {approach.space_complexity}</dt>
          <dd className="text-muted-foreground">{approach.space_why}</dd>
          {approach.when_to_use ? (
            <>
              <dt className="font-semibold text-foreground/90">In an interview</dt>
              <dd className="text-muted-foreground">{approach.when_to_use}</dd>
            </>
          ) : null}
        </dl>
        {/* The words come before the code on purpose: read the plan, then check it against the code. */}
        {showCode ? (
          <div>
            <pre className="overflow-x-auto rounded-lg border border-steel-800/80 bg-steel-950/70 p-3 font-mono text-[12px] leading-5 text-foreground">{approach.code.trim()}</pre>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copy}>
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={() => onLoadCode(approach.code.trim() + "\n")}>
                Load into editor
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowCode(false)}>
                Hide code
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowCode(true)}>
            Show the Java code
          </Button>
        )}
      </div>
    </details>
  );
}

function Section({ title, count, defaultOpen = false, children }: { title: string; count?: number; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details open={defaultOpen} className="group/section rounded-xl border border-steel-800/80 bg-steel-900">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[14px] font-semibold text-foreground">
        {title}
        {count ? <span className="rounded-full bg-steel-800 px-1.5 text-[11px] font-medium text-muted-foreground">{count}</span> : null}
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open/section:rotate-180 motion-reduce:transition-none" aria-hidden />
      </summary>
      <div className="border-t border-steel-800/70 px-4 py-3">{children}</div>
    </details>
  );
}

/** Plain text with `inline code`. No HTML is ever injected. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, index) =>
        part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
          <code key={index} className="rounded bg-steel-800 px-1 py-0.5 font-mono text-[12px] text-accent-light">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}
