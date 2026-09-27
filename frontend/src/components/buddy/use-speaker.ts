"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { speakableText } from "@/lib/tts";

// One second of silence; playing it inside a tap unlocks later playback on mobile browsers.
const SILENCE =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";

/** Reads one Buddy reply at a time through the same reader service the lessons use. */
export function useSpeaker(onError: (message: string) => void) {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);

  const ensureAudio = useCallback(() => {
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audio.preload = "auto";
      audioRef.current = audio;
    }
    return audio;
  }, []);

  /** Call inside a click so a reply that arrives later may play without another tap. */
  const unlock = useCallback(() => {
    const audio = ensureAudio();
    if (!audio.src || audio.src === SILENCE) {
      audio.src = SILENCE;
      audio.play().catch(() => undefined);
    }
  }, [ensureAudio]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setSpeakingId(null);
    setLoadingId(null);
  }, []);

  const speak = useCallback(
    async (id: string, text: string) => {
      stop();
      const spoken = speakableText(text);
      if (!spoken) return;
      const controller = new AbortController();
      abortRef.current = controller;
      setLoadingId(id);
      try {
        const { fetchSpeech } = await import("@/lib/tts");
        const blob = await fetchSpeech(spoken, controller.signal);
        if (controller.signal.aborted) return;
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const audio = ensureAudio();
        audio.src = url;
        audio.onended = () => stop();
        audio.onerror = () => {
          stop();
          onError("Could not play the reply.");
        };
        await audio.play();
        setLoadingId(null);
        setSpeakingId(id);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setLoadingId(null);
        onError(
          cause instanceof Error && cause.message
            ? cause.message
            : "The reader is unavailable right now.",
        );
      }
    },
    [ensureAudio, onError, stop],
  );

  useEffect(() => () => stop(), [stop]);

  return { speakingId, loadingId, speak, stop, unlock };
}
