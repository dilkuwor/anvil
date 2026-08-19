import {
  Bookmark,
  Braces,
  Briefcase,
  Calculator,
  ClipboardList,
  Code2,
  Flag,
  GraduationCap,
  Lightbulb,
  ListChecks,
  ListOrdered,
  Map,
  MessageCircleQuestion,
  MessageSquare,
  Network,
  Repeat,
  Scale,
  Search,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  Workflow,
} from "lucide-react";

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

const HEADING_ICON_CLASS = "h-4 w-4 shrink-0 text-accent";

function HeadingIcon({ title }: { title: string }) {
  const props = { className: HEADING_ICON_CLASS, strokeWidth: 2.25, "aria-hidden": true as const };
  const key = headingKey(title);
  switch (key) {
    case "why":
      return <Lightbulb {...props} />;
    case "how":
      return <Workflow {...props} />;
    case "example":
      return <Code2 {...props} />;
    case "uses":
      return <Briefcase {...props} />;
    case "tradeoffs":
      return <Scale {...props} />;
    case "mistakes":
      return <TriangleAlert {...props} />;
    case "tip":
    case "golden":
      return <GraduationCap {...props} />;
    case "formula":
      return <Sparkles {...props} />;
    case "flow":
      return <ListOrdered {...props} />;
    case "ask":
      return <MessageCircleQuestion {...props} />;
    case "requirements":
      return <ClipboardList {...props} />;
    case "size":
      return <Calculator {...props} />;
    case "shape":
      return <Braces {...props} />;
    case "architecture":
      return <Network {...props} />;
    case "dive":
      return <Search {...props} />;
    case "stress":
      return <ShieldAlert {...props} />;
    case "sell":
      return <Flag {...props} />;
    case "map":
      return <Map {...props} />;
    case "checklist":
      return <ListChecks {...props} />;
    case "practice":
      return <Repeat {...props} />;
    default:
      return <Bookmark {...props} />;
  }
}

function headingKey(title: string): string {
  const t = title.trim().toLowerCase().replace(/^\d+\.\s*/, "");
  if (t === "why it matters") return "why";
  if (t === "how it works") return "how";
  if (t === "example") return "example";
  if (t === "common use cases" || t === "use cases") return "uses";
  if (t === "tradeoffs" || t.startsWith("trade-off")) return "tradeoffs";
  if (t === "common mistakes") return "mistakes";
  if (t === "interview tip") return "tip";
  if (t.includes("memory formula") || t.includes("one-line")) return "formula";
  if (t.includes("interview flow")) return "flow";
  if (t.startsWith("clarify")) return "ask";
  if (t.includes("non-functional") || t.includes("functional")) return "requirements";
  if (t.includes("estimation") || t.includes("envelope")) return "size";
  if (t.startsWith("api") || t.includes("data model")) return "shape";
  if (t.includes("architecture")) return "architecture";
  if (t.includes("deep dive")) return "dive";
  if (t.includes("bottleneck") || t.includes("failure")) return "stress";
  if (t.includes("summary")) return "sell";
  if (t.includes("memory map") || t.includes("visual memory")) return "map";
  if (t.includes("checklist")) return "checklist";
  if (t.includes("practice")) return "practice";
  if (t.includes("golden")) return "golden";
  return "default";
}

function LessonHeading({ title }: { title: string }) {
  const numbered = title.match(/^(\d+)\.\s+(.*)$/);
  if (numbered) {
    return (
      <h2 className="flex items-center gap-2.5 pt-2 text-[15px] font-semibold tracking-tight">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/15 text-[12px] font-bold tabular-nums text-accent">
          {numbered[1]}
        </span>
        {numbered[2]}
      </h2>
    );
  }
  return (
    <h2 className="flex items-center gap-2 pt-2 text-[15px] font-semibold tracking-tight">
      <HeadingIcon title={title} />
      {title}
    </h2>
  );
}

function isHeadingBlock(block: string): boolean {
  const first = block.split("\n")[0] ?? "";
  return first.startsWith("# ") || first.startsWith("## ") || first.startsWith("### ");
}

function isListBlock(block: string): boolean {
  return block.split("\n").every((line) => line.startsWith("- "));
}

function isOrderedListBlock(block: string): boolean {
  return block.split("\n").every((line) => /^\d+\.\s/.test(line));
}

