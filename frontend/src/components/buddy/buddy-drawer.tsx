"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bot,
  History,
  Loader2,
  Mic,
  Plus,
  Send,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useBuddy } from "@/components/buddy/buddy-provider";
import { VoicePanel } from "@/components/buddy/voice-panel";
import { useRecorder } from "@/components/buddy/use-recorder";
import { useSpeaker } from "@/components/buddy/use-speaker";
import { TutorMarkdown } from "@/components/learn/markdown";
import { SaveAiNoteButton } from "@/components/notes/notes-drawer";
import { ApiError, api } from "@/lib/api";
import {
  BUDDY_UNAVAILABLE,
  CONTEXT_LABELS,
  buddyKeys,
  sendBuddyMessage,
  transcribeAudio,
  useBuddyThread,
  useBuddyThreads,
  type BuddyContextKind,
  type BuddyMessage,
  type BuddyMode,
  type BuddyPageContext,
  type BuddyThread,
} from "@/lib/buddy";
import type { NoteSourceType } from "@/lib/notes";
import { cn } from "@/lib/utils";

const READ_ALOUD_KEY = "anvil.buddy.readAloud";
const NOTE_SOURCE: Record<
  Exclude<BuddyContextKind, "general">,
  NoteSourceType
> = {
  lesson: "LESSON",
  problem: "PROBLEM",
  design: "SYSTEM_DESIGN",
};

type LocalMessage = Pick<BuddyMessage, "id" | "role" | "content">;
type Selection = { key: string; threadId: string | null };
type Conversation = { key: string; messages: LocalMessage[] };

function readAloudPreference(): boolean {
  try {
    return localStorage.getItem(READ_ALOUD_KEY) === "1";
  } catch {
    return false;
  }
}

export function BuddyButton({ className }: { className?: string }) {
  const buddy = useBuddy();
  if (!buddy) return null;
  return (
    <button
      type="button"
      aria-pressed={buddy.open}
      aria-label="Buddy"
      title="Buddy · ask anything"
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-steel-800 hover:text-foreground",
        buddy.open && "bg-steel-800 text-foreground",
        className,
      )}
      onClick={buddy.toggle}
    >
      <Bot className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">Buddy</span>
    </button>
  );
}

export function BuddyDrawer() {
  const buddy = useBuddy();
  if (!buddy?.open) return null;
  return (
    <Drawer
      pageContext={buddy.pageContext}
      onClose={() => buddy.setOpen(false)}
    />
  );
}

