import {
  Bookmark,
  Briefcase,
  Code2,
  GraduationCap,
  Lightbulb,
  Scale,
  TriangleAlert,
  Workflow,
} from "lucide-react";

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

const HEADING_ICON_CLASS = "h-4 w-4 shrink-0 text-accent";

function HeadingIcon({ title }: { title: string }) {
  const props = { className: HEADING_ICON_CLASS, strokeWidth: 2.25, "aria-hidden": true as const };
  switch (title.trim().toLowerCase()) {
    case "why it matters":
      return <Lightbulb {...props} />;
    case "how it works":
      return <Workflow {...props} />;
    case "example":
      return <Code2 {...props} />;
    case "common use cases":
    case "use cases":
      return <Briefcase {...props} />;
    case "tradeoffs":
      return <Scale {...props} />;
    case "common mistakes":
      return <TriangleAlert {...props} />;
    case "interview tip":
      return <GraduationCap {...props} />;
    default:
      return <Bookmark {...props} />;
  }
}

function LessonHeading({ title }: { title: string }) {
  return (
    <h2 className="flex items-center gap-2 pt-2 text-[15px] font-semibold tracking-tight">
      <HeadingIcon title={title} />
      {title}
    </h2>
  );
}

function isHeadingBlock(block: string): boolean {
  const first = block.split("\n")[0] ?? "";
  return first.startsWith("# ") || first.startsWith("## ");
}

function isListBlock(block: string): boolean {
  return block.split("\n").every((line) => line.startsWith("- "));
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code class="rounded bg-steel-800 px-1 py-0.5 font-mono text-[13px] text-accent-light">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
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
    return !isHeadingBlock(block) && !isListBlock(block);
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