function isQuoteBlock(block: string): boolean {
  return block.split("\n").every((line) => line.startsWith("> "));
}

function isArrowFlow(block: string): boolean {
  const line = block.trim();
  if (line.includes("\n") || !line.includes("→")) return false;
  const parts = line.split(/\s*→\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 3) return false;
  return parts.every((part) => part.length <= 28 && !part.endsWith("."));
}

function isTableBlock(block: string): boolean {
  const lines = block.split("\n").map((line) => line.trim());
  if (lines.length < 2) return false;
  if (!lines.every((line) => line.startsWith("|") && line.endsWith("|"))) return false;
  return /^[\s:|-]+$/.test(lines[1].replaceAll("|", ""));
}

function isSpecialBlock(block: string): boolean {
  return (
    isHeadingBlock(block) ||
    isListBlock(block) ||
    isOrderedListBlock(block) ||
    isQuoteBlock(block) ||
    isArrowFlow(block) ||
    isTableBlock(block)
  );
}

function splitTableRow(line: string): string[] {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code class="rounded bg-steel-800 px-1 py-0.5 font-mono text-[13px] text-accent-light">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function ArrowFlow({ parts }: { parts: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {parts.map((part, index) => (
        <span key={`${part}-${index}`} className="inline-flex items-center gap-1.5">
          {index > 0 ? (
            <span className="text-[12px] text-muted-foreground" aria-hidden>
              →
            </span>
          ) : null}
          <span className="rounded-lg border border-accent/20 bg-accent/[0.08] px-2.5 py-1 text-[12px] font-semibold tracking-wide text-accent">
            {part}
          </span>
        </span>
      ))}
    </div>
  );
}

function QuoteCallout({ lines }: { lines: string[] }) {
  const body = lines.map((line) => line.slice(2)).join(" ");
  const lower = body.toLowerCase();
  const iconProps = { className: "mt-0.5 h-4 w-4 shrink-0 text-accent", strokeWidth: 2.25, "aria-hidden": true as const };
  const Icon = lower.startsWith("useful phrase")
    ? MessageSquare
    : lower.startsWith("memory cue")
      ? Sparkles
      : Lightbulb;
  return (
    <div className="flex gap-2.5 rounded-xl border border-accent/15 bg-accent/[0.05] px-3.5 py-3">
      <Icon {...iconProps} />
      <p className="text-[13px] leading-6 text-foreground/90" dangerouslySetInnerHTML={{ __html: inline(body) }} />
    </div>
  );
}

function MarkdownTable({ block }: { block: string }) {
  const lines = block.split("\n").map((line) => line.trim());
  const headers = splitTableRow(lines[0]);
  const rows = lines.slice(2).map(splitTableRow);
  return (
    <div className="overflow-x-auto rounded-xl border border-steel-800">
      <table className="w-full min-w-[28rem] border-collapse text-left text-[13px] leading-6">
        <thead>
          <tr className="border-b border-steel-800 bg-steel-950/60">
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-semibold" dangerouslySetInnerHTML={{ __html: inline(header) }} />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")} className="border-b border-steel-800 last:border-b-0">
              {row.map((cell, index) => (
                <td
                  key={`${cell}-${index}`}
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

export function LessonMarkdown({
  content,
  skipLeadingTitle = true,
}: {
  content: string;
  skipLeadingTitle?: boolean;
}) {
  const blocks = content.replaceAll("\r\n", "\n").trim().split(/\n{2,}/);
  const skipFirstTitle = skipLeadingTitle && Boolean(blocks[0]?.startsWith("# "));
  const leadIndex = blocks.findIndex((block, index) => {
    if (index === 0 && skipFirstTitle) return false;
    return !isSpecialBlock(block);
  });
  return (
    <div className="w-full space-y-5 text-sm leading-7 text-foreground">
      {blocks.map((block, index) => {
        if (index === 0 && skipFirstTitle) return null;
        const lines = block.split("\n");
        if (lines[0].startsWith("# ")) {
          return <LessonHeading key={index} title={lines[0].slice(2)} />;
        }
        if (lines[0].startsWith("## ")) {
          return <LessonHeading key={index} title={lines[0].slice(3)} />;
        }
        if (lines[0].startsWith("### ")) {
          return (
            <h3 key={index} className="flex items-center gap-2 text-[13px] font-semibold tracking-tight">
              <HeadingIcon title={lines[0].slice(4)} />
              {lines[0].slice(4)}
            </h3>
          );
        }
        if (isArrowFlow(block)) {
          const parts = block
            .trim()
            .split(/\s*→\s*/)
            .map((part) => part.trim())
            .filter(Boolean);
          return <ArrowFlow key={index} parts={parts} />;
        }
        if (isTableBlock(block)) {
          return <MarkdownTable key={index} block={block} />;
        }
        if (isQuoteBlock(block)) {
          return <QuoteCallout key={index} lines={lines} />;
        }
        if (isOrderedListBlock(block)) {
          return (
            <ol key={index} className="space-y-2">
              {lines.map((line) => {
                const match = line.match(/^(\d+)\.\s(.*)$/);
                const n = match?.[1] ?? "";
                const text = match?.[2] ?? line;
                return (
                  <li key={line} className="flex items-start gap-2.5">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-[11px] font-semibold tabular-nums text-accent">
                      {n}
                    </span>
                    <span className="text-foreground/90" dangerouslySetInnerHTML={{ __html: inline(text) }} />
                  </li>
                );
              })}
            </ol>
          );
        }
        if (isListBlock(block)) {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5 text-foreground/90">
              {lines.map((line) => (
                <li key={line} dangerouslySetInnerHTML={{ __html: inline(line.slice(2)) }} />
              ))}
            </ul>
          );
        }
        const html = inline(lines.join(" "));
        if (index === leadIndex) {
          return (
            <p
              key={index}
              className="w-full rounded-xl border border-accent/15 bg-accent/[0.06] px-3.5 py-3 text-[15px] leading-7 text-foreground"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        return <p key={index} className="text-foreground/90" dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}

function splitTutorBlocks(content: string): string[] {
  const lines = content.replaceAll("\r\n", "\n").split("\n");
  const blocks: string[] = [];
  let index = 0;
  while (index < lines.length) {
    if (lines[index].startsWith("```")) {
      const fence = [lines[index]];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        fence.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        fence.push(lines[index]);
        index += 1;
      }
      blocks.push(fence.join("\n"));
      continue;
    }
    if (lines[index].trim() === "") {
      index += 1;
      continue;
    }
    const chunk = [lines[index]];
    index += 1;
    while (index < lines.length && lines[index].trim() !== "" && !lines[index].startsWith("```")) {
      chunk.push(lines[index]);
      index += 1;
    }
    blocks.push(chunk.join("\n"));
  }
  return blocks;
}

export function TutorMarkdown({ content }: { content: string }) {
  const blocks = splitTutorBlocks(content.trim());
  return (
    <div className="space-y-3 text-sm leading-6 text-foreground">
      {blocks.map((block, index) => {
        if (block.startsWith("```")) {
          const lines = block.split("\n");
          const code = lines
            .slice(1, lines[lines.length - 1]?.startsWith("```") ? -1 : undefined)
            .join("\n");
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-md border border-steel-700 bg-steel-950 px-3 py-2 font-mono text-[12px] leading-5"
            >
              <code>{code}</code>
            </pre>
          );
        }
        const lines = block.split("\n");
        if (lines[0].startsWith("### ")) {
          return (
            <h4 key={index} className="text-[13px] font-semibold tracking-tight">
              {lines[0].slice(4)}
            </h4>
          );
        }
        if (lines[0].startsWith("## ") || lines[0].startsWith("# ")) {
          return (
            <h3 key={index} className="text-[14px] font-semibold tracking-tight">
              {lines[0].replace(/^#+\s/, "")}
            </h3>
          );
        }
        if (lines.every((line) => /^[-*]\s/.test(line))) {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5 text-foreground/90">
              {lines.map((line) => (
                <li key={line} dangerouslySetInnerHTML={{ __html: inline(line.replace(/^[-*]\s/, "")) }} />
              ))}
            </ul>
          );
        }
        if (lines.every((line) => /^\d+\.\s/.test(line))) {
          return (
            <ol key={index} className="list-decimal space-y-1 pl-5 text-foreground/90">
              {lines.map((line) => (
                <li key={line} dangerouslySetInnerHTML={{ __html: inline(line.replace(/^\d+\.\s/, "")) }} />
              ))}
            </ol>
          );
        }
        return <p key={index} dangerouslySetInnerHTML={{ __html: inline(lines.join(" ")) }} />;
      })}
    </div>
  );
}
