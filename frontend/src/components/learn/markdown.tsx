function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code class="rounded bg-steel-800 px-1 py-0.5 font-mono text-[13px] text-accent-light">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

export function LessonMarkdown({ content }: { content: string }) {
  const blocks = content.replaceAll("\r\n", "\n").trim().split(/\n{2,}/);
  const skipFirstTitle = blocks[0]?.startsWith("# ");
  return (
    <div className="max-w-3xl space-y-4 text-sm leading-7 text-foreground">
      {blocks.map((block, index) => {
        if (index === 0 && skipFirstTitle) return null;
        const lines = block.split("\n");
        if (lines[0].startsWith("# ")) {
          return (
            <h2 key={index} className="text-lg font-semibold tracking-tight">
              {lines[0].slice(2)}
            </h2>
          );
        }
        if (lines[0].startsWith("## ")) {
          return (
            <h2 key={index} className="pt-1 text-[15px] font-semibold tracking-tight">
              {lines[0].slice(3)}
            </h2>
          );
        }
        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5 text-foreground/90">
              {lines.map((line) => (
                <li key={line} dangerouslySetInnerHTML={{ __html: inline(line.slice(2)) }} />
              ))}
            </ul>
          );
        }
        return <p key={index} dangerouslySetInnerHTML={{ __html: inline(lines.join(" ")) }} />;
      })}
    </div>
  );
}
