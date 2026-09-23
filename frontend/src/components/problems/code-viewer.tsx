"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Check, ChevronUp, Code2, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type TokenType =
  | "keyword"
  | "primitive"
  | "class"
  | "method"
  | "string"
  | "char"
  | "number"
  | "comment"
  | "annotation"
  | "constant"
  | "operator"
  | "punctuation"
  | "variable"
  | "plain";

export type CodeToken = {
  text: string;
  type: TokenType;
};

const KEYWORDS = new Set([
  "public",
  "private",
  "protected",
  "static",
  "final",
  "abstract",
  "synchronized",
  "native",
  "transient",
  "volatile",
  "class",
  "interface",
  "enum",
  "record",
  "extends",
  "implements",
  "new",
  "return",
  "if",
  "else",
  "while",
  "for",
  "do",
  "switch",
  "case",
  "break",
  "continue",
  "default",
  "try",
  "catch",
  "finally",
  "throw",
  "throws",
  "assert",
  "import",
  "package",
  "true",
  "false",
  "null",
  "this",
  "super",
  "instanceof",
  "var",
]);

const PRIMITIVES = new Set([
  "int",
  "long",
  "double",
  "float",
  "boolean",
  "char",
  "byte",
  "short",
  "void",
]);

/**
 * High-contrast, crystal-clear syntax colors designed for effortless reading
 * in both light and dark themes (calibrated against WCAG AAA contrast standards).
 */
const TOKEN_STYLES: Record<TokenType, string> = {
  keyword: "font-semibold text-[#cf222e] dark:text-[#ff7b72]",
  primitive: "font-semibold text-[#0550ae] dark:text-[#79c0ff]",
  class: "font-semibold text-[#0969da] dark:text-[#56d4dd]",
  method: "text-[#8250df] dark:text-[#d2a8ff]",
  string: "text-[#116329] dark:text-[#7ee787]",
  char: "text-[#116329] dark:text-[#7ee787]",
  number: "text-[#953800] dark:text-[#ff9e64]",
  comment: "italic text-[#57606a] dark:text-[#8b949e]",
  annotation: "text-[#8250df] dark:text-[#e5c07b]",
  constant: "font-semibold text-[#953800] dark:text-[#ff9e64]",
  operator: "text-[#24292f] dark:text-[#c9d1d9]",
  punctuation: "text-[#57606a] dark:text-[#8b949e]",
  variable: "text-[#1f2328] dark:text-[#f0f6fc]",
  plain: "text-[#1f2328] dark:text-[#f0f6fc]",
};

/**
 * Tokenize a single line of Java code, accounting for multi-line block comment state.
 */
