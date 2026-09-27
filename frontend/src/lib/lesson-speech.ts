/**
 * Turns lesson markdown into a spoken script, one section per heading.
 *
 * Each block type gets its own reading rule so the audio matches what is on screen:
 * tables are read row by row with their column names, arrow flows become "A, then B",
 * code blocks are announced but not read, and symbols such as O(n^2) or `target - x`
 * are spelled out the way a person would say them.
 */

import {
  headingSlug,
  isArrowFlow,
  isCodeBlock,
  isExampleBlock,
  isFormulaBlock,
  isListBlock,
  isOrderedListBlock,
  isQuoteBlock,
  isTableBlock,
  isVizBlock,
  parseCodeBlock,
  splitLessonBlocks,
  splitTableRow,
} from "@/components/learn/lesson-blocks";

export type SpeechSection = {
  /** Heading id on the page (matches the h2 `id`), "intro" or "takeaways". */
  id: string;
  title: string;
  text: string;
  /** 1-based part number when a long section was split into several clips. */
  part?: number;
};

export type SpeechLesson = {
  title: string;
  short_description?: string;
  content: string;
  takeaways?: string[];
};

/** Keep each clip short so playback starts fast and the server never truncates. */
export const MAX_SECTION_CHARS = 3200;

const ORDINALS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"];

export function buildLessonSpeech(lesson: SpeechLesson): SpeechSection[] {
  const sections: SpeechSection[] = [];
  let current: { id: string; title: string; parts: string[] } = {
    id: "intro",
    title: lesson.title,
    parts: [sentence(speakInline(lesson.title))],
  };
  if (lesson.short_description?.trim()) current.parts.push(sentence(speakInline(lesson.short_description)));

  function flush() {
    const text = current.parts.filter(Boolean).join(" ").trim();
    if (!text) return;
    const chunks = splitLong(current.parts);
    chunks.forEach((chunk, index) => {
      sections.push({
        id: current.id,
        title: current.title,
        text: chunk,
        ...(chunks.length > 1 ? { part: index + 1 } : {}),
      });
    });
  }

  const blocks = splitLessonBlocks(lesson.content);
  let previous: string | null = null;
  for (const block of blocks) {
    const first = block.split("\n")[0];
    if (first.startsWith("# ")) {
      previous = block;
      continue;
    }
    if (first.startsWith("## ")) {
      flush();
      const title = first.slice(3).trim();
      current = { id: headingSlug(title), title: cleanHeading(title), parts: [sentence(speakInline(cleanHeading(title)))] };
      previous = block;
      continue;
    }
    const spoken = speakBlock(block, previous);
    if (spoken) current.parts.push(spoken);
    previous = block;
  }
  flush();

  if (lesson.takeaways?.length) {
    const items = lesson.takeaways.map((item, index) => `${ordinal(index + 1)}, ${sentence(speakInline(item))}`);
    sections.push({ id: "takeaways", title: "Key takeaways", text: ["Key takeaways.", ...items].join(" ") });
  }
  return sections;
}

/** The whole lesson as one script; used where a single text is still needed. */
export function lessonScript(lesson: SpeechLesson): string {
  return buildLessonSpeech(lesson)
    .map((section) => section.text)
    .join(" ");
}

function splitLong(parts: string[]): string[] {
  const chunks: string[] = [];
  let buffer = "";
  for (const part of parts) {
    if (!part) continue;
    if (buffer && buffer.length + part.length + 1 > MAX_SECTION_CHARS) {
      chunks.push(buffer.trim());
      buffer = "";
    }
    buffer = buffer ? `${buffer} ${part}` : part;
  }
  if (buffer.trim()) chunks.push(buffer.trim());
  return chunks;
}

function cleanHeading(title: string): string {
  return title.replace(/^\d+\.\s*/, "").trim();
}

export function speakBlock(block: string, previous: string | null): string {
  if (isVizBlock(block)) return "";
  if (isCodeBlock(block)) return speakCodeBlock(block, previous);
  const lines = block.split("\n");
  const first = lines[0];
  if (first.startsWith("### ")) return sentence(speakInline(cleanHeading(first.slice(4))));
  if (isArrowFlow(block)) {
    const parts = block
      .trim()
      .split(/\s*→\s*/)
      .map((part) => speakInline(part.trim()))
      .filter(Boolean);
    return sentence(parts.join(", then "));
  }
  if (isTableBlock(block)) return speakTable(lines);
  if (isQuoteBlock(block)) {
    const text = lines.map((line) => line.replace(/^>\s?/, "")).join(" ").trim();
    const labelled = /^(tip|note|example|warning|remember|rule|memory cue|useful phrase|interview rule|interviewer|why|key idea|watch out)\b/i.test(
      stripEmphasis(text),
    );
    return sentence(`${labelled ? "" : "Note: "}${speakInline(text)}`);
  }
  if (isOrderedListBlock(block)) {
    return lines
      .map((line, index) => {
        const match = line.match(/^(\d+)\.\s(.*)$/);
        const n = match ? Number(match[1]) : index + 1;
        return `${ordinal(n)}, ${sentence(speakInline(match?.[2] ?? line))}`;
      })
      .join(" ");
  }
  if (isListBlock(block)) {
    return lines.map((line) => sentence(speakInline(line.slice(2)))).join(" ");
  }
  if (isFormulaBlock(block)) {
    return sentence(speakInline(block.trim()).replace(/\s*=\s*/g, " equals ").replace(/\s*≈\s*/g, " is about "));
  }
  if (isExampleBlock(block)) return sentence(speakInline(block.trim()));
  return sentence(speakInline(lines.join(" ")));
}

