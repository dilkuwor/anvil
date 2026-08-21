"use client";

import { BookOpen, FileText, Maximize2, Minimize2, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AskAiButton, AskAiPanel } from "@/components/learn/ask-ai-panel";
import { LessonMarkdown } from "@/components/learn/markdown";
import { ListenButton } from "@/components/tts/listen-button";
import type { LearningLessonDetail } from "@/lib/learn";
import { lessonSpeech } from "@/lib/tts";
import { cn } from "@/lib/utils";

const LESSON_READER_KEY = "anvil-lesson-reader";

const toolBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground";

export function LessonOverlay({
  lesson,
  signedIn,
  onClose,
  onAskAiAuth,
}: {
  lesson: LearningLessonDetail;
  signedIn: boolean;
  onClose: () => void;
  onAskAiAuth?: () => void;
}) {
  const [reader, setReader] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(LESSON_READER_KEY) === "1";
  });
  const [expanded, setExpanded] = useState(true);
  const [headerVisible, setHeaderVisible] = useState(true);
  const expandedRef = useRef(true);
  const hideHeaderTimer = useRef<number | null>(null);

  function clearHideHeader() {
    if (hideHeaderTimer.current != null) {
      window.clearTimeout(hideHeaderTimer.current);
      hideHeaderTimer.current = null;
    }
  }

  function scheduleHideHeader() {
    if (!expandedRef.current) return;
    clearHideHeader();
    hideHeaderTimer.current = window.setTimeout(() => setHeaderVisible(false), 800);
  }

  function revealHeader() {
    if (!expandedRef.current) return;
    clearHideHeader();
    setHeaderVisible(true);
  }

  function toggleExpanded() {
    const next = !expandedRef.current;
    expandedRef.current = next;
    setExpanded(next);
    clearHideHeader();
    setHeaderVisible(true);
    if (next) {
      hideHeaderTimer.current = window.setTimeout(() => setHeaderVisible(false), 800);
    }
  }

  useEffect(() => {
    hideHeaderTimer.current = window.setTimeout(() => setHeaderVisible(false), 800);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearHideHeader();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const speech = lessonSpeech({
    title: lesson.title,
    short_description: lesson.short_description,
    content: lesson.content,
    takeaways: lesson.takeaways,
  });

  return (
    <div className={cn("fixed inset-0 z-[55] flex items-center justify-center", expanded ? "p-0" : "p-3 sm:p-6")}>
      <button type="button" className="absolute inset-0 bg-background/70" aria-label="Dismiss lesson overlay" onClick={onClose} />
      <article
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-overlay-title"
        className={cn(
          "relative flex w-full flex-col overflow-hidden border border-steel-800 bg-steel-900 shadow-2xl",
          expanded ? "h-dvh max-w-none rounded-none" : "h-[min(90vh,44rem)] max-w-3xl rounded-2xl",
        )}
      >
        <header className="border-b border-steel-800" onMouseEnter={revealHeader} onMouseLeave={scheduleHideHeader}>
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-500 ease-in-out",
              expanded && !headerVisible ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
            )}
          >
            <div className="overflow-hidden">
              <div className={cn("flex items-center justify-between gap-3", expanded ? "h-11 px-3 sm:px-4" : "px-5 py-4 sm:px-6")}>
                <div className="min-w-0 flex-1">
                  {expanded ? null : (
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {lesson.category_title} · {lesson.topic_title}
                    </p>
                  )}
                  <h2
                    id="lesson-overlay-title"
                    className={cn("truncate font-semibold tracking-tight", expanded ? "text-sm" : "mt-1.5 text-lg")}
                  >
                    {lesson.title}
                  </h2>
                </div>
                <button
                  type="button"
                  className={toolBtn}
                  aria-label="Close lesson"
                  title="Close"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div
            className={cn(
              "flex h-11 w-full items-center gap-1 px-2 sm:px-3",
              (!expanded || headerVisible) && "border-t border-steel-800",
            )}
          >
            <button
              type="button"
              aria-pressed={reader}
              aria-label={reader ? "Switch to compact view" : "Switch to reading view"}
              title={reader ? "Reading view" : "Compact view"}
              className={cn(toolBtn, reader && "bg-background text-foreground")}
              onClick={() => {
                setReader((value) => {
                  const next = !value;
                  window.localStorage.setItem(LESSON_READER_KEY, next ? "1" : "0");
                  return next;
                });
              }}
            >
              {reader ? <BookOpen className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            </button>
            <ListenButton iconOnly text={speech} />
            {signedIn ? (
              <AskAiButton iconOnly />
            ) : (
              <button type="button" className={toolBtn} aria-label="Ask AI" title="Ask AI" onClick={onAskAiAuth}>
                <Sparkles className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              aria-pressed={expanded}
              aria-label={expanded ? "Exit full width" : "Maximize lesson"}
              title={expanded ? "Minimize" : "Maximize"}
              className={cn(toolBtn, expanded && "bg-background text-foreground")}
              onClick={toggleExpanded}
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">
          {signedIn ? <AskAiPanel className="px-5 pt-4 sm:px-6" /> : null}
          <div
            className={
              reader
                ? "lesson-reader min-h-0 flex-1 overflow-y-auto"
                : "min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6"
            }
          >
            {reader ? (
              <div className="lesson-reader-page">
                <LessonMarkdown content={lesson.content} className="space-y-6 text-[15px] leading-8" />
              </div>
            ) : (
              <LessonMarkdown content={lesson.content} />
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
