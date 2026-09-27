"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus = "idle" | "recording" | "processing";

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];
const SILENCE_AFTER_SPEECH_MS = 2000;
const NO_SPEECH_TIMEOUT_MS = 8000;
const MAX_DURATION_MS = 60_000;
const SPEECH_LEVEL = 0.02;
const SILENCE_LEVEL = 0.012;

export function recorderSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported)
    return "";
  return (
    MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? ""
  );
}

export function filenameFor(mimeType: string): string {
  if (mimeType.includes("mp4")) return "speech.m4a";
  if (mimeType.includes("ogg")) return "speech.ogg";
  return "speech.webm";
}

/**
 * Tap to record, tap to stop. Recording also stops on its own after two seconds of silence
 * once the learner has spoken, and after a minute regardless.
 */
export function useRecorder({
  onRecording,
  onError,
}: {
  onRecording: (blob: Blob, filename: string) => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [level, setLevel] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const chunksRef = useRef<Blob[]>([]);
  const heardRef = useRef(false);
  const silenceSinceRef = useRef<number | null>(null);
  const discardRef = useRef(false);

  const cleanup = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    for (const timer of timersRef.current) window.clearTimeout(timer);
    timersRef.current = [];
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    recorderRef.current = null;
    setLevel(0);
  }, []);

  const stop = useCallback((discard = false) => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    discardRef.current = discard;
    recorder.stop();
  }, []);

  const start = useCallback(async () => {
    if (recorderRef.current) return;
    if (!recorderSupported()) {
      onError("This browser cannot record audio.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError(
        "Microphone access was blocked. Allow it in the browser and try again.",
      );
      return;
    }
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    recorderRef.current = recorder;
    streamRef.current = stream;
    chunksRef.current = [];
    heardRef.current = false;
    silenceSinceRef.current = null;
    discardRef.current = false;

    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      const discard =
        discardRef.current || !heardRef.current || blob.size === 0;
      cleanup();
      if (discard) {
        setStatus("idle");
        if (!discardRef.current && !heardRef.current)
          onError("No speech was heard.");
        return;
      }
      setStatus("processing");
      Promise.resolve(onRecording(blob, filenameFor(type)))
        .catch(() => undefined)
        .finally(() => setStatus("idle"));
    };

    // Level meter and silence detection.
    try {
      const AudioContextCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioContextCtor) {
        const context = new AudioContextCtor();
        audioContextRef.current = context;
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(samples);
          let sum = 0;
          for (const sample of samples) {
            const centered = (sample - 128) / 128;
            sum += centered * centered;
          }
          const rms = Math.sqrt(sum / samples.length);
          setLevel(Math.min(1, rms * 6));
          const now = performance.now();
          if (rms >= SPEECH_LEVEL) {
            heardRef.current = true;
            silenceSinceRef.current = null;
          } else if (heardRef.current && rms < SILENCE_LEVEL) {
            silenceSinceRef.current ??= now;
            if (now - silenceSinceRef.current >= SILENCE_AFTER_SPEECH_MS) {
              stop();
              return;
            }
          }
          frameRef.current = requestAnimationFrame(tick);
        };
        frameRef.current = requestAnimationFrame(tick);
      }
    } catch {
      // Without an analyser the learner simply taps to stop.
    }

    timersRef.current.push(
      window.setTimeout(() => {
        if (!heardRef.current) stop();
      }, NO_SPEECH_TIMEOUT_MS),
      window.setTimeout(() => stop(), MAX_DURATION_MS),
    );
    recorder.start(250);
    setStatus("recording");
  }, [cleanup, onError, onRecording, stop]);

  useEffect(
    () => () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        discardRef.current = true;
        recorder.stop();
      }
      cleanup();
    },
    [cleanup],
  );

  return { status, level, start, stop, supported: recorderSupported() };
}
