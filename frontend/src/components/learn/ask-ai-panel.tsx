"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";

import { SaveAiNoteButton } from "@/components/notes/notes-drawer";

import { TutorMarkdown } from "@/components/learn/markdown";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section";
import { ApiError, streamSsePost } from "@/lib/api";
import {
  suggestedLessonQuestions,
  type LearningLessonDetail,
  type LessonAskMessage,
} from "@/lib/learn";

const UNAVAILABLE = "AI tutor is temporarily unavailable. Please try again.";

type AskAiContextValue = {
  lesson: LearningLessonDetail;
  open: boolean;
  pending: boolean;
  error: string | null;
  draft: string;
  messages: LessonAskMessage[];
  suggestions: { label: string; question: string }[];
  setDraft: (value: string) => void;
  toggle: () => void;
  clearConversation: () => void;
  send: (question: string) => Promise<void>;
};

const AskAiContext = createContext<AskAiContextValue | null>(null);

function useAskAi() {
  const value = useContext(AskAiContext);
  if (!value) throw new Error("Ask AI is missing its controller.");
  return value;
}

export function AskAiController({ lesson, children }: { lesson: LearningLessonDetail; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<LessonAskMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const suggestions = useMemo(() => suggestedLessonQuestions(lesson), [lesson]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const toggle = useCallback(() => {
    setOpen((current) => {
      if (current) {
        abortRef.current?.abort();
        setPending(false);
        return false;
      }
      return true;
    });
  }, []);

  const clearConversation = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setPending(false);
    setDraft("");
  }, []);

  const send = useCallback(
    async (question: string) => {
      const next = question.trim();
      if (!next || pending) return;

      const history = messages.slice(-12);
      setOpen(true);
      setDraft("");
      setError(null);
      setPending(true);
      setMessages([...history, { role: "user", content: next }, { role: "assistant", content: "" }]);

      const controller = new AbortController();
      abortRef.current = controller;
      let assembled = "";
      try {
        assembled = await streamSsePost(
          `/api/v1/learn/lessons/${lesson.id}/ask-ai?stream=true`,
          { question: next, conversation: history },
          (delta) => {
            assembled += delta;
            setMessages((current) => {
              const copy = [...current];
              copy[copy.length - 1] = { role: "assistant", content: assembled };
              return copy;
            });
          },
          controller.signal,
        );
        if (!assembled.trim()) {
          throw new ApiError(503, UNAVAILABLE, "service_unavailable");
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof ApiError ? cause.message || UNAVAILABLE : UNAVAILABLE);
        setMessages((current) => {
          const last = current[current.length - 1];
          if (last?.role === "assistant" && !last.content.trim()) {
            return current.slice(0, -1);
          }
          return current;
        });
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setPending(false);
      }
    },
    [lesson.id, messages, pending],
  );

  const value = useMemo(
    () => ({
      lesson,
      open,
      pending,
      error,
      draft,
      messages,
      suggestions,
      setDraft,
      toggle,
      clearConversation,
      send,
    }),
    [lesson, open, pending, error, draft, messages, suggestions, toggle, clearConversation, send],
  );

  return <AskAiContext.Provider value={value}>{children}</AskAiContext.Provider>;
}

export function AskAiButton() {
  const { open, toggle } = useAskAi();
  return (
    <Button size="sm" variant={open ? "secondary" : "default"} aria-expanded={open} onClick={toggle}>
      <Sparkles className="h-3.5 w-3.5" aria-hidden />
      Ask AI
    </Button>
  );
}

export function AskAiPanel() {
  const { lesson, open, pending, error, draft, messages, suggestions, setDraft, clearConversation, send } = useAskAi();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, messages, pending]);

  if (!open) return null;

  return (
    <div className="mb-5 w-full border-b border-steel-800 pb-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <SectionTitle className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" aria-hidden />
            Ask AI
          </SectionTitle>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Ask questions about this lesson or prepare for the interview.
          </p>
        </div>
        {messages.length ? (
          <button
            type="button"
            className="text-[12px] text-muted-foreground hover:text-foreground"
            onClick={clearConversation}
          >
            Clear conversation
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((item) => (
          <Button
            key={item.label}
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => void send(item.question)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto">
        {!messages.length && !error ? (
          <p className="rounded-md border border-dashed border-steel-700 px-3 py-4 text-[13px] text-muted-foreground">
            Ask me anything about this lesson.
          </p>
        ) : null}

        {messages.map((message, index) => {
          const last = index === messages.length - 1;
          const thinking = pending && last && message.role === "assistant" && !message.content;
          if (message.role === "user") {
            return (
              <div key={`${message.role}-${index}`} className="rounded-md bg-steel-800/80 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">You</p>
                <p className="mt-1 text-sm leading-6">{message.content}</p>
              </div>
            );
          }
          return (
            <div key={`${message.role}-${index}`} className="rounded-md border border-steel-800 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Tutor</p>
                {!thinking && message.content.trim() ? (
                  <SaveAiNoteButton
                    context={{ sourceType: "LESSON", sourceId: lesson.id, sourceTitle: lesson.title }}
                    body={message.content}
                    disabled={pending && last}
                  />
                ) : null}
              </div>
              <div className="mt-1">
                {thinking ? <p className="text-[13px] text-muted-foreground">Thinking...</p> : <TutorMarkdown content={message.content} />}
              </div>
            </div>
          );
        })}

        {error ? (
          <div className="rounded-md border border-coral/30 bg-coral/5 px-3 py-2 text-[13px] text-coral">{error}</div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form
        className="mt-4 flex w-full flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask a question about this lesson..."
          disabled={pending}
          className="h-9 min-w-0 w-full flex-1 rounded-md border border-steel-600 bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-copper/70 disabled:opacity-60"
        />
        <Button type="submit" size="sm" className="sm:h-9" disabled={pending || !draft.trim()}>
          {pending ? "Thinking..." : "Send"}
        </Button>
      </form>
    </div>
  );
}
