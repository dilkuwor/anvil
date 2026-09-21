import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** One box (or short word) in a row. */

export type GrokCell = {
  value: string;
  tone?: CellTone;
  /** Small index or extra label under the box. */
  caption?: string;
  /** Marker above the box (lo, head, cheapest…). */
  tag?: string;
  tagTone?: "accent" | "teal" | "coral";
};

export type GrokNote = {
  key: string;
  value: string;
  tone?: CellTone;
};

export type GrokNotebookState = {
  rows: { label?: string; cells: GrokCell[] }[];
  /** Hash-map / set pages drawn as key → value chips. */
  notebooks?: { title: string; entries: GrokNote[] }[] | null;
  /** Arc from a box to the notebook page it looks up or writes. */
  arc?: { row: number; col: number; notebook: number; entry: number; tone?: "hit" | "miss" } | null;
  band?: { row: number; from: number; to: number } | null;
  /** Wrong seat, drawn with a coral mark. */
  ghost?: { row: number; col: number; label: string } | null;
  banner?: { text: string; tone?: "coral" | "teal" } | null;
  /** Extra lists (buckets, groups) under the notebook. */
  shelves?: { title: string; items: { text: string; tone?: CellTone }[] }[] | null;
  counter?: { label: string; value: string | number } | null;
  /** When true, notebook chips are clickable after the boxes. */
  notePicks?: boolean;
};

const WIDTH = 560;
const BOX = 42;
const GAP = 8;
const NOTE_H = 30;

const FILL: Record<CellTone, string> = {
  idle: "transparent",
  window: "color-mix(in srgb, var(--accent) 18%, transparent)",
  edge: "color-mix(in srgb, var(--accent) 42%, transparent)",
  hit: "color-mix(in srgb, var(--teal) 28%, transparent)",
  miss: "color-mix(in srgb, var(--coral) 28%, transparent)",
  done: "color-mix(in srgb, var(--teal) 45%, transparent)",
  faded: "transparent",
};

const STROKE: Record<CellTone, string> = {
  idle: VIZ_COLORS.line,
  window: VIZ_COLORS.accent,
  edge: VIZ_COLORS.accent,
  hit: VIZ_COLORS.teal,
  miss: VIZ_COLORS.coral,
  done: VIZ_COLORS.teal,
  faded: VIZ_COLORS.line,
};

const TAG: Record<"accent" | "teal" | "coral", string> = {
  accent: VIZ_COLORS.accent,
  teal: VIZ_COLORS.teal,
  coral: VIZ_COLORS.coral,
};

function cellWidth(value: string): number {
  return Math.min(88, Math.max(BOX, value.length * 8 + 16));
}

type BoxLayout = { x: number; y: number; w: number; h: number; cx: number; cy: number };

function layoutRow(cells: GrokCell[], y: number): BoxLayout[] {
  const widths = cells.map((cell) => cellWidth(cell.value || " "));
  const n = Math.max(widths.length, 1);
  const total = widths.reduce((sum, w) => sum + w, 0) + GAP * Math.max(n - 1, 0);
  const scale = total > WIDTH - 28 ? (WIDTH - 28) / total : 1;
  let x = (WIDTH - total * scale) / 2;
  return widths.map((w) => {
    const box: BoxLayout = { x, y, w: w * scale, h: BOX, cx: x + (w * scale) / 2, cy: y + BOX / 2 };
    x += w * scale + GAP * scale;
    return box;
  });
}

function layoutNotes(entries: GrokNote[], left: number, width: number, y: number): BoxLayout[] {
  if (entries.length === 0) return [];
  const widths = entries.map((entry) => Math.min(120, Math.max(52, (entry.key.length + entry.value.length) * 7 + 28)));
  const gap = 6;
  const total = widths.reduce((sum, w) => sum + w, 0) + gap * (widths.length - 1);
  const scale = total > width - 8 ? (width - 8) / total : 1;
  let x = left + Math.max(4, (width - total * scale) / 2);
  return widths.map((w) => {
    const box: BoxLayout = { x, y, w: w * scale, h: NOTE_H, cx: x + (w * scale) / 2, cy: y + NOTE_H / 2 };
    x += w * scale + gap * scale;
    return box;
  });
}

