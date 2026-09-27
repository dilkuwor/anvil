"use client";

import { useMutation } from "@tanstack/react-query";
import { Brain, Check, Loader2, Mic, Square, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useRecorder } from "@/components/buddy/use-recorder";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { transcribeAudio } from "@/lib/buddy";
import { cn } from "@/lib/utils";

export type RecallResult = {
  items: { takeaway: string; covered: boolean; note: string }[];
  covered: number;
  total: number;
  feedback: string;
};

/**
 * Free recall: the learner says or types everything they remember, then sees which takeaways they covered.
 * Nothing is saved; the value is in the retrieval itself.
 */
export function RecallDialog({
  lessonId,
  lessonTitle,
  onClose,
}: {
  lessonId: string;
  lessonTitle: string;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const grade = useMutation({
    mutationFn: (body: string) =>
      api.post<RecallResult>(`/api/v1/learn/lessons/${lessonId}/recall`, {
        text: body,
      }),
    onError: (cause) =>
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Could not grade the recall.",
      ),
  });

  const onRecording = useCallback(async (blob: Blob, filename: string) => {
    try {
      const spoken = await transcribeAudio(blob, filename);
      if (!spoken) {
        setError("No words were recognised. Try again.");
        return;
      }
      setText((current) =>
        current.trim() ? `${current.trim()} ${spoken}` : spoken,
      );
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Could not understand the recording.",
      );
    }
  }, []);
  const recorder = useRecorder({ onRecording, onError: setError });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const result = grade.data;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-xs"
        aria-label="Close recall"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recall-title"
        className="relative flex max-h-[90dvh] w-full max-w-xl flex-col rounded-t-2xl border border-steel-800 bg-steel-900 shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-steel-800/80 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
              <Brain className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2
                id="recall-title"
                className="text-sm font-bold text-foreground"
              >
                Recall from memory
              </h2>
              <p className="text-[12px] text-muted-foreground">{lessonTitle}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-steel-800 hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!result ? (
            <>
              <p className="text-[13px] leading-6 text-muted-foreground">
                Without looking, say or type everything you remember from this
                lesson. Rough words are fine. Then check which key points you
                covered.
              </p>
              <div className="mt-3 flex items-start gap-2">
                {recorder.supported ? (
                  <button
                    type="button"
                    aria-label={
                      recorder.status === "recording"
                        ? "Stop recording"
                        : "Speak"
                    }
                    aria-pressed={recorder.status === "recording"}
                    disabled={
                      recorder.status === "processing" || grade.isPending
                    }
                    className={cn(
                      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-50",
                      recorder.status === "recording"
                        ? "border-accent/50 bg-accent/10 text-accent"
                        : "border-steel-700/80 bg-steel-800/60 text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() =>
                      recorder.status === "recording"
                        ? recorder.stop()
                        : void recorder.start()
                    }
                  >
                    {recorder.status === "processing" ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : recorder.status === "recording" ? (
                      <Square className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <Mic className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                ) : null}
                <textarea
                  ref={inputRef}
                  value={text}
                  rows={7}
                  onChange={(event) => setText(event.target.value)}
                  disabled={grade.isPending}
                  placeholder={
                    recorder.status === "recording"
                      ? "Listening… pause or tap to stop."
                      : "What do you remember?"
                  }
                  className="w-full resize-y rounded-md border border-input-border bg-background px-3 py-2 text-sm leading-6 text-input-foreground outline-none placeholder:text-input-placeholder disabled:opacity-60"
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-[13px] font-semibold text-foreground">
                {result.covered} of {result.total} key points covered
              </p>
              <ul className="mt-2 space-y-1.5">
                {result.items.map((item) => (
                  <li
                    key={item.takeaway}
                    className="flex items-start gap-2 text-[13px] leading-6"
                  >
                    <span
                      className={cn(
                        "mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                        item.covered
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-amber-500/15 text-amber-500",
                      )}
                    >
                      {item.covered ? (
                        <Check className="h-3 w-3" aria-hidden />
                      ) : (
                        <X className="h-3 w-3" aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "font-medium",
                          item.covered
                            ? "text-foreground/90"
                            : "text-foreground",
                        )}
                      >
                        {item.takeaway}
                      </span>
                      {item.note ? (
                        <span className="block text-[12px] text-muted-foreground">
                          {item.note}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
              {result.feedback ? (
                <p className="mt-3 rounded-lg border border-steel-800 bg-steel-950/30 px-3 py-2 text-[13px] leading-6 text-muted-foreground">
                  {result.feedback}
                </p>
              ) : null}
              <details className="mt-3 text-[12.5px] text-muted-foreground">
                <summary className="cursor-pointer">What you wrote</summary>
                <p className="mt-1 whitespace-pre-wrap leading-6">{text}</p>
              </details>
            </>
          )}
          {error ? (
            <p className="mt-2 text-[13px] text-coral">{error}</p>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-steel-800/80 px-5 py-3">
          {!result ? (
            <Button
              size="sm"
              disabled={!text.trim() || grade.isPending}
              onClick={() => {
                setError(null);
                grade.mutate(text);
              }}
            >
              {grade.isPending ? "Checking…" : "Check my recall"}
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  grade.reset();
                  setText("");
                  setError(null);
                }}
              >
                Try again
              </Button>
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
