"use client";

import { Check, CheckSquare, Copy, Lightbulb, Sparkles, Square } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { asStringList, asTable, type CheatSheetBlock } from "@/lib/cheatsheets";
import { cn } from "@/lib/utils";

export function CheatSheetBlockRenderer({
  block,
  compact = false,
}: {
  block: CheatSheetBlock;
  compact?: boolean;
}) {
  if (block.kind === "tip") {
    return <TipBlock block={block} compact={compact} />;
  }
  if (block.kind === "formula") {
    return <FormulaBlock block={block} compact={compact} />;
  }
  if (block.kind === "example") {
    return <ExampleBlock block={block} compact={compact} />;
  }
  if (block.kind === "bullets" || block.kind === "steps") {
    return <ChecklistBlock block={block} compact={compact} />;
  }
  if (block.kind === "table") {
    return <TableBlock block={block} compact={compact} />;
  }
  return <DefinitionBlock block={block} compact={compact} />;
}

function TipBlock({ block, compact }: { block: CheatSheetBlock; compact: boolean }) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-accent/35 bg-accent/10 transition-all",
        compact ? "p-3" : "p-4",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
          {block.title || "Interview Tip"}
        </p>
      </div>
      <p className={cn("mt-2 text-foreground font-medium leading-relaxed", compact ? "text-xs" : "text-sm")}>
        {block.body}
      </p>
    </div>
  );
}

function FormulaBlock({ block, compact }: { block: CheatSheetBlock; compact: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(block.body);
    setCopied(true);
    toast.success("Formula copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <BlockLabel>{block.title || "Formula"}</BlockLabel>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:bg-steel-800 hover:text-foreground transition-colors"
          title="Copy formula"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="relative group">
        <pre
          className={cn(
            "overflow-x-auto rounded-xl border border-steel-800/90 bg-steel-950/80 font-mono text-foreground/95 shadow-2xs transition-colors group-hover:border-steel-700/80",
            compact ? "p-2.5 text-xs leading-5" : "p-3.5 text-xs sm:text-[13px] leading-6",
          )}
        >
          <code>{block.body}</code>
        </pre>
      </div>
    </div>
  );
}

function ExampleBlock({ block, compact }: { block: CheatSheetBlock; compact: boolean }) {
  return (
    <div className="space-y-1.5">
      <BlockLabel>{block.title || "Example"}</BlockLabel>
      <div
        className={cn(
          "rounded-xl border border-steel-800/80 bg-steel-950/50 font-mono text-foreground/90",
          compact ? "p-2.5 text-xs leading-5" : "p-3.5 text-xs sm:text-[13px] leading-6",
        )}
      >
        {block.body}
      </div>
    </div>
  );
}

function ChecklistBlock({ block, compact }: { block: CheatSheetBlock; compact: boolean }) {
  const items = asStringList(block.items);
  const isSteps = block.kind === "steps";
  const [checkedState, setCheckedState] = useState<Record<number, boolean>>({});

  const toggleCheck = (index: number) => {
    setCheckedState((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <BlockLabel>{block.title || (isSteps ? "Execution Steps" : "Key Checklist")}</BlockLabel>
        {items.length > 0 ? (
          <span className="text-[10px] text-muted-foreground">Click item to mark reviewed</span>
        ) : null}
      </div>
      <ul className={cn("space-y-1.5", compact ? "text-xs" : "text-sm")}>
        {items.map((item, index) => {
          const isChecked = Boolean(checkedState[index]);
          return (
            <li
              key={item}
              onClick={() => toggleCheck(index)}
              className={cn(
                "group flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition-all select-none",
                isChecked
                  ? "border-emerald-500/30 bg-emerald-500/5 text-muted-foreground line-through opacity-80"
                  : "border-steel-800/70 bg-steel-950/30 text-foreground hover:border-steel-700 hover:bg-steel-900/60",
              )}
            >
              <button
                type="button"
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground group-hover:text-foreground"
                aria-label={isChecked ? "Mark unreviewed" : "Mark reviewed"}
              >
                {isChecked ? (
                  <CheckSquare className="h-4 w-4 text-emerald-400" />
                ) : isSteps ? (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-steel-800 text-[10px] font-bold tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                ) : (
                  <Square className="h-4 w-4 text-steel-500 group-hover:text-steel-300" />
                )}
              </button>
              <span className="flex-1 leading-relaxed">{item}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TableBlock({ block, compact }: { block: CheatSheetBlock; compact: boolean }) {
  const table = asTable(block.items);
  if (!table) return null;

  return (
    <div className="space-y-1.5">
      {block.title ? <BlockLabel>{block.title}</BlockLabel> : null}
      <div className="overflow-x-auto rounded-xl border border-steel-800/90 shadow-2xs">
        <table className={cn("w-full text-left", compact ? "text-xs" : "text-xs sm:text-[13px]")}>
          <thead className="border-b border-steel-800/90 bg-steel-950/90 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              {table.headers.map((header) => (
                <th key={header} className="px-3.5 py-2.5 font-bold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-800/60 bg-steel-900/40">
            {table.rows.map((row, rIdx) => (
              <tr
                key={row.join("|") + rIdx}
                className="transition-colors hover:bg-steel-800/40"
              >
                {row.map((cell, cIdx) => (
                  <td key={`${cell}-${cIdx}`} className="px-3.5 py-2.5 align-top leading-relaxed text-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DefinitionBlock({ block, compact }: { block: CheatSheetBlock; compact: boolean }) {
  return (
    <div className="space-y-1.5">
      <BlockLabel>{block.title || (block.kind === "rule" ? "Golden Rule" : "Definition")}</BlockLabel>
      <div
        className={cn(
          "rounded-xl border border-steel-800/80 bg-steel-950/40 leading-relaxed text-foreground font-medium",
          compact ? "p-3 text-xs" : "p-4 text-sm",
        )}
      >
        {block.body}
      </div>
    </div>
  );
}

function BlockLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}