function Drawer({
  pageContext,
  onClose,
}: {
  pageContext: BuddyPageContext | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const contextKind: BuddyContextKind = pageContext?.kind ?? "general";
  const contextId = pageContext?.id ?? "";
  const contextKey = `${contextKind}:${contextId}`;

  const [view, setView] = useState<"chat" | "voice" | "history">("chat");
  // Bumped by "New conversation" while in voice view; the voice panel keeps nothing across it.
  const [voiceKey, setVoiceKey] = useState(0);
  const [mode, setMode] = useState<BuddyMode>("ask");
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readAloud, setReadAloudState] = useState(() =>
    typeof window === "undefined" ? false : readAloudPreference(),
  );
  // What the learner picked (new chat, a history item, a thread created by sending). Only valid for its page.
  const [selection, setSelection] = useState<Selection | null>(null);
  // Messages shown while a reply streams in; valid only for the thread key it was written for.
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const latest = useBuddyThreads(contextKind, contextId);
  const threadId =
    selection && selection.key === contextKey
      ? selection.threadId
      : (latest.data?.[0]?.id ?? null);
  const activeKey = threadId ? `thread:${threadId}` : `new:${contextKey}`;
  const detail = useBuddyThread(threadId);
  const detailMessages = detail.data?.messages;
  const messages: LocalMessage[] = useMemo(
    () =>
      conversation && conversation.key === activeKey
        ? conversation.messages
        : (detailMessages ?? []),
    [activeKey, conversation, detailMessages],
  );
  const loading =
    latest.isLoading ||
    (Boolean(threadId) &&
      detail.isLoading &&
      !(conversation?.key === activeKey));

  const showError = useCallback((message: string) => setError(message), []);
  const speaker = useSpeaker(showError);
  const speakerStop = speaker.stop;

  const setReadAloud = (value: boolean) => {
    setReadAloudState(value);
    try {
      localStorage.setItem(READ_ALOUD_KEY, value ? "1" : "0");
    } catch {
      // Preference is a convenience only.
    }
    if (!value) speakerStop();
  };

  const send = useCallback(
    async (raw: string) => {
      const content = raw.trim();
      if (!content || pending || loading) return;
      const controller = new AbortController();
      abortRef.current = controller;
      const startingThread = threadId;
      const key = activeKey;
      const base = messages;
      const assistantKey = `pending-${Date.now()}`;
      setDraft("");
      setError(null);
      setPending(true);
      speakerStop();
      if (readAloud) speaker.unlock();
      setConversation({
        key,
        messages: [
          ...base,
          { id: `user-${Date.now()}`, role: "user", content },
          { id: assistantKey, role: "assistant", content: "" },
        ],
      });
      let assembled = "";
      try {
        const result = await sendBuddyMessage(
          {
            thread_id: startingThread,
            content,
            mode,
            context: {
              kind: contextKind,
              id: contextId,
              title: pageContext?.title ?? "",
              code:
                contextKind === "problem"
                  ? pageContext?.getCode?.()
                  : undefined,
            },
          },
          (delta) => {
            assembled += delta;
            setConversation((current) => {
              if (!current) return current;
              const copy = [...current.messages];
              copy[copy.length - 1] = {
                id: assistantKey,
                role: "assistant",
                content: assembled,
              };
              return { ...current, messages: copy };
            });
          },
          controller.signal,
        );
        const finalId = result.messageId ?? assistantKey;
        const nextKey = result.threadId ? `thread:${result.threadId}` : key;
        setConversation((current) =>
          current
            ? {
                key: nextKey,
                messages: current.messages.map((item) =>
                  item.id === assistantKey ? { ...item, id: finalId } : item,
                ),
              }
            : current,
        );
        if (result.threadId && result.threadId !== startingThread) {
          setSelection({ key: contextKey, threadId: result.threadId });
        }
        if (result.partial)
          setError("The reply was cut short. Ask again to continue.");
        void queryClient.invalidateQueries({ queryKey: ["buddy", "threads"] });
        if (result.threadId)
          void queryClient.invalidateQueries({
            queryKey: buddyKeys.thread(result.threadId),
          });
        if (readAloud && result.text.trim())
          void speaker.speak(finalId, result.text);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof ApiError
            ? cause.message || BUDDY_UNAVAILABLE
            : BUDDY_UNAVAILABLE,
        );
        setConversation((current) =>
          current
            ? {
                ...current,
                messages: current.messages.filter(
                  (item) => item.id !== assistantKey,
                ),
              }
            : current,
        );
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setPending(false);
      }
    },
    [
      activeKey,
      contextId,
      contextKey,
      contextKind,
      loading,
      messages,
      mode,
      pageContext,
      pending,
      queryClient,
      readAloud,
      speaker,
      speakerStop,
      threadId,
    ],
  );

  const onRecording = useCallback(async (blob: Blob, filename: string) => {
    try {
      const text = await transcribeAudio(blob, filename);
      if (!text) {
        setError("No words were recognised. Try again.");
        return;
      }
      setDraft((current) =>
        current.trim() ? `${current.trim()} ${text}` : text,
      );
      inputRef.current?.focus();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Could not understand the recording.",
      );
    }
  }, []);
  const recorder = useRecorder({ onRecording, onError: showError });
  const recorderStatus = recorder.status;
  const recorderStart = recorder.start;
  const recorderStop = recorder.stop;

  const toggleMic = useCallback(() => {
    if (recorderStatus === "recording") recorderStop();
    else if (recorderStatus === "idle") void recorderStart();
  }, [recorderStart, recorderStatus, recorderStop]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "m" &&
        recorder.supported &&
        view === "chat"
      ) {
        event.preventDefault();
        toggleMic();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, recorder.supported, toggleMic, view]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, pending, view]);

  const deleteThread = async (thread: BuddyThread) => {
    try {
      await api.delete(`/api/v1/buddy/threads/${thread.id}`);
      if (thread.id === threadId) {
        setSelection({ key: contextKey, threadId: null });
        setConversation(null);
      }
      void queryClient.invalidateQueries({ queryKey: ["buddy", "threads"] });
    } catch {
      setError("Could not delete that conversation.");
    }
  };

  const noteContext = useMemo(() => {
    if (!pageContext?.noteSourceId) return null;
    return {
      sourceType: NOTE_SOURCE[pageContext.kind],
      sourceId: pageContext.noteSourceId,
      sourceTitle: pageContext.title,
    };
  }, [pageContext]);

  const placeholder =
    mode === "teach"
      ? "Explain the idea in your own words. Buddy will point out the gaps."
      : pageContext
        ? `Ask about ${pageContext.title || CONTEXT_LABELS[pageContext.kind].toLowerCase()}…`
        : "Ask anything about interview prep…";

  return (
    <div className="fixed inset-0 z-[55]">
      <button
        type="button"
        className="absolute inset-0 bg-background/60 backdrop-blur-xs"
        aria-label="Close Buddy"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="buddy-drawer-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-steel-800/80 bg-steel-900 shadow-2xl md:w-[27rem]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-steel-800/80 bg-steel-950/40 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
              <Bot className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2
                id="buddy-drawer-title"
                className="text-sm font-bold tracking-tight text-foreground"
              >
                Buddy
              </h2>
              <p className="truncate text-[11.5px] text-muted-foreground">
                <span className="font-medium text-foreground/80">
                  {CONTEXT_LABELS[contextKind]}
                </span>
                {pageContext?.title ? ` · ${pageContext.title}` : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {view === "chat" ? (
              <>
                <button
                  type="button"
                  role="switch"
                  aria-checked={readAloud}
                  aria-label="Read replies aloud"
                  title="Read replies aloud"
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-steel-800 hover:text-foreground",
                    readAloud && "text-accent",
                  )}
                  onClick={() => setReadAloud(!readAloud)}
                >
                  {readAloud ? (
                    <Volume2 className="h-4 w-4" aria-hidden />
                  ) : (
                    <VolumeX className="h-4 w-4" aria-hidden />
                  )}
                </button>
                <IconButton
                  label="New conversation"
                  onClick={() => {
                    setSelection({ key: contextKey, threadId: null });
                    setConversation(null);
                    setError(null);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </IconButton>
                <IconButton label="History" onClick={() => setView("history")}>
                  <History className="h-4 w-4" />
                </IconButton>
              </>
            ) : view === "voice" ? (
              <IconButton
                label="New conversation"
                onClick={() => setVoiceKey((value) => value + 1)}
              >
                <Plus className="h-4 w-4" />
              </IconButton>
            ) : (
              <IconButton label="Back to chat" onClick={() => setView("chat")}>
                <ArrowLeft className="h-4 w-4" />
              </IconButton>
            )}
            <IconButton label="Close Buddy" onClick={onClose}>
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        </header>

        {view === "history" ? (
          <HistoryList
            currentId={threadId}
            onPick={(thread) => {
              setSelection({ key: contextKey, threadId: thread.id });
              setConversation(null);
              setView("chat");
            }}
            onDelete={deleteThread}
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-steel-800/80 px-4 py-2">
              <div
                className="inline-flex rounded-md border border-steel-800 bg-steel-950/40 p-0.5"
                role="tablist"
                aria-label="Panel"
              >
                <ModeTab
                  active={view === "chat"}
                  onClick={() => setView("chat")}
                >
                  Chat
                </ModeTab>
                <ModeTab
                  active={view === "voice"}
                  onClick={() => setView("voice")}
                >
                  Voice
                </ModeTab>
              </div>
              <div
                className="inline-flex rounded-md border border-steel-800 bg-steel-950/40 p-0.5"
                role="tablist"
                aria-label="Mode"
              >
                <ModeTab active={mode === "ask"} onClick={() => setMode("ask")}>
                  Ask
                </ModeTab>
                <ModeTab
                  active={mode === "teach"}
                  onClick={() => setMode("teach")}
                >
                  Explain it back
                </ModeTab>
              </div>
            </div>

            {view === "voice" ? (
              <VoicePanel
                key={voiceKey}
                pageContext={pageContext}
                contextKind={contextKind}
                contextId={contextId}
                mode={mode}
              />
            ) : (
              <>
                <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
                  {loading ? (
                    <p className="text-[13px] text-muted-foreground">
                      Loading…
                    </p>
                  ) : !messages.length ? (
                    <EmptyState mode={mode} hasContext={Boolean(pageContext)} />
                  ) : null}
                  {messages.map((message, index) => {
                    const last = index === messages.length - 1;
                    const thinking =
                      pending &&
                      last &&
                      message.role === "assistant" &&
                      !message.content;
                    if (message.role === "user") {
                      return (
                        <div
                          key={message.id}
                          className="ml-6 rounded-lg bg-steel-800/80 px-3 py-2"
                        >
                          <p className="text-[13px] leading-6 text-foreground whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={message.id}
                        className="rounded-lg border border-steel-800 px-3 py-2"
                      >
                        {thinking ? (
                          <p className="text-[13px] text-muted-foreground">
                            Thinking…
                          </p>
                        ) : (
                          <>
                            <TutorMarkdown content={message.content} />
                            {!(pending && last) && message.content.trim() ? (
                              <div className="mt-1.5 flex items-center gap-1">
                                <button
                                  type="button"
                                  className={cn(
                                    "inline-flex h-6 items-center gap-1 rounded px-1.5 text-[11px] text-muted-foreground hover:bg-steel-800 hover:text-foreground",
                                    speaker.speakingId === message.id &&
                                      "text-accent",
                                  )}
                                  aria-label={
                                    speaker.speakingId === message.id
                                      ? "Stop reading"
                                      : "Read this reply aloud"
                                  }
                                  onClick={() =>
                                    speaker.speakingId === message.id
                                      ? speaker.stop()
                                      : void speaker.speak(
                                          message.id,
                                          message.content,
                                        )
                                  }
                                >
                                  {speaker.loadingId === message.id ? (
                                    <Loader2
                                      className="h-3.5 w-3.5 animate-spin"
                                      aria-hidden
                                    />
                                  ) : speaker.speakingId === message.id ? (
                                    <Square className="h-3 w-3" aria-hidden />
                                  ) : (
                                    <Volume2
                                      className="h-3.5 w-3.5"
                                      aria-hidden
                                    />
                                  )}
                                  {speaker.speakingId === message.id
                                    ? "Stop"
                                    : "Listen"}
                                </button>
                                {noteContext ? (
                                  <SaveAiNoteButton
                                    context={noteContext}
                                    body={message.content}
                                  />
                                ) : null}
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    );
                  })}
                  {error ? (
                    <div className="rounded-md border border-coral/30 bg-coral/5 px-3 py-2 text-[13px] text-coral">
                      {error}
                    </div>
                  ) : null}
                  <div ref={bottomRef} />
                </div>

                <form
                  className="border-t border-steel-800/80 px-3 py-2.5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void send(draft);
                  }}
                >
                  <div className="flex items-end gap-1.5">
                    {recorder.supported ? (
                      <MicButton
                        status={recorder.status}
                        level={recorder.level}
                        disabled={pending}
                        onClick={toggleMic}
                      />
                    ) : null}
                    <textarea
                      ref={inputRef}
                      value={draft}
                      rows={1}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void send(draft);
                        }
                      }}
                      placeholder={
                        recorder.status === "recording"
                          ? "Listening… tap the mic or pause to stop."
                          : recorder.status === "processing"
                            ? "Transcribing…"
                            : placeholder
                      }
                      disabled={pending || loading}
                      className="max-h-40 min-h-9 w-full flex-1 resize-none rounded-md border border-input-border bg-background px-3 py-2 text-sm leading-5 text-input-foreground outline-none placeholder:text-input-placeholder disabled:opacity-60"
                      style={{
                        height: `${Math.min(160, 20 * Math.max(1, draft.split("\n").length) + 16)}px`,
                      }}
                    />
                    <button
                      type="submit"
                      aria-label="Send"
                      disabled={pending || loading || !draft.trim()}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-white hover:brightness-105 disabled:opacity-50"
                    >
                      {pending ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Send className="h-4 w-4" aria-hidden />
                      )}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Enter to send · Shift+Enter for a new line
                    {recorder.supported ? " · ⌘M mic" : ""}
                  </p>
                </form>
              </>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

function HistoryList({
  currentId,
  onPick,
  onDelete,
}: {
  currentId: string | null;
  onPick: (thread: BuddyThread) => void;
  onDelete: (thread: BuddyThread) => void;
}) {
  const threads = useBuddyThreads();
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      {threads.isLoading ? (
        <p className="px-1 text-[13px] text-muted-foreground">Loading…</p>
      ) : null}
      {threads.data && !threads.data.length ? (
        <p className="rounded-lg border border-dashed border-steel-700 px-3 py-6 text-center text-[13px] text-muted-foreground">
          No conversations yet.
        </p>
      ) : null}
      <ul className="space-y-1">
        {(threads.data ?? []).map((thread) => (
          <li key={thread.id} className="group flex items-start gap-1">
            <button
              type="button"
              className={cn(
                "min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left hover:bg-steel-800/60",
                thread.id === currentId && "bg-steel-800/60",
              )}
              onClick={() => onPick(thread)}
            >
              <p className="truncate text-[13px] font-semibold text-foreground">
                {thread.title || "Conversation"}
              </p>
              <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                {CONTEXT_LABELS[thread.context_kind]}
                {thread.context_title
                  ? ` · ${thread.context_title}`
                  : ""} · {thread.message_count} messages
              </p>
              {thread.preview ? (
                <p className="mt-0.5 truncate text-[12px] text-muted-foreground/80">
                  {thread.preview}
                </p>
              ) : null}
            </button>
            <IconButton
              label="Delete conversation"
              className="mt-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
              onClick={() => onDelete(thread)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({
  mode,
  hasContext,
}: {
  mode: BuddyMode;
  hasContext: boolean;
}) {
  return (
    <div className="rounded-lg border border-dashed border-steel-700 px-3 py-4 text-[13px] leading-6 text-muted-foreground">
      {mode === "teach" ? (
        <p>
          Teach it to me. Say what you remember, in your own words, and I will
          tell you what was right and what is missing.
        </p>
      ) : hasContext ? (
        <p>
          I can see this page. Ask me to explain a part, compare two ideas, or
          give an example.
        </p>
      ) : (
        <p>
          Ask me anything about your interview prep. Open a lesson or problem
          and I will know what you are looking at.
        </p>
      )}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        "h-6 rounded px-2 text-[11.5px] font-medium transition-colors",
        active
          ? "bg-steel-800 text-foreground shadow-2xs"
          : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MicButton({
  status,
  level,
  disabled,
  onClick,
}: {
  status: "idle" | "recording" | "processing";
  level: number;
  disabled: boolean;
  onClick: () => void;
}) {
  const recording = status === "recording";
  return (
    <button
      type="button"
      aria-label={
        recording
          ? "Stop recording"
          : status === "processing"
            ? "Transcribing"
            : "Speak your question"
      }
      aria-pressed={recording}
      disabled={disabled || status === "processing"}
      className={cn(
        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-50",
        recording
          ? "border-accent/50 bg-accent/10 text-accent"
          : "border-steel-700/80 bg-steel-800/60 text-muted-foreground hover:bg-steel-800 hover:text-foreground",
      )}
      onClick={onClick}
    >
      {recording ? (
        <span
          aria-hidden
          className="absolute inset-0 rounded-md border border-accent/60 transition-transform"
          style={{
            transform: `scale(${1 + level * 0.25})`,
            opacity: 0.4 + level * 0.6,
          }}
        />
      ) : null}
      {status === "processing" ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : recording ? (
        <Square className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Mic className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-steel-800 hover:text-foreground",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
