import type { CheatSheetDetail } from "@/lib/cheatsheets";
import { asStringList, asTable } from "@/lib/cheatsheets";
import { lessonScript, type SpeechLesson } from "@/lib/lesson-speech";

export function speakableText(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_>#-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The whole lesson as one spoken script. The lesson page reads section by section instead. */
export function lessonSpeech(input: SpeechLesson): string {
  return lessonScript(input);
}

export function cheatSheetSpeech(sheet: CheatSheetDetail): string {
  const parts = [sheet.title, sheet.description];
  for (const section of sheet.sections) {
    parts.push(section.title);
    for (const block of section.blocks) {
      if (block.title) parts.push(block.title);
      if (block.body) parts.push(block.body);
      for (const item of asStringList(block.items)) parts.push(item);
      const table = asTable(block.items);
      if (table) {
        // Read the header row first so the values that follow have context.
        if (table.headers.length) parts.push(table.headers.join(", "));
        for (const row of table.rows) parts.push(row.join(", "));
      }
    }
  }
  return speakableText(parts.filter(Boolean).join(". "));
}

export async function fetchSpeech(text: string, signal?: AbortSignal): Promise<Blob> {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
  const response = await fetch(`${API_BASE}/api/v1/tts/speech`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error?.message ?? "Unable to start the reader.");
  }
  return response.blob();
}