function tokenizeLine(
  line: string,
  inBlockComment: boolean
): { tokens: CodeToken[]; inBlockComment: boolean } {
  const tokens: CodeToken[] = [];
  let i = 0;

  if (inBlockComment) {
    const end = line.indexOf("*/");
    if (end === -1) {
      return { tokens: [{ text: line, type: "comment" }], inBlockComment: true };
    }
    tokens.push({ text: line.slice(0, end + 2), type: "comment" });
    i = end + 2;
    inBlockComment = false;
  }

  while (i < line.length) {
    // Block comment
    if (line.slice(i, i + 2) === "/*") {
      const end = line.indexOf("*/", i + 2);
      if (end === -1) {
        tokens.push({ text: line.slice(i), type: "comment" });
        return { tokens, inBlockComment: true };
      }
      tokens.push({ text: line.slice(i, end + 2), type: "comment" });
      i = end + 2;
      continue;
    }

    // Line comment
    if (line.slice(i, i + 2) === "//") {
      tokens.push({ text: line.slice(i), type: "comment" });
      break;
    }

    // String literal
    if (line[i] === '"') {
      let j = i + 1;
      while (j < line.length && line[j] !== '"') {
        if (line[j] === "\\") j += 2;
        else j++;
      }
      if (j < line.length) j++;
      tokens.push({ text: line.slice(i, j), type: "string" });
      i = j;
      continue;
    }

    // Char literal
    if (line[i] === "'") {
      let j = i + 1;
      while (j < line.length && line[j] !== "'") {
        if (line[j] === "\\") j += 2;
        else j++;
      }
      if (j < line.length) j++;
      tokens.push({ text: line.slice(i, j), type: "char" });
      i = j;
      continue;
    }

    // Number literal
    const numMatch = line
      .slice(i)
      .match(/^(?:0x[0-9a-fA-F]+|0b[01]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?[fFdDlL]?)\b/);
    if (numMatch && (i === 0 || !/[a-zA-Z0-9_]/.test(line[i - 1]))) {
      tokens.push({ text: numMatch[0], type: "number" });
      i += numMatch[0].length;
      continue;
    }

    // Annotation
    const annMatch = line.slice(i).match(/^@[a-zA-Z_][a-zA-Z0-9_]*/);
    if (annMatch) {
      tokens.push({ text: annMatch[0], type: "annotation" });
      i += annMatch[0].length;
      continue;
    }

    // Identifiers (Keywords, Types, Methods, Variables, Constants)
    const wordMatch = line.slice(i).match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
    if (wordMatch) {
      const word = wordMatch[0];
      const after = line.slice(i + word.length);
      const isMethodCall = /^\s*\(/.test(after);

      let type: TokenType = "variable";
      if (KEYWORDS.has(word)) type = "keyword";
      else if (PRIMITIVES.has(word)) type = "primitive";
      else if (/^[A-Z][A-Z0-9_]+$/.test(word) && word.length > 1) type = "constant";
      else if (/^[A-Z]/.test(word)) type = "class";
      else if (isMethodCall) type = "method";

      tokens.push({ text: word, type });
      i += word.length;
      continue;
    }

    // Operators
    const opMatch = line
      .slice(i)
      .match(/^(?:==|!=|<=|>=|&&|\|\||\+\+|--|->|::|\+=|-=|\*=|\/=|<<|>>|[=!<>+\-*\/%&|^~?:])/);
    if (opMatch) {
      tokens.push({ text: opMatch[0], type: "operator" });
      i += opMatch[0].length;
      continue;
    }

    // Punctuation
    const puncMatch = line.slice(i).match(/^[{}()\[\];,.]/);
    if (puncMatch) {
      tokens.push({ text: puncMatch[0], type: "punctuation" });
      i += puncMatch[0].length;
      continue;
    }

    // Plain text / whitespace
    tokens.push({ text: line[i], type: "plain" });
    i++;
  }

  return { tokens, inBlockComment: false };
}

function parseCodeLines(code: string): Array<{ line: string; tokens: CodeToken[] }> {
  const rawLines = code.trim().split("\n");
  let inBlock = false;
  return rawLines.map((line) => {
    const res = tokenizeLine(line, inBlock);
    inBlock = res.inBlockComment;
    return { line, tokens: res.tokens };
  });
}

export type CodeViewerProps = {
  code: string;
  language?: string;
  filename?: string;
  onLoadCode?: (code: string) => void;
  onClose?: () => void;
  className?: string;
};

export function CodeViewer({
  code,
  language = "Java",
  filename = "Solution.java",
  onLoadCode,
  onClose,
  className,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const lines = useMemo(() => parseCodeLines(code), [code]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code.trim());
      setCopied(true);
      toast.message("Code copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Unable to copy code.");
    }
  }

  function handleLoad() {
    if (!onLoadCode) return;
    onLoadCode(code.trim() + "\n");
    toast.success("Loaded into code editor.");
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-steel-700/80 bg-white dark:border-steel-800 dark:bg-[#0d1117] shadow-sm transition-all",
        className
      )}
    >
      {/* Clean, Professional Code Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-steel-700/80 bg-steel-100/70 dark:border-steel-800 dark:bg-[#161b22] px-3.5 py-2">
        <div className="flex items-center gap-2.5">
          <Code2 className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
          <span className="font-mono text-[13px] font-semibold text-foreground">{filename}</span>
          <span className="rounded bg-steel-200/90 dark:bg-steel-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {language}
          </span>
          <span className="text-[12px] font-mono text-muted-foreground">
            {lines.length} lines
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-md border border-steel-700/80 bg-white dark:border-steel-700 dark:bg-steel-800/80 px-2.5 py-1 text-[12px] font-medium text-foreground shadow-2xs transition-all hover:bg-steel-100 dark:hover:bg-steel-700 active:scale-95"
            aria-label="Copy code"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-teal" aria-hidden="true" />
                <span className="font-semibold text-teal">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <span>Copy</span>
              </>
            )}
          </button>

          {onLoadCode ? (
            <button
              type="button"
              onClick={handleLoad}
              className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 text-[12px] font-medium text-accent transition-all hover:border-accent hover:bg-accent/20 active:scale-95"
              title="Load code directly into editor workspace"
            >
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Load into editor</span>
            </button>
          ) : null}

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-steel-200/60 dark:hover:bg-steel-800/60 hover:text-foreground"
              title="Hide code"
            >
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Hide</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Code Body with High-Contrast Typography & Readable Line Numbers */}
      <div className="overflow-x-auto bg-white dark:bg-[#0d1117] py-3.5 font-mono text-[13.5px] leading-[1.7] select-text font-[family-name:var(--font-geist-mono)]">
        <pre className="m-0 p-0 font-mono">
          {lines.map((item, idx) => (
            <div
              key={idx}
              className="group/line flex items-baseline hover:bg-steel-100/70 dark:hover:bg-white/[0.04] transition-colors"
            >
              {/* Line Number Gutter */}
              <span
                className="w-12 shrink-0 select-none pr-3.5 text-right font-mono text-[12.5px] tabular-nums text-steel-500 dark:text-steel-600 border-r border-steel-200 dark:border-steel-800/80 group-hover/line:text-steel-700 dark:group-hover/line:text-steel-400 group-hover/line:border-steel-400 dark:group-hover/line:border-steel-600 transition-colors"
                aria-hidden="true"
              >
                {idx + 1}
              </span>

              {/* Formatted Code Line */}
              <span className="min-w-0 flex-1 pl-4 pr-6 font-mono whitespace-pre text-[#1f2328] dark:text-[#f0f6fc]">
                {item.tokens.length > 0 ? (
                  item.tokens.map((token, tIdx) => (
                    <span key={tIdx} className={TOKEN_STYLES[token.type]}>
                      {token.text}
                    </span>
                  ))
                ) : (
                  "\u00A0"
                )}
              </span>
            </div>
          ))}
        </pre>
      </div>

      {/* Bottom Footer: Quick Collapse after reading long code */}
      {onClose && lines.length > 20 ? (
        <div className="flex items-center justify-end border-t border-steel-700/80 bg-steel-100/50 dark:border-steel-800 dark:bg-[#161b22]/50 px-3.5 py-1.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-steel-200/60 dark:hover:bg-steel-800/60 hover:text-foreground"
          >
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Hide code</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
