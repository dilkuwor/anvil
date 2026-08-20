import {
  Bookmark,
  Braces,
  Briefcase,
  Calculator,
  ClipboardList,
  Code2,
  Flag,
  Gauge,
  GraduationCap,
  HardDrive,
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
  Timer,
  TriangleAlert,
  Users,
  Wifi,
  Workflow,
} from "lucide-react";

import { cn } from "@/lib/utils";

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
    case "qps":
      return <Gauge {...props} />;
    case "latency":
      return <Timer {...props} />;
    case "storage":
      return <HardDrive {...props} />;
    case "users":
      return <Users {...props} />;
    case "bandwidth":
      return <Wifi {...props} />;
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
  if (t.includes("study priority") || t.includes("30-second") || t.includes("review before")) return "checklist";
  if (t.includes("interview rule") || t.includes("what to say")) return "ask";
  if (t.includes("memory formula") || t.includes("one-line") || t.includes("golden number") || t.includes("mental math") || t.includes("powers of")) return "formula";
  if (t.includes("interview flow")) return "flow";
  if (t.includes("qps")) return "qps";
  if (t.includes("latency")) return "latency";
  if (t.startsWith("clarify")) return "ask";
  if (t.includes("non-functional") || t.includes("functional")) return "requirements";
  if (t.includes("users estimation") || t.startsWith("users")) return "users";
  if (t.includes("storage")) return "storage";
  if (t.includes("bandwidth") || t.includes("network")) return "bandwidth";
  if (t.includes("estimation") || t.includes("envelope")) return "size";
  if (t.startsWith("api") || t.includes("data model")) return "shape";
  if (t.includes("architecture")) return "architecture";
  if (t.includes("deep dive")) return "dive";
  if (t.includes("bottleneck") || t.includes("failure")) return "stress";
  if (t.includes("summary")) return "sell";
  if (t.includes("memory map") || t.includes("visual memory") || t.includes("memory card")) return "map";
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

function isFormulaBlock(block: string): boolean {
  const line = block.trim();
  if (!line || line.includes("\n") || line.length > 140) return false;
  if (line.startsWith("#") || line.startsWith(">") || line.startsWith("|") || line.startsWith("- ") || /^\d+\.\s/.test(line)) {
    return false;
  }
  if (/^(example|tip|memory cue|useful phrase|interview rule|final tip)\b/i.test(line)) return false;
  return /^(?:[^:=\n]{1,72}?)\s*(?:=|≈)\s*\S/.test(line);
}

function isExampleBlock(block: string): boolean {
  const line = block.trim();
  return !line.includes("\n") && /^example:/i.test(line);
}

function isStatList(block: string): boolean {
  if (!isListBlock(block)) return false;
  const items = block.split("\n").map((line) => line.slice(2).trim());
  if (items.length < 4) return false;
  return items.every((item) => item.length <= 88 && /≈|→|×|÷/.test(item));
}

