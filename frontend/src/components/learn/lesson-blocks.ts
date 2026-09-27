/** Pure helpers that split lesson markdown into blocks. Shared by the renderer and the reader (speech). */

export function headingSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/^\d+\.\s*/, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function splitLessonBlocks(content: string): string[] {
  const lines = content.replaceAll("\r\n", "\n").trim().split("\n");
  const blocks: string[] = [];
  let buffer: string[] = [];

  function flush() {
    const text = buffer.join("\n").trim();
    if (text) blocks.push(text);
    buffer = [];
  }

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].startsWith("```")) {
      flush();
      const fence = [lines[index]];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        fence.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) fence.push(lines[index]);
      blocks.push(fence.join("\n"));
      continue;
    }
    if (lines[index].trim() === "") {
      flush();
      continue;
    }
    buffer.push(lines[index]);
  }
  flush();
  return blocks;
}

export function isCodeBlock(block: string): boolean {
  return block.startsWith("```");
}

/** A one-line `:::viz <id> {json}` directive that mounts a step-through visualizer. */
export function isVizBlock(block: string): boolean {
  const text = block.trim();
  return /^:::\s*viz\b/i.test(text) && !text.includes("\n");
}

export function parseCodeBlock(block: string): { language: string; code: string } {
  const lines = block.split("\n");
  const language = lines[0].slice(3).trim();
  const end = lines[lines.length - 1]?.startsWith("```") ? -1 : undefined;
  return { language, code: lines.slice(1, end).join("\n") };
}

export function isHeadingBlock(block: string): boolean {
  const first = block.split("\n")[0] ?? "";
  return first.startsWith("# ") || first.startsWith("## ") || first.startsWith("### ");
}

export function isListBlock(block: string): boolean {
  return block.split("\n").every((line) => line.startsWith("- "));
}

export function isOrderedListBlock(block: string): boolean {
  return block.split("\n").every((line) => /^\d+\.\s/.test(line));
}

export function isQuoteBlock(block: string): boolean {
  return block.split("\n").every((line) => line.startsWith("> "));
}

export function isArrowFlow(block: string): boolean {
  const line = block.trim();
  if (line.includes("\n") || !line.includes("→")) return false;
  const parts = line.split(/\s*→\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 3) return false;
  return parts.every((part) => part.length <= 28 && !part.endsWith("."));
}

export function isTableBlock(block: string): boolean {
  const lines = block.split("\n").map((line) => line.trim());
  if (lines.length < 2) return false;
  if (!lines.every((line) => line.startsWith("|") && line.endsWith("|"))) return false;
  return /^[\s:|-]+$/.test(lines[1].replaceAll("|", ""));
}

export function isFormulaBlock(block: string): boolean {
  const line = block.trim();
  if (!line || line.includes("\n") || line.length > 140) return false;
  if (line.startsWith("#") || line.startsWith(">") || line.startsWith("|") || line.startsWith("- ") || /^\d+\.\s/.test(line)) {
    return false;
  }
  if (/^(example|tip|memory cue|useful phrase|interview rule|final tip)\b/i.test(line)) return false;
  return /^(?:[^:=\n]{1,72}?)\s*(?:=|≈)\s*\S/.test(line);
}

export function isExampleBlock(block: string): boolean {
  const line = block.trim();
  return !line.includes("\n") && /^example:/i.test(line);
}

export function isStatList(block: string): boolean {
  if (!isListBlock(block)) return false;
  const items = block.split("\n").map((line) => line.slice(2).trim());
  if (items.length < 4) return false;
  return items.every((item) => item.length <= 88 && /≈|→|×|÷/.test(item));
}

export function isSpecialBlock(block: string): boolean {
  return (
    isVizBlock(block) ||
    isCodeBlock(block) ||
    isHeadingBlock(block) ||
    isListBlock(block) ||
    isOrderedListBlock(block) ||
    isQuoteBlock(block) ||
    isArrowFlow(block) ||
    isTableBlock(block) ||
    isFormulaBlock(block) ||
    isExampleBlock(block)
  );
}

export function splitTableRow(line: string): string[] {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}
