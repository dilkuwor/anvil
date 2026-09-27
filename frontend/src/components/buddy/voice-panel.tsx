"use client";

import { Loader2, Mic, RotateCcw, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useRecorder } from "@/components/buddy/use-recorder";
import { useVoicePlayer } from "@/components/buddy/use-voice-player";
import { TutorMarkdown } from "@/components/learn/markdown";
import { ApiError } from "@/lib/api";
import {
  BUDDY_UNAVAILABLE,
  sendBuddyVoice,
  speakableChunks,
  transcribeAudio,
  type BuddyContextKind,
  type BuddyMode,
  type BuddyPageContext,
} from "@/lib/buddy";
import { cn } from "@/lib/utils";

type Turn = { id: string; role: "user" | "assistant"; content: string };
type Phase =
  "idle" | "listening" | "transcribing" | "thinking" | "speaking" | "done";

const STATUS: Record<Phase, string> = {
  idle: "Tap the mic and ask",
  listening: "Listening… pause to send",
  transcribing: "Transcribing…",
  thinking: "Thinking…",
  speaking: "Speaking… tap to stop",
  done: "Tap the mic to ask more",
};

/**
 * Hands-free turn: tap the mic, speak, and the reply is read aloud as it arrives.
 * Nothing here is saved; the turns live only while the panel is open.
 */
