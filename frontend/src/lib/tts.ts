import { api } from "@/lib/api";
import type { CheatSheetDetail } from "@/lib/cheatsheets";
import { asStringList, asTable } from "@/lib/cheatsheets";

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

export function lessonSpeech(input: {
  title: string;
  short_description?: string;
  content: string;
  takeaways?: string[];
}): string {
  const parts = [input.title, input.short_description ?? "", speakableText(input.content)];
  if (input.takeaways?.length) {
    parts.push("Key takeaways.", ...input.takeaways);
  }
  return speakableText(parts.filter(Boolean).join(". "));
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