export function GrokNotebookView({ state, pick }: { state: GrokNotebookState; pick?: CellPick }) {
  const rows = state.rows;
  const notebooks = state.notebooks ?? null;
  const shelves = state.shelves ?? null;

  const rowY: number[] = [];
  let y = state.counter || state.banner ? 36 : 28;
  for (const row of rows) {
    if (row.label) y += 14;
    rowY.push(y);
    y += BOX + 28;
  }
  const arcPad = state.arc || state.ghost ? 28 : 12;
  y += notebooks ? arcPad : 4;
  const noteTop = y;
  const noteCount = notebooks?.length ?? 0;
  if (notebooks) y += 22 + NOTE_H + 10;
  const shelfTop = y;
  if (shelves && shelves.length) y += 18 + shelves.length * 28;
  const height = Math.min(300, Math.max(150, y + 16));

  const rowBoxes = rows.map((row, r) => layoutRow(row.cells, rowY[r] ?? 28));
  const noteWidth = noteCount > 1 ? (WIDTH - 36) / noteCount : WIDTH - 24;
  const noteBoxes =
    notebooks?.map((book, b) => {
      const left = noteCount > 1 ? 12 + b * (noteWidth + 12) : 12;
      return layoutNotes(book.entries, left, noteWidth, noteTop + 18);
    }) ?? [];

  type Hit = { index: number; box: BoxLayout; label: string };
  const hits: Hit[] = [];
  let index = 0;
  rows.forEach((row, r) => {
    row.cells.forEach((cell, c) => {
      const box = rowBoxes[r]?.[c];
      if (box) hits.push({ index, box, label: `Choose box ${cell.value}` });
      index += 1;
    });
  });
  if (state.notePicks) {
    notebooks?.forEach((book, b) => {
      book.entries.forEach((entry, e) => {
        const box = noteBoxes[b]?.[e];
        if (box) hits.push({ index, box, label: `Choose notebook ${entry.key}` });
        index += 1;
      });
    });
  }

  const arc = state.arc;
  const fromBox = arc ? rowBoxes[arc.row]?.[arc.col] : undefined;
  const toBox = arc ? noteBoxes[arc.notebook]?.[arc.entry] : undefined;
  const arcColor = arc?.tone === "miss" ? VIZ_COLORS.coral : VIZ_COLORS.teal;

  return (
    <Frame width={WIDTH} height={height} label="A row of boxes and a notebook of key to value pairs">
      {state.counter ? (
        <Label x={16} y={20} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.banner ? (
        <Label x={WIDTH - 16} y={20} size={13} weight={700} tone={state.banner.tone ?? "coral"} anchor="end">
          {state.banner.text}
        </Label>
      ) : null}

      {rows.map((row, r) => {
        const boxes = rowBoxes[r] ?? [];
        const band = state.band?.row === r ? state.band : null;
        const first = band ? boxes[band.from] : undefined;
        const last = band ? boxes[band.to] : undefined;
        return (
          <g key={`row-${r}`}>
            {row.label ? (
              <Label x={16} y={(rowY[r] ?? 28) - 8} size={12} weight={600}>
                {row.label}
              </Label>
            ) : null}
            {first && last ? (
              <rect
                className={GLIDE}
                x={first.x - 5}
                y={first.y - 5}
                width={last.x + last.w - first.x + 10}
                height={BOX + 10}
                rx={12}
                fill="color-mix(in srgb, var(--accent) 12%, transparent)"
                stroke={VIZ_COLORS.accent}
                strokeOpacity={0.4}
              />
            ) : null}
            {row.cells.map((cell, c) => {
              const box = boxes[c];
              if (!box) return null;
              const tone = pickTone(pick, hits.find((hit) => hit.box === box)?.index ?? c, cell.tone ?? "idle");
              const ghost = state.ghost && state.ghost.row === r && state.ghost.col === c;
              return (
                <g key={`cell-${r}-${c}`} className={GLIDE} opacity={tone === "faded" ? 0.35 : 1}>
                  {cell.tag ? (
                    <text x={box.cx} y={box.y - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={TAG[cell.tagTone ?? "accent"]}>
                      {cell.tag}
                    </text>
                  ) : null}
                  <rect
                    x={box.x}
                    y={box.y}
                    width={box.w}
                    height={box.h}
                    rx={8}
                    fill={FILL[tone]}
                    stroke={ghost ? VIZ_COLORS.coral : STROKE[tone]}
                    strokeWidth={tone === "idle" || tone === "faded" ? 1 : 1.75}
                    strokeDasharray={ghost ? "5 4" : undefined}
                  />
                  <text
                    x={box.cx}
                    y={box.y + box.h / 2 + 5}
                    textAnchor="middle"
                    fontSize={box.w < 36 ? 11 : 14}
                    fontWeight={600}
                    fill={VIZ_COLORS.ink}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  >
                    {cell.value}
                  </text>
                  {cell.caption ? (
                    <text x={box.cx} y={box.y + box.h + 14} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
                      {cell.caption}
                    </text>
                  ) : null}
                  {ghost ? (
                    <text x={box.cx} y={box.y + box.h + 26} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
                      {state.ghost?.label}
                    </text>
                  ) : null}
                  <RejectedMark pick={pick} index={hits.find((hit) => hit.box === box)?.index ?? c} x={box.x + box.w - 8} y={box.y + 12} />
                </g>
              );
            })}
          </g>
        );
      })}

      {fromBox && toBox ? (
        <path
          className={GLIDE}
          d={`M${fromBox.cx} ${fromBox.y + fromBox.h + 2} Q${(fromBox.cx + toBox.cx) / 2} ${Math.min(fromBox.y + fromBox.h + 36, toBox.y - 4)} ${toBox.cx} ${toBox.y - 2}`}
          fill="none"
          stroke={arcColor}
          strokeWidth={2.25}
          strokeDasharray={arc?.tone === "miss" ? "5 4" : undefined}
        />
      ) : null}

      {notebooks?.map((book, b) => {
        const left = noteCount > 1 ? 12 + b * (noteWidth + 12) : 12;
        const boxes = noteBoxes[b] ?? [];
        return (
          <g key={`note-${b}`}>
            <rect
              x={left}
              y={noteTop}
              width={noteWidth}
              height={NOTE_H + 26}
              rx={10}
              fill="color-mix(in srgb, var(--steel-900) 55%, transparent)"
              stroke={VIZ_COLORS.line}
            />
            <Label x={left + 10} y={noteTop + 14} size={11} weight={700}>
              {book.title}
            </Label>
            {book.entries.length === 0 ? (
              <Label x={left + 10} y={noteTop + 36} size={12}>
                (empty)
              </Label>
            ) : null}
            {book.entries.map((entry, e) => {
              const box = boxes[e];
              if (!box) return null;
              const tone = entry.tone ?? "idle";
              return (
                <g key={`entry-${b}-${e}`} className={GLIDE}>
                  <rect
                    x={box.x}
                    y={box.y}
                    width={box.w}
                    height={box.h}
                    rx={7}
                    fill={FILL[tone]}
                    stroke={STROKE[tone]}
                    strokeWidth={tone === "idle" ? 1 : 1.75}
                  />
                  <text
                    x={box.cx}
                    y={box.y + 20}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill={VIZ_COLORS.ink}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  >
                    {entry.key} → {entry.value}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}

      {shelves?.map((shelf, s) => (
        <g key={`shelf-${s}`}>
          <Label x={16} y={shelfTop + 14 + s * 28} size={12} weight={600}>
            {shelf.title}
          </Label>
          {shelf.items.map((item, i) => (
            <g key={`item-${s}-${i}`} className={GLIDE}>
              <rect
                x={100 + i * 72}
                y={shelfTop + s * 28}
                width={64}
                height={22}
                rx={6}
                fill={FILL[item.tone ?? "idle"]}
                stroke={STROKE[item.tone ?? "idle"]}
              />
              <text x={132 + i * 72} y={shelfTop + 16 + s * 28} textAnchor="middle" fontSize={12} fontWeight={600} fill={VIZ_COLORS.ink}>
                {item.text}
              </text>
            </g>
          ))}
        </g>
      ))}

      {hits.map((hit) => (
        <PickTarget
          key={`pick-${hit.index}`}
          pick={pick}
          index={hit.index}
          x={hit.box.x - 2}
          y={hit.box.y - 4}
          width={hit.box.w + 4}
          height={hit.box.h + 20}
          label={hit.label}
        />
      ))}
    </Frame>
  );
}