export function VoicePanel({
  pageContext,
  contextKind,
  contextId,
  mode,
}: {
  pageContext: BuddyPageContext | null;
  contextKind: BuddyContextKind;
  contextId: string;
  mode: BuddyMode;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastPieces, setLastPieces] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const turnsRef = useRef<Turn[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  const onPlayerEnd = useCallback(() => setPhase("done"), []);
  const showError = useCallback((message: string) => {
    setError(message);
    setPhase((current) =>
      current === "listening" || current === "transcribing" ? "idle" : current,
    );
  }, []);
  const player = useVoicePlayer({ onEnd: onPlayerEnd, onError: showError });

  const ask = useCallback(
    async (content: string) => {
      const history = turnsRef.current.map(({ role, content: text }) => ({
        role,
        content: text,
      }));
      const userId = `u-${Date.now()}`;
      const replyId = `a-${Date.now()}`;
      setTurns((current) => [
        ...current,
        { id: userId, role: "user", content },
        { id: replyId, role: "assistant", content: "" },
      ]);
      setPhase("thinking");
      setError(null);
      const controller = new AbortController();
      abortRef.current = controller;
      let assembled = "";
      let spokenUpTo = 0;
      const pieces: string[] = [];
      const speak = (piece: string) => {
        pieces.push(piece);
        player.enqueue(piece);
        setPhase("speaking");
      };
      try {
        await sendBuddyVoice(
          {
            content,
            mode,
            history,
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
            setTurns((current) =>
              current.map((turn) =>
                turn.id === replyId ? { ...turn, content: assembled } : turn,
              ),
            );
            const found = speakableChunks(assembled, spokenUpTo);
            spokenUpTo = found.next;
            for (const piece of found.chunks) speak(piece);
          },
          controller.signal,
        );
        const tail = assembled.slice(spokenUpTo).trim();
        if (tail) speak(tail);
        setLastPieces(pieces);
        player.finish();
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof ApiError
            ? cause.message || BUDDY_UNAVAILABLE
            : BUDDY_UNAVAILABLE,
        );
        setTurns((current) =>
          current.filter((turn) => turn.id !== replyId || turn.content),
        );
        setPhase("idle");
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [contextId, contextKind, mode, pageContext, player],
  );

  const onRecording = useCallback(
    async (blob: Blob, filename: string) => {
      setPhase("transcribing");
      try {
        const text = await transcribeAudio(blob, filename);
        if (!text) {
          setError("No words were recognised. Try again.");
          setPhase("idle");
          return;
        }
        void ask(text);
      } catch (cause) {
        setError(
          cause instanceof ApiError
            ? cause.message
            : "Could not understand the recording.",
        );
        setPhase("idle");
      }
    },
    [ask],
  );
  const recorder = useRecorder({ onRecording, onError: showError });
  const recorderStart = recorder.start;
  const recorderStop = recorder.stop;
  const playerStop = player.stop;
  const playerUnlock = player.unlock;

  const press = useCallback(() => {
    if (phase === "listening") {
      recorderStop();
      return;
    }
    if (phase === "speaking") {
      playerStop();
      setPhase("done");
      return;
    }
    if (phase === "idle" || phase === "done") {
      playerUnlock();
      setError(null);
      setPhase("listening");
      void recorderStart();
    }
  }, [phase, playerStop, playerUnlock, recorderStart, recorderStop]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "m") {
        event.preventDefault();
        press();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: "end" });
  }, [turns, phase]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const replay = () => {
    if (!lastPieces.length) return;
    playerUnlock();
    setError(null);
    setPhase("speaking");
    player.replay(lastPieces);
  };

  const busy = phase === "transcribing" || phase === "thinking";
  const canReplay = phase === "done" && lastPieces.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {!turns.length ? (
          <div className="rounded-lg border border-dashed border-steel-700 px-3 py-4 text-[13px] leading-6 text-muted-foreground">
            <p>
              Tap the mic, ask your question, and pause when you are done. I
              will answer out loud.
            </p>
            <p className="mt-1">Voice conversations are not saved.</p>
          </div>
        ) : null}
        {turns.map((turn) =>
          turn.role === "user" ? (
            <div
              key={turn.id}
              className="ml-6 rounded-lg bg-steel-800/80 px-3 py-2"
            >
              <p className="text-[13px] leading-6 text-foreground">
                {turn.content}
              </p>
            </div>
          ) : (
            <div
              key={turn.id}
              className="rounded-lg border border-steel-800 px-3 py-2"
            >
              {turn.content ? (
                <TutorMarkdown content={turn.content} />
              ) : (
                <p className="text-[13px] text-muted-foreground">Thinking…</p>
              )}
            </div>
          ),
        )}
        {error ? (
          <div className="rounded-md border border-coral/30 bg-coral/5 px-3 py-2 text-[13px] text-coral">
            {error}
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-col items-center gap-2 border-t border-steel-800/80 px-4 py-4">
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center">
          <span />
          <button
            type="button"
            aria-label={
              phase === "listening"
                ? "Stop listening"
                : phase === "speaking"
                  ? "Stop speaking"
                  : busy
                    ? STATUS[phase]
                    : "Speak your question"
            }
            aria-pressed={phase === "listening"}
            disabled={busy || !recorder.supported}
            className={cn(
              "relative inline-flex h-16 w-16 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-60",
              phase === "listening"
                ? "border-accent bg-accent/15 text-accent"
                : phase === "speaking"
                  ? "border-steel-600 bg-steel-800 text-foreground"
                  : "border-accent/60 bg-accent text-white hover:brightness-105",
            )}
            onClick={press}
          >
            {phase === "listening" ? (
              <span
                aria-hidden
                className="absolute inset-0 rounded-full border-2 border-accent/60 transition-transform"
                style={{
                  transform: `scale(${1 + recorder.level * 0.35})`,
                  opacity: 0.35 + recorder.level * 0.65,
                }}
              />
            ) : null}
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            ) : phase === "listening" || phase === "speaking" ? (
              <Square className="h-5 w-5" aria-hidden />
            ) : (
              <Mic className="h-6 w-6" aria-hidden />
            )}
          </button>
          <div className="flex justify-start pl-4">
            {canReplay ? (
              <button
                type="button"
                aria-label="Replay the last answer"
                title="Replay"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-steel-700/80 bg-steel-800/60 text-muted-foreground hover:bg-steel-800 hover:text-foreground"
                onClick={replay}
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
        <p className="text-[12px] text-muted-foreground" aria-live="polite">
          {recorder.supported
            ? STATUS[phase]
            : "This browser cannot record audio."}
        </p>
      </div>
    </div>
  );
}
