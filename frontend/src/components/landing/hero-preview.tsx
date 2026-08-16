"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import Link from "next/link";

import { InterviewerPanel } from "@/components/interview/interviewer-panel";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import type { InterviewSession } from "@/lib/interview";
import { loginHref, registerHref, useSession } from "@/lib/session";

const WORKFLOW = ["Practice", "Learn", "Interview", "Improve"] as const;

const INITIAL_CODE = `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }
}`;

const KEYWORDS = new Set(["class", "public", "int", "for", "if", "return", "new"]);
const TYPES = new Set(["Solution", "Map", "Integer", "HashMap"]);

type RunState = "idle" | "running" | "passed";
type ProblemTab = "problem" | "examples" | "constraints" | "hints";

const PROBLEM_TABS: { id: ProblemTab; label: string }[] = [
  { id: "problem", label: "Problem" },
  { id: "examples", label: "Examples" },
  { id: "constraints", label: "Constraints" },
  { id: "hints", label: "Hints" },
];

function highlightLine(line: string) {
  return line.split(/(\s+|[{}();,\[\]<>.])/).map((part, index) => {
    if (!part) return null;
    if (KEYWORDS.has(part)) {
      return (
        <span key={index} className="text-teal">
          {part}
        </span>
      );
    }
    if (TYPES.has(part)) {
      return (
        <span key={index} className="text-accent-light">
          {part}
        </span>
      );
    }
    if (/^\d+$/.test(part)) {
      return (
        <span key={index} className="text-accent">
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

const EDITOR_TYPE =
  "font-mono text-[10px] leading-[1.55] sm:text-[12px] sm:leading-[1.55]";

const PREVIEW_TURNS = 4;

function candidateTurns(session: InterviewSession) {
  return session.messages.filter((message) => message.role === "CANDIDATE").length;
}

export function HeroPreview() {
  const { signedIn } = useSession();
  const [code, setCode] = useState(INITIAL_CODE);
  const [runState, setRunState] = useState<RunState>("idle");
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [showInterviewer, setShowInterviewer] = useState(false);
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [interviewError, setInterviewError] = useState<string | null>(null);
  const [problemTab, setProblemTab] = useState<ProblemTab>("problem");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const lines = code.split("\n");

  function syncScroll() {
    const editor = editorRef.current;
    if (!editor) return;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = editor.scrollTop;
      highlightRef.current.scrollLeft = editor.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = editor.scrollTop;
  }

  function handleChange(value: string) {
    setCode(value);
    if (runState !== "idle") setRunState("idle");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const next = `${code.slice(0, start)}    ${code.slice(end)}`;
    handleChange(next);
    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = start + 4;
    });
  }

  function handleRun() {
    if (runState === "running") return;
    setRunState("running");
    window.setTimeout(() => setRunState("passed"), 700);
  }

  async function startMock() {
    if (starting) return;
    setInterviewError(null);
    setStarting(true);
    try {
      const next = await api.post<InterviewSession>("/api/v1/interviews/preview");
      setSession(next);
      setShowInterviewer(true);
    } catch (error) {
      setInterviewError(error instanceof ApiError ? error.message : "Unable to start mock interview.");
    } finally {
      setStarting(false);
    }
  }

  async function sendMock(content: string) {
    if (!session || sending) return;
    setInterviewError(null);
    setSending(true);
    try {
      const next = await api.post<InterviewSession>(`/api/v1/interviews/preview/${session.id}/messages`, {
        content,
      });
      setSession(next);
    } catch (error) {
      setInterviewError(error instanceof ApiError ? error.message : "Unable to send your response.");
    } finally {
      setSending(false);
    }
  }

  const locked = session ? candidateTurns(session) >= PREVIEW_TURNS : false;

  return (
    <aside className="w-full min-w-0 overflow-hidden rounded-2xl border border-steel-800 bg-steel-900 shadow-[0_18px_48px_-28px_rgba(0,0,0,0.45)] dark:shadow-[0_22px_56px_-24px_rgba(0,0,0,0.72)]">
      <div className="flex min-w-0 items-center gap-3 border-b border-steel-800 px-4 py-2 sm:px-5">
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-steel-700" />
          <span className="h-2 w-2 rounded-full bg-steel-700" />
          <span className="h-2 w-2 rounded-full bg-steel-700" />
        </div>
        <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
        <p className="ml-auto hidden min-w-0 items-center gap-x-1.5 text-[11px] text-muted-foreground sm:flex">
          {WORKFLOW.map((step, index) => (
            <span key={step} className="inline-flex items-center gap-x-1.5">
              {index > 0 ? <span aria-hidden>→</span> : null}
              <span>{step}</span>
            </span>
          ))}
        </p>
      </div>

      <p className="flex flex-wrap items-center gap-x-1.5 border-b border-steel-800 px-4 py-1.5 text-[11px] text-muted-foreground sm:hidden">
        {WORKFLOW.map((step, index) => (
          <span key={step} className="inline-flex items-center gap-x-1.5">
            {index > 0 ? <span aria-hidden>→</span> : null}
            <span>{step}</span>
          </span>
        ))}
      </p>

      <div className="grid min-h-0 md:grid-cols-2">
        <section className="flex min-h-0 flex-col border-b border-steel-800 md:border-b-0 md:border-r">
          {session && showInterviewer ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-2 border-b border-steel-800 px-4 py-2">
                <button
                  type="button"
                  className="text-[12px] text-muted-foreground hover:text-accent"
                  onClick={() => setShowInterviewer(false)}
                >
                  ← Problem
                </button>
                <span className="text-[12px] text-muted-foreground">
                  {Math.min(candidateTurns(session), PREVIEW_TURNS)} / {PREVIEW_TURNS}
                </span>
              </div>
              <InterviewerPanel
                session={session}
                busy={sending}
                compact
                locked={locked}
                onSend={sendMock}
                onHint={() => undefined}
                onShowProblem={() => setShowInterviewer(false)}
                onEnd={() => undefined}
                lockFooter={
                  <div>
                    <p className="text-[13px] leading-6 text-muted-foreground">
                      Preview limit reached. Log in to continue this mock interview.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {signedIn ? (
                        <Button asChild size="sm">
                          <Link href="/problems/pair-target">Continue on Pair Target</Link>
                        </Button>
                      ) : (
                        <>
                          <Button asChild size="sm">
                            <Link href={loginHref()}>Log in</Link>
                          </Button>
                          <Button asChild size="sm" variant="secondary">
                            <Link href={registerHref()}>Create account</Link>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                }
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="px-4 pt-3 pb-2 sm:px-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Current Problem</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-semibold tracking-tight">Pair Target</h3>
                  <DifficultyBadge difficulty="EASY" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[11px] border-accent/40 text-accent hover:bg-accent/10"
                    disabled={starting}
                    onClick={() => (session ? setShowInterviewer(true) : void startMock())}
                  >
                    {starting ? "Starting…" : "Mock Interview"}
                  </Button>
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">Hash map · two pointers</p>
                {interviewError ? <p className="mt-2 text-[12px] text-coral">{interviewError}</p> : null}
              </div>

              <div className="flex gap-0.5 overflow-x-auto border-b border-steel-800 px-2" role="tablist" aria-label="Problem details">
                {PROBLEM_TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={problemTab === item.id}
                    className={`shrink-0 px-3 py-2 text-[13px] ${
                      problemTab === item.id
                        ? "border-b-2 border-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setProblemTab(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-auto px-4 py-3 text-sm leading-6 sm:px-5">
                {problemTab === "problem" ? (
                  <p>Find two indices whose values add up to the target. Return the pair of indices.</p>
                ) : null}

                {problemTab === "examples" ? (
                  <div className="rounded-lg border border-steel-800 bg-steel-950/70 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Input</p>
                    <pre className="mt-1 whitespace-pre-wrap font-mono text-[12px] leading-5">
                      nums = [2, 7, 11, 15], target = 9
                    </pre>
                    <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Output</p>
                    <pre className="mt-1 font-mono text-[12px] leading-5">[0, 1]</pre>
                  </div>
                ) : null}

                {problemTab === "constraints" ? (
                  <ul className="space-y-1 text-[13px] leading-6 text-muted-foreground">
                    <li>2 ≤ nums.length ≤ 10⁴</li>
                    <li>Exactly one valid answer exists.</li>
                  </ul>
                ) : null}

                {problemTab === "hints" ? (
                  <p className="text-[13px] leading-6 text-muted-foreground">
                    Use a HashMap to track previously seen values.
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </section>

        <section className="flex min-h-0 flex-col bg-editor-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-steel-800 px-4 py-2.5 sm:px-5">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Your Solution</p>
              <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">solution.java</p>
            </div>
            <span className="rounded-md border border-steel-800 bg-steel-900 px-2 py-0.5 text-[11px] text-muted-foreground">
              Java
            </span>
          </div>

          <div className="flex min-h-[12rem] flex-1">
            <div
              ref={gutterRef}
              aria-hidden
              className={`overflow-hidden border-r border-steel-800 bg-steel-950/40 px-2 py-2.5 text-right ${EDITOR_TYPE} select-none text-muted-foreground`}
            >
              {lines.map((_, index) => (
                <div key={index} className="tabular-nums">
                  {index + 1}
                </div>
              ))}
            </div>
            <div className="relative min-w-0 flex-1">
              <pre
                ref={highlightRef}
                aria-hidden
                className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre px-3 py-2.5 text-foreground ${EDITOR_TYPE}`}
              >
                {lines.map((line, index) => (
                  <div key={index}>{line ? highlightLine(line) : " "}</div>
                ))}
              </pre>
              <label className="sr-only" htmlFor="workspace-solution">
                Your solution
              </label>
              <textarea
                id="workspace-solution"
                ref={editorRef}
                value={code}
                spellCheck={false}
                wrap="off"
                autoCapitalize="off"
                autoCorrect="off"
                onChange={(event) => handleChange(event.target.value)}
                onKeyDown={handleKeyDown}
                onScroll={syncScroll}
                className={`absolute inset-0 h-full w-full resize-none overflow-auto bg-transparent px-3 py-2.5 text-transparent caret-foreground outline-none ${EDITOR_TYPE}`}
              />
            </div>
          </div>

          <div className="border-t border-steel-800 px-4 py-2.5 sm:px-5">
            <div className="flex items-center gap-3 text-[12px]">
              <span className="border-b-2 border-accent pb-0.5 font-medium">Console</span>
              <span className="pb-0.5 text-muted-foreground">Tests</span>
            </div>
            <div className="mt-2 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p
                className={
                  runState === "passed"
                    ? "text-[13px] text-success"
                    : "text-[13px] text-muted-foreground"
                }
              >
                {runState === "running" ? "Running…" : runState === "passed" ? "✓ 3 tests passed" : "Run sample tests to see results."}
              </p>
              <Button size="sm" className="h-6 px-2 text-[11px]" disabled={runState === "running"} onClick={handleRun}>
                {runState === "running" ? "Running..." : "▶ Run"}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}
