"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { InterviewSession } from "@/lib/interview";
import { cn } from "@/lib/utils";

export function InterviewerPanel({
  session,
  busy,
  onSend,
  onHint,
  onShowProblem,
  onEnd,
  compact = false,
  locked = false,
  lockFooter,
  showProblemButton = true,
  showEndButton = true,
  showHint = true,
}: {
  session: InterviewSession;
  busy: boolean;
  onSend: (content: string) => void;
  onHint: () => void;
  onShowProblem: () => void;
  onEnd: () => void;
  compact?: boolean;
  locked?: boolean;
  lockFooter?: ReactNode;
  showProblemButton?: boolean;
  showEndButton?: boolean;
  showHint?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const name = session.interviewer_name || "Interviewer";

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [session.messages.length, busy]);

  function submit() {
    const content = draft.trim();
    if (!content || busy || locked) return;
    onSend(content);
    setDraft("");
  }

  return (
    <section
      className={cn(
        "grid h-full min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-steel-900",
        compact ? "min-h-[18rem]" : "min-h-[22rem] rounded-2xl border border-steel-800 xl:min-h-0",
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-steel-800/80 bg-steel-950/30 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-steel-800 bg-steel-950 text-sm font-semibold text-foreground">
            {name.charAt(0)}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-steel-900 bg-emerald-500" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-foreground">{name}</div>
            <div className="text-[12px] text-muted-foreground">
              {session.interviewer_name ? "Senior Software Engineer · Interviewer" : "In the interview"}
            </div>
          </div>
        </div>
        {compact || (!showProblemButton && !showEndButton) ? null : (
          <div className="flex items-center gap-1.5">
            {showProblemButton ? (
              <Button variant="ghost" size="sm" onClick={onShowProblem}>
                Show Problem
              </Button>
            ) : null}
            {showEndButton ? (
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-rose-400" onClick={onEnd}>
                End Interview
              </Button>
            ) : null}
          </div>
        )}
      </div>

      <div ref={scroller} className="min-h-0 overflow-auto px-5 py-4 space-y-4">
        {session.messages.filter((message) => !isProblemHandout(message.content, session.problem_title)).map((message) => {
          const interviewer = message.role === "INTERVIEWER";
          return (
            <article
              key={message.id}
              className={cn(
                "rounded-2xl p-3.5 transition-colors",
                interviewer
                  ? "border border-steel-800/80 bg-steel-950/50 mr-4"
                  : "border border-accent/25 bg-accent/5 ml-4",
              )}
            >
              <div
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.14em]",
                  interviewer ? "text-muted-foreground" : "text-accent",
                )}
              >
                {interviewer ? name : "You"}
              </div>
              <p
                className={cn(
                  "mt-1 whitespace-pre-wrap text-sm leading-relaxed",
                  interviewer ? "text-foreground" : "text-foreground/90",
                )}
              >
                {interviewer ? message.content.replace(/^["“]|["”]$/g, "") : message.content}
              </p>
            </article>
          );
        })}
        {busy ? (
          <p className="flex items-center gap-2 text-[12px] text-muted-foreground" aria-live="polite">
            <span className="flex gap-1" aria-hidden>
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70" />
            </span>
            {name} is typing…
          </p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-steel-800/80 bg-steel-950/30 p-3.5">
        {locked ? (
          lockFooter
        ) : (
          <>
            <label className="sr-only" htmlFor="interview-reply">
              Your response
            </label>
            <textarea
              id="interview-reply"
              rows={compact ? 2 : 3}
              value={draft}
              disabled={busy}
              placeholder="Think out loud — say it the way you would to the interviewer…"
              className="w-full resize-none rounded-xl border border-steel-800/80 bg-background px-3.5 py-2.5 text-sm leading-6 text-foreground placeholder:text-muted-foreground/60 focus:border-accent/50 focus:ring-1 focus:ring-accent/50 outline-none transition-colors"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
            />
            <div className="mt-2.5 flex items-center justify-between gap-2">
              {compact || !showHint ? (
                <span />
              ) : (
                <Button variant="ghost" size="sm" disabled={busy} onClick={onHint}>
                  Hint{session.hints_used ? ` · ${session.hints_used}` : ""}
                </Button>
              )}
              <Button size="sm" disabled={busy || !draft.trim()} onClick={submit}>
                Send
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function isProblemHandout(content: string, problemTitle: string): boolean {
  const text = content.trim();
  const first = text.split("\n", 1)[0]?.trim();
  return Boolean(problemTitle) && first === problemTitle && /constraints:/i.test(text);
}
