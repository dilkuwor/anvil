import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Shared SVG building blocks so every visualizer reads as one system. */

export const VIZ_COLORS = {
  ink: "var(--foreground)",
  muted: "var(--muted-foreground)",
  line: "var(--steel-700)",
  panel: "var(--steel-900)",
  accent: "var(--accent)",
  coral: "var(--coral)",
  teal: "var(--teal)",
} as const;

export function Frame({ width, height, children, label }: { width: number; height: number; children: ReactNode; label: string }) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className="viz-frame h-auto w-full max-w-full select-none"
      style={{ maxHeight: 320 }}
    >
      {children}
    </svg>
  );
}

export type CellTone = "idle" | "window" | "edge" | "hit" | "miss" | "done" | "faded";

const CELL_FILL: Record<CellTone, string> = {
  idle: "transparent",
  window: "color-mix(in srgb, var(--accent) 18%, transparent)",
  edge: "color-mix(in srgb, var(--accent) 45%, transparent)",
  hit: "color-mix(in srgb, var(--teal) 30%, transparent)",
  miss: "color-mix(in srgb, var(--coral) 28%, transparent)",
  done: "color-mix(in srgb, var(--teal) 45%, transparent)",
  faded: "transparent",
};

const CELL_STROKE: Record<CellTone, string> = {
  idle: VIZ_COLORS.line,
  window: VIZ_COLORS.accent,
  edge: VIZ_COLORS.accent,
  hit: VIZ_COLORS.teal,
  miss: VIZ_COLORS.coral,
  done: VIZ_COLORS.teal,
  faded: VIZ_COLORS.line,
};

export function Cell({
  x,
  y,
  size = 36,
  value,
  tone = "idle",
  caption,
}: {
  x: number;
  y: number;
  size?: number;
  value: string | number;
  tone?: CellTone;
  caption?: string;
}) {
  return (
    <g className="viz-cell" style={{ transition: "opacity 200ms" }} opacity={tone === "faded" ? 0.35 : 1}>
      <rect x={x} y={y} width={size} height={size} rx={7} fill={CELL_FILL[tone]} stroke={CELL_STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1 : 1.75} />
      <text x={x + size / 2} y={y + size / 2 + 5} textAnchor="middle" fontSize={14} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
        {value}
      </text>
      {caption ? (
        <text x={x + size / 2} y={y + size + 14} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
          {caption}
        </text>
      ) : null}
    </g>
  );
}

export function Pointer({ x, y, label, tone = "accent" }: { x: number; y: number; label: string; tone?: "accent" | "coral" | "teal" }) {
  const color = tone === "coral" ? VIZ_COLORS.coral : tone === "teal" ? VIZ_COLORS.teal : VIZ_COLORS.accent;
  return (
    <g style={{ transition: "transform 220ms ease-out" }} transform={`translate(${x}, ${y})`}>
      <path d="M0 0 L-5 -8 L5 -8 Z" fill={color} />
      <text x={0} y={-12} textAnchor="middle" fontSize={11} fontWeight={600} fill={color} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
        {label}
      </text>
    </g>
  );
}

export function Label({ x, y, children, tone = "muted", anchor = "start", size = 11, weight = 500 }: { x: number; y: number; children: ReactNode; tone?: "muted" | "ink" | "accent" | "coral" | "teal"; anchor?: "start" | "middle" | "end"; size?: number; weight?: number }) {
  const color = tone === "ink" ? VIZ_COLORS.ink : tone === "accent" ? VIZ_COLORS.accent : tone === "coral" ? VIZ_COLORS.coral : tone === "teal" ? VIZ_COLORS.teal : VIZ_COLORS.muted;
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={color}>
      {children}
    </text>
  );
}

export function Box({ x, y, width, height, title, tone = "idle", children }: { x: number; y: number; width: number; height: number; title: string; tone?: "idle" | "active" | "hot" | "ok"; children?: ReactNode }) {
  const stroke = tone === "active" ? VIZ_COLORS.accent : tone === "hot" ? VIZ_COLORS.coral : tone === "ok" ? VIZ_COLORS.teal : VIZ_COLORS.line;
  const fill = tone === "active" ? "color-mix(in srgb, var(--accent) 10%, transparent)" : tone === "hot" ? "color-mix(in srgb, var(--coral) 12%, transparent)" : tone === "ok" ? "color-mix(in srgb, var(--teal) 12%, transparent)" : "transparent";
  return (
    <g style={{ transition: "all 200ms" }}>
      <rect x={x} y={y} width={width} height={height} rx={10} fill={fill} stroke={stroke} strokeWidth={tone === "idle" ? 1 : 1.75} />
      <text x={x + 10} y={y + 17} fontSize={11} fontWeight={600} fill={VIZ_COLORS.ink} letterSpacing={0.6}>
        {title.toUpperCase()}
      </text>
      {children}
    </g>
  );
}

export function Edge({ from, to, tone = "idle", dashed = false }: { from: [number, number]; to: [number, number]; tone?: "idle" | "active" | "hot" | "ok"; dashed?: boolean }) {
  const stroke = tone === "active" ? VIZ_COLORS.accent : tone === "hot" ? VIZ_COLORS.coral : tone === "ok" ? VIZ_COLORS.teal : VIZ_COLORS.line;
  return (
    <line
      x1={from[0]}
      y1={from[1]}
      x2={to[0]}
      y2={to[1]}
      stroke={stroke}
      strokeWidth={tone === "idle" ? 1.25 : 2.25}
      strokeDasharray={dashed ? "4 4" : undefined}
      markerEnd={tone === "idle" ? undefined : "url(#viz-arrow)"}
      style={{ transition: "stroke 200ms" }}
    />
  );
}

export function ArrowDefs() {
  return (
    <defs>
      <marker id="viz-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 Z" fill="currentColor" style={{ color: VIZ_COLORS.accent }} />
      </marker>
    </defs>
  );
}

export function Legend({ items }: { items: { tone: CellTone | "accent" | "coral" | "teal"; label: string }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className={cn("inline-block h-2.5 w-2.5 rounded-sm border")}
            style={{
              background:
                item.tone === "accent" || item.tone === "window" || item.tone === "edge"
                  ? "color-mix(in srgb, var(--accent) 35%, transparent)"
                  : item.tone === "coral" || item.tone === "miss"
                    ? "color-mix(in srgb, var(--coral) 35%, transparent)"
                    : item.tone === "teal" || item.tone === "hit" || item.tone === "done"
                      ? "color-mix(in srgb, var(--teal) 35%, transparent)"
                      : "transparent",
              borderColor:
                item.tone === "accent" || item.tone === "window" || item.tone === "edge"
                  ? "var(--accent)"
                  : item.tone === "coral" || item.tone === "miss"
                    ? "var(--coral)"
                    : item.tone === "teal" || item.tone === "hit" || item.tone === "done"
                      ? "var(--teal)"
                      : "var(--steel-700)",
            }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
