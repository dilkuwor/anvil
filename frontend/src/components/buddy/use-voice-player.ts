"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchSpeech, speakableText } from "@/lib/tts";

const SILENCE =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";

type Item = { text: string; url?: Promise<string> };

/**
 * Plays queued pieces of text in order through the reader service, fetching the next piece
 * while the current one plays. `finish()` says no more pieces are coming; `onEnd` fires once
 * the last one has played.
 */
export function useVoicePlayer({
  onEnd,
  onError,
}: {
  onEnd: () => void;
  onError: (message: string) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<Item[]>([]);
  const indexRef = useRef(0);
  const finishedRef = useRef(false);
  const busyRef = useRef(false);
  const generationRef = useRef(0);
  const urlsRef = useRef<string[]>([]);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  const pumpRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    onEndRef.current = onEnd;
    onErrorRef.current = onError;
  }, [onEnd, onError]);

  const ensureAudio = useCallback(() => {
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audio.preload = "auto";
      audioRef.current = audio;
    }
    return audio;
  }, []);

  /** Call inside the tap that starts a turn so later clips may play without another tap. */
  const unlock = useCallback(() => {
    const audio = ensureAudio();
    if (!audio.src || audio.src === SILENCE) {
      audio.src = SILENCE;
      audio.play().catch(() => undefined);
    }
  }, [ensureAudio]);

  const reset = useCallback(() => {
    generationRef.current += 1;
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    }
    for (const url of urlsRef.current) URL.revokeObjectURL(url);
    urlsRef.current = [];
    queueRef.current = [];
    indexRef.current = 0;
    finishedRef.current = false;
    busyRef.current = false;
    setPlaying(false);
  }, []);

  const fetchItem = useCallback((item: Item, generation: number) => {
    if (!item.url) {
      item.url = fetchSpeech(speakableText(item.text)).then((blob) => {
        const url = URL.createObjectURL(blob);
        if (generation === generationRef.current) urlsRef.current.push(url);
        else URL.revokeObjectURL(url);
        return url;
      });
    }
    return item.url;
  }, []);

  const pump = useCallback(async () => {
    if (busyRef.current) return;
    const generation = generationRef.current;
    const item = queueRef.current[indexRef.current];
    if (!item) {
      if (finishedRef.current) {
        setPlaying(false);
        onEndRef.current();
      }
      return;
    }
    busyRef.current = true;
    setPlaying(true);
    const next = queueRef.current[indexRef.current + 1];
    if (next) void fetchItem(next, generation).catch(() => undefined);
    try {
      const url = await fetchItem(item, generation);
      if (generation !== generationRef.current) return;
      const audio = ensureAudio();
      audio.src = url;
      const advance = () => {
        if (generation !== generationRef.current) return;
        indexRef.current += 1;
        busyRef.current = false;
        void pumpRef.current();
      };
      audio.onended = advance;
      audio.onerror = advance;
      await audio.play();
    } catch (cause) {
      if (generation !== generationRef.current) return;
      busyRef.current = false;
      setPlaying(false);
      onErrorRef.current(
        cause instanceof Error && cause.message
          ? cause.message
          : "The reader is unavailable right now.",
      );
    }
  }, [ensureAudio, fetchItem]);

  useEffect(() => {
    pumpRef.current = pump;
  }, [pump]);

  const enqueue = useCallback(
    (text: string) => {
      if (!speakableText(text)) return;
      queueRef.current.push({ text });
      void pump();
    },
    [pump],
  );

  const finish = useCallback(() => {
    finishedRef.current = true;
    void pump();
  }, [pump]);

  const stop = useCallback(() => reset(), [reset]);

  const replay = useCallback(
    (pieces: string[]) => {
      reset();
      for (const piece of pieces)
        if (speakableText(piece)) queueRef.current.push({ text: piece });
      finishedRef.current = true;
      void pump();
    },
    [pump, reset],
  );

  useEffect(() => () => reset(), [reset]);

  return { playing, enqueue, finish, stop, replay, unlock };
}
