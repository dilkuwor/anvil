"use client";

import { useEffect, useRef, useState } from "react";

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
}: {
  session: InterviewSession;
  busy: boolean;
  onSend: (content: string) => void;
  onHint: () => void;
  onShowProblem: () => void;
  onEnd: () => void;
}) {
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [session.messages.length, busy]);

  function submit() {
    const content = draft.trim();
    if (!content || busy) return;
    onSend(content);
    setDraft("");
  }

  return (
    <section className="flex h-full min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-steel-800 bg-steel-900 xl:min-h-0">
      <div className="flex items-start justify-between gap-3 border-b border-steel-800 px-4 py-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Interviewer</div>
          <div className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            Active
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onShowProblem}>
            Show Problem
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onEnd}>
            End Interview
          </Button>
        </div>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 space-y-5 overflow-auto px-4 py-4">
        {session.messages.map((message) => {
          const interviewer = message.role === "INTERVIEWER";
          return (
            <article key={message.id} className={cn(interviewer ? "pr-4" : "pl-6")}>
              <div
                className={cn(
                  "text-[11px] font-medium uppercase tracking-[0.14em]",
                  interviewer ? "text-muted-foreground" : "text-accent",
                )}
              >
                {interviewer ? "Interviewer" : "You"}
              </div>
              {interviewer ? (
                <blockquote className="mt-1.5 text-sm leading-7 text-foreground">
                  “{message.content.replace(/^["“]|["”]$/g, "")}”
                </blockquote>
              ) : (
                <p className="mt-1.5 text-sm leading-7 text-foreground/90">{message.content}</p>
              )}
            </article>
          );
        })}
        {busy ? <p className="text-[12px] italic text-muted-foreground">The interviewer is listening…</p> : null}
      </div>

      <div className="border-t border-steel-800 p-3">
        <label className="sr-only" htmlFor="interview-reply">
          Your response
        </label>
        <textarea
          id="interview-reply"
          rows={3}
          value={draft}
          disabled={busy}
          placeholder="Type your response..."
          className="w-full resize-none rounded-lg border border-steel-800 bg-background px-3 py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-copper/70"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" disabled={busy} onClick={onHint}>
            Hint{session.hints_used ? ` · ${session.hints_used}` : ""}
          </Button>
          <Button size="sm" disabled={busy || !draft.trim()} onClick={submit}>
            Send
          </Button>
        </div>
      </div>
    </section>
  );
}
