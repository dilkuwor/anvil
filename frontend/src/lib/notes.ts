export type NoteSourceType = "LESSON" | "PROBLEM" | "SYSTEM_DESIGN";
export type NoteKind = "MANUAL" | "AI_RESPONSE";

export type Note = {
  id: string;
  source_type: NoteSourceType;
  source_id: string;
  source_title: string;
  source_href: string;
  kind: NoteKind;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type NoteContext = {
  sourceType: NoteSourceType;
  sourceId: string;
  sourceTitle: string;
};

export type NoteCreate = {
  source_type: NoteSourceType;
  source_id: string;
  kind?: NoteKind;
  title?: string;
  body: string;
};

export function sourceLabel(type: NoteSourceType): string {
  if (type === "LESSON") return "Lesson";
  if (type === "PROBLEM") return "Problem";
  return "System Design";
}

export function displayNoteTitle(note: Note): string {
  if (note.kind === "AI_RESPONSE") {
    return note.source_title ? `Ask AI · ${note.source_title}` : "Saved from Ask AI";
  }
  const title = note.title.trim();
  if (!title) return note.source_title || "Note";
  const compactTitle = title.replace(/\s+/g, " ");
  const compactBody = note.body.trim().replace(/\s+/g, " ");
  if (compactBody.startsWith(compactTitle) && compactTitle.length >= 40) {
    return note.source_title || "Note";
  }
  return title;
}