function speakCodeBlock(block: string, previous: string | null): string {
  if (previous && isCodeBlock(previous)) return "Another code example, shown on screen.";
  const label = codeLabel(previous) ?? languageName(parseCodeBlock(block).language);
  return label ? `Code example: ${label}, shown on screen.` : "Code example, shown on screen.";
}

/** A bold lead-in such as `**2. Count map** — how many…` or an h3 right above the code names it. */
function codeLabel(previous: string | null): string | null {
  if (!previous) return null;
  const first = previous.split("\n")[0].trim();
  if (first.startsWith("### ")) return speakInline(cleanHeading(first.slice(4)));
  const bold = first.match(/^\*\*([^*]+)\*\*/);
  if (bold) return speakInline(cleanHeading(bold[1]).replace(/[:.\s]+$/, ""));
  return null;
}

function languageName(language: string): string {
  const key = language.trim().toLowerCase();
  const names: Record<string, string> = {
    java: "Java",
    py: "Python",
    python: "Python",
    js: "JavaScript",
    javascript: "JavaScript",
    ts: "TypeScript",
    typescript: "TypeScript",
    sql: "SQL",
    bash: "shell",
    sh: "shell",
    shell: "shell",
    json: "JSON",
    yaml: "YAML",
    text: "",
    txt: "",
  };
  return names[key] ?? (key ? key : "");
}

function speakTable(lines: string[]): string {
  const headers = splitTableRow(lines[0]).map((cell) => speakInline(cell));
  const rows = lines.slice(2).map(splitTableRow);
  const spokenRows = rows.map((row) => {
    const cells = row.map((cell, index) => {
      const value = speakInline(cell);
      const header = headers[index];
      if (!value) return "";
      return header ? `${header}: ${value}` : value;
    });
    return sentence(cells.filter(Boolean).join(". "));
  });
  return spokenRows.join(" ");
}

function ordinal(n: number): string {
  return ORDINALS[n - 1] ?? `Number ${n}`;
}

function sentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return /[.!?:;]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function stripEmphasis(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/__([^_]+)__/g, "$1");
}

/** Inline markdown and notation to spoken words. */
export function speakInline(text: string): string {
  let out = text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, (_match, code: string) => ` ${speakCode(code)} `);
  out = stripEmphasis(out)
    .replace(/(^|\s)_([^_\s][^_]*?)_(?=[\s.,;:!?)]|$)/g, "$1$2")
    .replace(/^#{1,6}\s+/g, "");
  out = speakNotation(out);
  out = out
    .replace(/\be\.g\.,?\s*/gi, "for example, ")
    .replace(/\bi\.e\.,?\s*/gi, "that is, ")
    .replace(/\bvs\.?\s/gi, "versus ")
    .replace(/\betc\./gi, "et cetera")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .replace(/[—–]/g, ", ")
    .replace(/\s*\|\s*/g, ", ")
    .replace(/[#*_`]/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();
  return out;
}

/** Symbols that appear in prose, formulas and code alike. */
function speakNotation(text: string): string {
  return text
    .replace(/\bO\(([^()]+)\)/g, (_match, inner: string) => `O of ${speakMath(inner)}`)
    .replace(/(\w)\^2\b/g, "$1 squared")
    .replace(/(\w)\^3\b/g, "$1 cubed")
    .replace(/(\w)\^(\w+)/g, "$1 to the power of $2")
    .replace(/\s*≈\s*/g, " about ")
    .replace(/\s*×\s*/g, " times ")
    .replace(/\s*÷\s*/g, " divided by ")
    .replace(/\s*≤\s*/g, " at most ")
    .replace(/\s*≥\s*/g, " at least ")
    .replace(/\s*≠\s*/g, " is not ")
    .replace(/\s*→\s*/g, ", then ")
    .replace(/\s*<=\s*/g, " less than or equal to ")
    .replace(/\s*>=\s*/g, " greater than or equal to ")
    .replace(/\s*==\s*/g, " equals ")
    .replace(/\s*!=\s*/g, " not equal to ")
    .replace(/\s*->\s*/g, " to ")
    .replace(/\s*=>\s*/g, " to ")
    .replace(/\s*&&\s*/g, " and ")
    .replace(/\s*\|\|\s*/g, " or ")
    .replace(/(\w)\s-\s(\w)/g, "$1 minus $2")
    .replace(/(\w)\s\+\s(\w)/g, "$1 plus $2")
    .replace(/(\w)\s\*\s(\w)/g, "$1 times $2");
}

function speakMath(inner: string): string {
  return inner
    .trim()
    .replace(/\^2\b/g, " squared")
    .replace(/\^3\b/g, " cubed")
    .replace(/\*/g, " times ")
    .replace(/(\w)\+(\w)/g, "$1 plus $2")
    .replace(/\s+/g, " ")
    .trim();
}

/** An inline code span, spoken like an engineer would say it out loud. */
export function speakCode(code: string): string {
  let out = code.trim().replace(/<>/g, "");
  // Generics can nest (Map<String, List<String>>), so peel them from the inside out.
  for (let guard = 0; guard < 5 && /<[^<>]+>/.test(out); guard += 1) {
    out = out.replace(/<([^<>]+)>/g, " of $1 ");
  }
  out = out
    .replace(/\[\]/g, " array")
    .replace(/\[(\w+)\]/g, " at $1")
    .replace(/\(\)/g, "")
    .replace(/[()]/g, " ")
    .replace(/::/g, " ")
    .replace(/(\w)\.(\w)/g, "$1 dot $2")
    .replace(/!(?=[A-Za-z(])/g, "not ")
    .replace(/\+\+/g, " plus plus")
    .replace(/--/g, " minus minus")
    .replace(/%/g, " mod ")
    .replace(/&(?!&)/g, " and ")
    .replace(/_/g, " ");
  out = speakNotation(out);
  out = out
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  return out;
}
