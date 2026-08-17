"use client";

import { Square, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fetchSpeech } from "@/lib/tts";
import { cn } from "@/lib/utils";

export function ListenButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stop() {
    stoppedRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setState("idle");
  }

  async function toggle() {
    if (state !== "idle") {
      stop();
      return;
    }
    const cleaned = text.trim();
    if (!cleaned) {
      toast.error("Nothing to read on this page.");
      return;
    }
    const abort = new AbortController();
    abortRef.current = abort;
    stoppedRef.current = false;
    setState("loading");
    try {
      const blob = await fetchSpeech(cleaned, abort.signal);
      if (stoppedRef.current || abort.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        if (!stoppedRef.current) stop();
      };
      audio.onerror = () => {
        if (stoppedRef.current) return;
        toast.error("Unable to play the audio.");
        stop();
      };
      await audio.play();
      if (stoppedRef.current) return;
      setState("playing");
    } catch (error) {
      if (stoppedRef.current || abort.signal.aborted) return;
      toast.error(error instanceof Error ? error.message : "Unable to start the reader.");
      stop();
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={cn("shrink-0 text-muted-foreground hover:text-accent", className)}
      aria-label={state === "playing" ? "Stop reading" : state === "loading" ? "Loading audio" : "Listen"}
      aria-pressed={state !== "idle"}
      onClick={() => void toggle()}
    >
      {state === "idle" ? <Volume2 className="h-4 w-4" /> : <Square className="h-4 w-4" />}
      <span className="ml-1.5">{state === "idle" ? "Listen" : state === "loading" ? "Loading…" : "Stop"}</span>
    </Button>
  );
}
