import { cn } from "@/lib/utils";

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(
      /`([^`]+)`/g,
      '<code class="rounded bg-steel-800 px-1 py-0.5 font-mono text-[13px] text-accent-light">$1</code>',
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "p"; lines: string[] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; code: string }
  | { type: "quote"; lines: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|");
}

function isTableDivider(line: string): boolean {
  return isTableLine(line) && /^[\s:|-]+$/.test(line.replaceAll("|", ""));
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isBlockStart(line: string): boolean {
  return (
    line.startsWith("```") ||
    /^#{1,6}\s+\S/.test(line) ||
    /^[-*]\s+\S/.test(line) ||
    /^\d+\.\s+\S/.test(line) ||
    line.startsWith("> ") ||
    isTableLine(line)
  );
}

export function parseNoteBlocks(content: string): Block[] {
  const lines = content.replaceAll("\r\n", "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", code: code.join("\n") });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (heading) {
      const level = Math.min(heading[1].length, 3) as 1 | 2 | 3;
      blocks.push({ type: `h${level}`, text: heading[2].replace(/\s+#+\s*$/, "") });
      index += 1;
      continue;
    }

    if (/^[-*]\s+\S/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+\S/.test(lines[index])) {
        items.push(lines[index].replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\d+\.\s+\S/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+\S/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    if (line.startsWith("> ")) {
      const quoted: string[] = [];
      while (index < lines.length && lines[index].startsWith("> ")) {
        quoted.push(lines[index].slice(2));
        index += 1;
      }
      blocks.push({ type: "quote", lines: quoted });
      continue;
    }

    if (isTableLine(line) && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const headers = splitTableRow(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && isTableLine(lines[index]) && !isTableDivider(lines[index])) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() !== "" && !isBlockStart(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    if (paragraph.length) blocks.push({ type: "p", lines: paragraph });
  }

  return blocks;
}

const HEADING_CLASS = {
  h1: "text-xl font-semibold tracking-tight text-foreground",
  h2: "pt-1 text-base font-semibold tracking-tight text-foreground",
  h3: "text-[13px] font-semibold tracking-tight text-foreground",
} as const;

export function NoteBody({ content, compact = false }: { content: string; compact?: boolean }) {
  const blocks = parseNoteBlocks(content);
  return (
    <div className={cn("space-y-3.5 text-foreground", compact ? "text-[13px] leading-6" : "text-[15px] leading-7")}>
      {blocks.map((block, index) => {
        if (block.type === "h1" || block.type === "h2" || block.type === "h3") {
          const Tag = block.type;
          return (
            <Tag
              key={index}
              className={HEADING_CLASS[block.type]}
              dangerouslySetInnerHTML={{ __html: inline(block.text) }}
            />
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5 text-foreground/90">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} dangerouslySetInnerHTML={{ __html: inline(item) }} />
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={index} className="list-decimal space-y-1 pl-5 text-foreground/90">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} dangerouslySetInnerHTML={{ __html: inline(item) }} />
              ))}
            </ol>
          );
        }
        if (block.type === "code") {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-lg border border-steel-800 bg-steel-950 px-3 py-2.5 font-mono text-[12px] leading-5"
            >
              <code>{block.code}</code>
            </pre>
          );
        }
        if (block.type === "quote") {
          return (
            <blockquote
              key={index}
              className="border-l-2 border-accent/50 pl-3 text-foreground/80"
              dangerouslySetInnerHTML={{ __html: block.lines.map(inline).join("<br />") }}
            />
          );
        }
        if (block.type === "table") {
          return (
            <div key={index} className="overflow-x-auto rounded-xl border border-steel-800">
              <table className="w-full border-collapse text-left text-[13px] leading-6">
                <thead>
                  <tr className="border-b border-steel-800 bg-steel-950/60">
                    {block.headers.map((header) => (
                      <th
                        key={header}
                        className="px-3 py-2 font-semibold"
                        dangerouslySetInnerHTML={{ __html: inline(header) }}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-steel-800 last:border-b-0">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`${cell}-${cellIndex}`}
                          className="px-3 py-2 text-foreground/90"
                          dangerouslySetInnerHTML={{ __html: inline(cell) }}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p
            key={index}
            className="text-foreground/90"
            dangerouslySetInnerHTML={{ __html: block.lines.map(inline).join("<br />") }}
          />
        );
      })}
    </div>
  );
}