function isSpecialBlock(block: string): boolean {
  return (
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

function bucketTone(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes("instant") || t.includes("very fast") || t.includes("carrier")) return "teal";
  if (t.includes("fast enough") || t.includes("common sla")) return "success";
  if (/\bfast\b/.test(t)) return "success";
  if (t.includes("expensive") || t.includes("slow")) return "coral";
  if (t.includes("high availability")) return "accent";
  if (t.includes("basic")) return "muted";
  return null;
}

function toneClass(tone: string): string {
  switch (tone) {
    case "teal":
      return "bg-teal-dim text-teal";
    case "success":
      return "bg-success/15 text-success";
    case "coral":
      return "bg-coral-dim text-coral";
    case "accent":
      return "bg-accent/15 text-accent";
    default:
      return "bg-muted text-muted-foreground";
  }
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
  const isPhrase =
    lower.startsWith("useful phrase") ||
    lower.startsWith("say this") ||
    lower.startsWith("i’ll make") ||
    lower.startsWith("i'll make") ||
    body.startsWith("“") ||
    body.startsWith('"');
  const isMemory = lower.startsWith("memory cue") || lower.startsWith("memory aid") || lower.startsWith("memory pattern");
  const isRule = lower.startsWith("do not") || lower.startsWith("interview rule") || lower.startsWith("final tip");
  const Icon = isPhrase ? MessageSquare : isMemory ? Sparkles : isRule ? TriangleAlert : Lightbulb;
  const wrap = isPhrase
    ? "border-teal/25 bg-teal-dim/70"
    : isRule
      ? "border-coral/25 bg-coral-dim/70"
      : "border-accent/15 bg-accent/[0.05]";
  const iconColor = isPhrase ? "text-teal" : isRule ? "text-coral" : "text-accent";
  const iconProps = { className: cn("mt-0.5 h-4 w-4 shrink-0", iconColor), strokeWidth: 2.25, "aria-hidden": true as const };
  return (
    <div className={cn("flex gap-2.5 rounded-xl border px-3.5 py-3", wrap)}>
      <Icon {...iconProps} />
      <p className="text-[13px] leading-6 text-foreground/90" dangerouslySetInnerHTML={{ __html: inline(body) }} />
    </div>
  );
}

function FormulaCard({ text }: { text: string }) {
  const [left, right] = text.split(/\s*(?:=|≈)\s*/, 2);
  const operator = text.includes("=") && text.indexOf("=") <= (text.indexOf("≈") === -1 ? 999 : text.indexOf("≈")) ? "=" : "≈";
  return (
    <div className="rounded-xl border border-accent/20 bg-steel-950 px-3.5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">Formula</p>
      <p className="mt-1.5 font-mono text-[13px] leading-6 text-foreground">
        <span className="font-semibold text-accent" dangerouslySetInnerHTML={{ __html: inline(left) }} />
        <span className="px-1.5 text-muted-foreground">{operator}</span>
        <span dangerouslySetInnerHTML={{ __html: inline(right || "") }} />
      </p>
    </div>
  );
}

function ExampleCard({ text }: { text: string }) {
  const body = text.replace(/^example:\s*/i, "");
  return (
    <div className="flex gap-2.5 rounded-xl border border-teal/20 bg-teal-dim/50 px-3.5 py-3">
      <Code2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" strokeWidth={2.25} aria-hidden />
      <p className="text-[13px] leading-6 text-foreground/90">
        <span className="mr-1.5 font-semibold text-teal">Example</span>
        <span dangerouslySetInnerHTML={{ __html: inline(body) }} />
      </p>
    </div>
  );
}

function StatGrid({ items }: { items: string[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item}
          className="rounded-xl border border-accent/20 bg-accent/[0.06] px-3 py-2 text-[13px] leading-6 text-foreground"
          dangerouslySetInnerHTML={{ __html: inline(item) }}
        />
      ))}
    </div>
  );
}

function MarkdownTable({ block }: { block: string }) {
  const lines = block.split("\n").map((line) => line.trim());
  const headers = splitTableRow(lines[0]);
  const rows = lines.slice(2).map(splitTableRow);
  const pillHeaders = headers.map((header) => /bucket|memory tip|latency/i.test(header));
  return (
    <div className="overflow-x-auto rounded-xl border border-accent/20">
      <table className="w-full min-w-[28rem] border-collapse text-left text-[13px] leading-6">
        <thead>
          <tr className="border-b border-accent/15 bg-accent/[0.12]">
            {headers.map((header) => (
              <th
                key={header}
                className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent"
                dangerouslySetInnerHTML={{ __html: inline(header) }}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={row.join("|")}
              className={cn("border-b border-steel-800 last:border-b-0", rowIndex % 2 === 1 && "bg-steel-950/55")}
            >
              {row.map((cell, index) => {
                const tone = pillHeaders[index] ? bucketTone(cell) : null;
                if (tone) {
                  return (
                    <td key={`${cell}-${index}`} className="px-3 py-2">
                      <span
                        className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide", toneClass(tone))}
                        dangerouslySetInnerHTML={{ __html: inline(cell) }}
                      />
                    </td>
                  );
                }
                return (
                  <td
                    key={`${cell}-${index}`}
                    className={cn("px-3 py-2 text-foreground/90", index === 0 && "font-semibold text-foreground")}
                    dangerouslySetInnerHTML={{ __html: inline(cell) }}
                  />
                );
              })}
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
        if (isFormulaBlock(block)) {
          return <FormulaCard key={index} text={block.trim()} />;
        }
        if (isExampleBlock(block)) {
          return <ExampleCard key={index} text={block.trim()} />;
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
          if (isStatList(block)) {
            return <StatGrid key={index} items={lines.map((line) => line.slice(2).trim())} />;
          }
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
