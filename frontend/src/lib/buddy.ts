import { useQuery } from "@tanstack/react-query";

import { ApiError, api, streamSsePost, type SseEvent } from "@/lib/api";

export type BuddyContextKind = "general" | "lesson" | "problem" | "design";
export type BuddyMode = "ask" | "teach";

export type BuddyMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode: string;
  created_at: string;
};

export type BuddyThread = {
  id: string;
  context_kind: BuddyContextKind;
  context_id: string;
  context_title: string;
  title: string;
  preview: string;
  message_count: number;
  created_at: string;
  updated_at: string;
};

export type BuddyThreadDetail = BuddyThread & { messages: BuddyMessage[] };

/** What the current page tells Buddy about itself. */
export type BuddyPageContext = {
  kind: Exclude<BuddyContextKind, "general">;
  id: string;
  title: string;
  /** Source id for "Save as note"; notes key lessons and problems by database id, not slug. */
  noteSourceId?: string;
  /** Live editor contents for coding problems, read at send time. */
  getCode?: () => string;
};

export const CONTEXT_LABELS: Record<BuddyContextKind, string> = {
  general: "General",
  lesson: "Lesson",
  problem: "Problem",
  design: "System design",
};

export const buddyKeys = {
  threads: (kind?: string, id?: string) =>
    ["buddy", "threads", kind ?? "all", id ?? "all"] as const,
  thread: (threadId: string) => ["buddy", "thread", threadId] as const,
};

export function useBuddyThreads(
  kind?: BuddyContextKind,
  id?: string,
  enabled = true,
) {
  const params = new URLSearchParams();
  if (kind) params.set("context_kind", kind);
  if (id !== undefined) params.set("context_id", id);
  const query = params.toString();
  return useQuery({
    queryKey: buddyKeys.threads(kind, id),
    queryFn: () =>
      api.get<BuddyThread[]>(
        `/api/v1/buddy/threads${query ? `?${query}` : ""}`,
      ),
    enabled,
  });
}

export function useBuddyThread(threadId: string | null) {
  return useQuery({
    queryKey: buddyKeys.thread(threadId ?? "none"),
    queryFn: () =>
      api.get<BuddyThreadDetail>(`/api/v1/buddy/threads/${threadId}`),
    enabled: Boolean(threadId),
  });
}

export type BuddySendBody = {
  thread_id: string | null;
  content: string;
  mode: BuddyMode;
  context: { kind: BuddyContextKind; id: string; title: string; code?: string };
};

export type BuddySendResult = {
  text: string;
  threadId: string | null;
  messageId: string | null;
  partial: boolean;
};

export const BUDDY_UNAVAILABLE =
  "Buddy is temporarily unavailable. Please try again.";

export async function sendBuddyMessage(
  body: BuddySendBody,
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
): Promise<BuddySendResult> {
  let threadId: string | null = body.thread_id;
  let messageId: string | null = null;
  let partial = false;
  const text = await streamSsePost(
    "/api/v1/buddy/messages",
    body,
    onDelta,
    signal,
    (event: SseEvent) => {
      if (typeof event.thread_id === "string") threadId = event.thread_id;
      if (typeof event.message_id === "string") messageId = event.message_id;
      if (event.done && event.partial === true) partial = true;
    },
  );
  if (!text.trim())
    throw new ApiError(503, BUDDY_UNAVAILABLE, "service_unavailable");
  return { text, threadId, messageId, partial };
}

export async function transcribeAudio(
  blob: Blob,
  filename: string,
  signal?: AbortSignal,
): Promise<string> {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
  const form = new FormData();
  form.append("file", blob, filename);
  const response = await fetch(`${API_BASE}/api/v1/stt/transcribe`, {
    method: "POST",
    credentials: "include",
    body: form,
    signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.error?.message ?? "Could not understand the recording.",
      data?.error?.code ?? "error",
    );
  }
  return String(data?.text ?? "").trim();
}

export type BuddyVoiceBody = {
  content: string;
  mode: BuddyMode;
  context: { kind: BuddyContextKind; id: string; title: string; code?: string };
  history: { role: "user" | "assistant"; content: string }[];
};

/** A spoken turn: streamed like chat, written for the ear, never saved. */
export async function sendBuddyVoice(
  body: BuddyVoiceBody,
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const text = await streamSsePost(
    "/api/v1/buddy/voice",
    body,
    onDelta,
    signal,
  );
  if (!text.trim())
    throw new ApiError(503, BUDDY_UNAVAILABLE, "service_unavailable");
  return text;
}

const SENTENCE_END = /[.!?]["')\]]?(?=\s)|\n+/g;

/**
 * Cut streamed text into speakable pieces at sentence ends, so reading can start before the
 * reply is complete. Returns the pieces found after `from` and where the next scan should start.
 */
export function speakableChunks(
  text: string,
  from: number,
  minLength = 40,
): { chunks: string[]; next: number } {
  const chunks: string[] = [];
  let start = from;
  SENTENCE_END.lastIndex = from;
  let match: RegExpExecArray | null;
  while ((match = SENTENCE_END.exec(text)) !== null) {
    const end = match.index + match[0].length;
    const piece = text.slice(start, end).trim();
    if (piece.length >= minLength || match[0].includes("\n")) {
      if (piece) chunks.push(piece);
      start = end;
    }
  }
  return { chunks, next: start };
}
