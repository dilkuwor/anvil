import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick, StoryQuiz } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Shared picture for the "path of choices" stories (choose, explore, un-choose).
 * A walker on a branching path carries a bag. The picture shows the forks found so far,
 * the walker's path, the bag, and the notebook of answers. It draws state only.
 * Positions come from the shape of the whole tree, never from typed coordinates.
 */

export type ChoiceNode = {
  /** Order of discovery. Also the node's cell index for click questions. */
  id: number;
  parent: number | null;
  depth: number;
  /** The item picked at this fork, printed in the circle. */
  text: string;
  kids: number[];
};

export type ChoiceLook = {
  /** accent = on the walker's path, teal = written down, coral = trap, faded = skipped. */
  tone: CellTone;
  /** A fork that has been seen but not walked yet. */
  dotted: boolean;
  /** A small cross inside a fork that was ruled out. */
  crossed: boolean;
};

export type ChoiceChip = { text: string; tone: CellTone; note?: string };

export type ChoiceStrip = { label: string; items: ChoiceChip[] };

export type ChoiceTreeState = {
  /** The whole tree of this run, so the layout never shifts while it grows. */
  nodes: ChoiceNode[];
  /** One per node, by id. `null` = not found yet, so not drawn. */
  looks: (ChoiceLook | null)[];
  /** The walker's path from the start, as node ids. Empty hides the walker. */
  path: number[];
  /** One short reason under one fork, e.g. "too heavy". Only ever one at a time, so labels never collide. */
  reason: { id: number; text: string; tone: "coral" | "muted" | "teal" } | null;
  /** The items to choose from. */
  shelf: ChoiceStrip | null;
  bag: ChoiceChip[];
  /** The item that was just taken out of the bag, drawn outside it. */
  leaving: string | null;
  notebook: ChoiceStrip;
  /** Plain rows of boxes, drawn where the tree goes, for scenes that have no tree. */
  rows: ChoiceStrip[];
  counter: { label: string; value: number } | null;
  note: { text: string; tone: "accent" | "teal" | "coral" } | null;
};

export const CHOICE_WIDTH = 560;
const MARGIN = 20;
const TOP = 50;
const ROW_STEP = 36;
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

function deepestOf(nodes: ChoiceNode[]): number {
  return Math.max(1, ...nodes.map((node) => node.depth));
}

function levelGap(nodes: ChoiceNode[]): number {
  return Math.min(46, 184 / deepestOf(nodes));
}

function leafCount(nodes: ChoiceNode[]): number {
  return Math.max(1, nodes.filter((node) => node.kids.length === 0).length);
}

function radiusOf(nodes: ChoiceNode[]): number {
  return (CHOICE_WIDTH - 2 * MARGIN) / leafCount(nodes) < 38 ? 11 : 13;
}

/** Leaves take equal slots left to right; a fork sits over the middle of its branches; depth gives y. */
export function layoutChoices(nodes: ChoiceNode[]): { x: number; y: number }[] {
  const spots = nodes.map(() => ({ x: CHOICE_WIDTH / 2, y: TOP }));
  if (nodes.length === 0) return spots;
  const slot = Math.min(84, (CHOICE_WIDTH - 2 * MARGIN) / leafCount(nodes));
  const start = (CHOICE_WIDTH - slot * leafCount(nodes)) / 2;
  const gap = levelGap(nodes);
  let leaf = 0;
  const place = (id: number) => {
    const node = nodes[id];
    node.kids.forEach(place);
    const x = node.kids.length === 0 ? start + slot * (leaf++ + 0.5) : (spots[node.kids[0]].x + spots[node.kids[node.kids.length - 1]].x) / 2;
    spots[id] = { x, y: TOP + node.depth * gap };
  };
  place(0);
  return spots;
}

export function chipWidth(text: string): number {
  return Math.max(30, text.length * 7.4 + 14);
}

/** "[1,2]" for the bag's items. */
export function listText(items: (string | number)[]): string {
  return `[${items.join(",")}]`;
}

/** "9", "9 and 20", "1, 0 and 8". */
export function wordList(values: (number | string)[]): string {
  if (values.length <= 1) return values.map(String).join("");
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

/** "[1,2]", or "empty" for a bag with nothing in it. */
export function bagWords(bag: string): string {
  return bag === "[]" || bag === "" ? "empty" : bag;
}

/** "Three forks leave", "One fork leaves". */
export function countWords(n: number, one: string, many: string): string {
  const words = ["No", "One", "Two", "Three", "Four", "Five"];
  return `${words[n] ?? n} ${n === 1 ? one : many}`;
}

/** The family's first question: the un-choose step. `after`, `now` and `empty` are the bag as the story prints it. */
export function stepBackQuiz(after: string, now: string, empty: string): StoryQuiz {
  const options = [after, now, empty].filter((option, index, all) => all.indexOf(option) === index);
  return {
    kind: "choice",
    question: "The walker steps back one spot. What is in the bag after that?",
    options: options.map((option) => (option === empty ? `${empty === "" ? "nothing" : empty} (an empty bag)` : option)),
    answer: 0,
    why: "Stepping back undoes only the last choice. The last item leaves the bag, and the rest stays.",
  };
}

/** The family's second question: click the fork the walker tries next. Exactly one fork is right. */
export function nextForkQuiz(state: ChoiceTreeState, here: number, next: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  state.nodes.forEach((node) => {
    const look = state.looks[node.id];
    if (!look || node.id === next) return;
    if (node.id === here) feedback[node.id] = "The walker is standing there. Pick a fork that leaves this spot.";
    else if (look.crossed) feedback[node.id] = "That fork is crossed out. The walker never takes it.";
    else if (node.parent === here) feedback[node.id] = look.dotted ? "Forks are tried from left to right. That one comes later." : "The walker has already been down that fork.";
    else if (look.dotted) feedback[node.id] = "That fork leaves an earlier spot. The walker first tries every fork that leaves the spot they stand on.";
  });
  return {
    kind: "cell",
    cells: state.nodes.length,
    question: "Which fork does the walker try next? Click it.",
    answer: next,
    feedback,
    otherwise: "That spot is finished. Look for a dotted fork that leaves the spot where the walker stands.",
    why: "The walker tries the forks of one spot from left to right, and this is the first one not walked yet.",
  };
}

/** The same picture with one fork marked as the place of a mistake: coral, with a short reason under it. */
export function trapPicture(state: ChoiceTreeState, id: number, reason: string, extra: Partial<ChoiceTreeState> = {}): ChoiceTreeState {
  const looks = state.looks.map((look, at) => (at === id ? { tone: "miss" as const, dotted: look?.dotted ?? false, crossed: false } : look));
  return { ...state, looks, leaving: null, reason: { id, text: reason, tone: "coral" }, ...extra };
}

type NodeFlags = { walked: boolean; written: boolean; skipped: boolean };

/**
 * The walker's world while a story runs its real algorithm. The story calls these moves from inside
 * its own recursion and takes a `snap()` whenever something changed.
 */
export class ChoiceWalk {
  readonly nodes: ChoiceNode[] = [{ id: 0, parent: null, depth: 0, text: "start", kids: [] }];
  private flags: NodeFlags[] = [{ walked: true, written: false, skipped: false }];
  path: number[] = [0];
  bag: string[] = [];
  leaving: string | null = null;
  written: string[] = [];
  private fresh = false;
  reason: ChoiceTreeState["reason"] = null;

  constructor(private readonly shelf: (walk: ChoiceWalk) => ChoiceStrip | null) {}

  get here(): number {
    return this.path[this.path.length - 1];
  }

  private settle() {
    this.leaving = null;
    this.fresh = false;
    this.reason = null;
  }

  /** The forks that leave the walker's spot, found all at once and not walked yet. */
  forks(texts: string[]): number[] {
    this.settle();
    return texts.map((text) => {
      const id = this.nodes.length;
      this.nodes.push({ id, parent: this.here, depth: this.nodes[this.here].depth + 1, text, kids: [] });
      this.nodes[this.here].kids.push(id);
      this.flags.push({ walked: false, written: false, skipped: false });
      return id;
    });
  }

  /** Choose: walk down one fork and put its item in the bag. */
  choose(id: number) {
    this.settle();
    this.flags[id].walked = true;
    this.path.push(id);
    this.bag.push(this.nodes[id].text);
  }

  /** Write a copy of the bag in the notebook. */
  write(line: string) {
    this.settle();
    this.written.push(line);
    this.flags[this.here].written = true;
    this.fresh = true;
  }

  /** Un-choose: step back one spot and take the last item out of the bag. */
  unchoose(): string {
    this.settle();
    this.path.pop();
    const item = this.bag.pop() ?? "";
    this.leaving = item;
    return item;
  }

  /** Forks that will never be walked, faded, with one short reason under the first of them. */
  skip(ids: number[], reason: string) {
    this.settle();
    for (const id of ids) this.flags[id].skipped = true;
    if (ids.length > 0) this.reason = { id: ids[0], text: reason, tone: "muted" };
  }

  snap(extra: Partial<ChoiceTreeState> = {}): ChoiceTreeState {
    const here = this.here;
    const looks = this.flags.map((flag, id): ChoiceLook => {
      const onPath = this.path.includes(id);
      const tone: CellTone = flag.skipped ? "faded" : id === here ? (this.fresh ? "done" : "edge") : onPath ? "window" : flag.written ? "hit" : "idle";
      return { tone, dotted: !flag.walked && !flag.skipped, crossed: flag.skipped };
    });
    return {
      nodes: this.nodes,
      looks,
      path: [...this.path],
      reason: this.reason ? { ...this.reason } : null,
      shelf: this.shelf(this),
      bag: this.bag.map((text) => ({ text, tone: "window" as const })),
      leaving: this.leaving,
      notebook: { label: "notebook", items: this.written.map((text, index) => ({ text, tone: this.fresh && index === this.written.length - 1 ? ("done" as const) : ("idle" as const) })) },
      rows: [],
      counter: null,
      note: null,
      ...extra,
    };
  }

  /** A scene with no tree: the same frame size, only rows of boxes. */
  plain(rows: ChoiceStrip[], extra: Partial<ChoiceTreeState> = {}): ChoiceTreeState {
    return {
      nodes: this.nodes,
      looks: this.nodes.map(() => null),
      path: [],
      reason: null,
      shelf: this.shelf(this),
      bag: [],
      leaving: null,
      notebook: { label: "", items: [] },
      rows,
      counter: null,
      note: null,
      ...extra,
    };
  }

  /** The finished tree: every answer spot teal, the notebook full. */
  finished(extra: Partial<ChoiceTreeState> = {}): ChoiceTreeState {
    const looks = this.flags.map((flag): ChoiceLook => ({ tone: flag.skipped ? "faded" : flag.written ? "done" : "idle", dotted: false, crossed: flag.skipped }));
    return { ...this.snap(), looks, path: [], notebook: { label: "notebook", items: this.written.map((text) => ({ text, tone: "hit" as const })) }, ...extra };
  }
}

const FILL: Record<CellTone, string> = {
  idle: "var(--background)",
  window: "color-mix(in srgb, var(--accent) 16%, var(--background))",
  edge: "color-mix(in srgb, var(--accent) 45%, var(--background))",
  hit: "color-mix(in srgb, var(--teal) 22%, var(--background))",
  miss: "color-mix(in srgb, var(--coral) 28%, var(--background))",
  done: "color-mix(in srgb, var(--teal) 48%, var(--background))",
  faded: "var(--background)",
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

function Chip({ x, y, chip, dashed = false }: { x: number; y: number; chip: ChoiceChip; dashed?: boolean }) {
  const width = chipWidth(chip.text);
  const plain = chip.tone === "idle" || chip.tone === "faded";
  return (
    <g className={GLIDE} style={{ opacity: chip.tone === "faded" ? 0.4 : 1 }}>
      <rect x={x} y={y} width={width} height={24} rx={7} fill={FILL[chip.tone]} stroke={STROKE[chip.tone]} strokeWidth={plain ? 1 : 1.75} strokeDasharray={dashed ? "4 3" : undefined} />
      <text x={x + width / 2} y={y + 16.5} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily={MONO}>
        {chip.text}
      </text>
      {chip.note ? (
        <text x={x + width / 2} y={y + 35} textAnchor="middle" fontSize={10} fill={chip.tone === "miss" ? VIZ_COLORS.coral : VIZ_COLORS.muted}>
          {chip.note}
        </text>
      ) : null}
    </g>
  );
}

function Strip({ strip, x, y }: { strip: ChoiceStrip; x: number; y: number }) {
  if (!strip.label) return null;
  const at = x + 76;
  const lefts = strip.items.map((_, index) => at + strip.items.slice(0, index).reduce((sum, chip) => sum + chipWidth(chip.text) + 6, 0));
  return (
    <g>
      <Label x={x} y={y + 16} size={12} weight={600}>
        {strip.label}
      </Label>
      {strip.items.length === 0 ? (
        <Label x={at} y={y + 16} size={12}>
          (empty)
        </Label>
      ) : null}
      {strip.items.map((chip, index) => (
        <Chip key={index} x={lefts[index]} y={y} chip={chip} />
      ))}
    </g>
  );
}

export function AgyChoicesTreeView({ state, pick }: { state: ChoiceTreeState; pick?: CellPick }) {
  const { nodes } = state;
  const spots = layoutChoices(nodes);
  const gap = levelGap(nodes);
  const deepest = deepestOf(nodes);
  const radius = radiusOf(nodes);
  const bagRow = TOP + deepest * gap + radius + 30;
  const bookRow = bagRow + 44;
  const height = bookRow + 24 + 18;

  const shown = (id: number) => state.looks[id] ?? null;
  const here = state.path.length > 0 ? state.path[state.path.length - 1] : null;
  const walker = here !== null && spots[here] ? spots[here] : null;
  const walkerReach = here === 0 ? 30 : radius + 8;

  // The bag is a fixed holder with one slot per level of the path, so an item outside it is plainly out.
  const bagLeft = 338;
  const bagWidth = deepest * 36 + 6;

  const reasonNode = state.reason ? spots[state.reason.id] : null;
  const reasonWidth = state.reason ? state.reason.text.length * 5.9 : 0;
  const reasonX = reasonNode ? Math.min(CHOICE_WIDTH - 6 - reasonWidth / 2, Math.max(6 + reasonWidth / 2, reasonNode.x)) : 0;
  const reasonColor = state.reason?.tone === "coral" ? VIZ_COLORS.coral : state.reason?.tone === "teal" ? VIZ_COLORS.teal : VIZ_COLORS.muted;

  return (
    <Frame width={CHOICE_WIDTH} height={height} label="A branching path of choices, the walker's bag, and the notebook of answers">
      {state.counter ? (
        <Label x={16} y={20} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.note ? (
        <Label x={CHOICE_WIDTH - 16} y={20} size={13} weight={600} tone={state.note.tone} anchor="end">
          {state.note.text}
        </Label>
      ) : null}

      {state.rows.map((strip, row) => (
        <Strip key={`row-${row}`} strip={strip} x={16} y={TOP - 14 + row * ROW_STEP} />
      ))}

      {/* Paths between forks. They stop at the rim of each circle. */}
      {nodes.map((node) => {
        const look = shown(node.id);
        if (node.parent === null || !look) return null;
        const from = spots[node.parent];
        const to = spots[node.id];
        const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
        const ux = (to.x - from.x) / length;
        const uy = (to.y - from.y) / length;
        // The start is a box, not a circle: leave it at its rim.
        const fromReach = node.parent === 0 ? Math.min(24 / Math.max(0.01, Math.abs(ux)), 12 / Math.max(0.01, Math.abs(uy))) : radius;
        const onPath = state.path.includes(node.id);
        return (
          <line
            key={`edge-${node.id}`}
            className={GLIDE}
            x1={from.x + ux * fromReach}
            y1={from.y + uy * fromReach}
            x2={to.x - ux * radius}
            y2={to.y - uy * radius}
            stroke={onPath ? VIZ_COLORS.accent : look.tone === "miss" ? VIZ_COLORS.coral : VIZ_COLORS.line}
            strokeWidth={onPath ? 2.75 : 1.25}
            strokeDasharray={look.dotted || look.crossed ? "3 4" : undefined}
            strokeOpacity={look.crossed ? 0.45 : 1}
          />
        );
      })}

      {nodes.map((node) => {
        const look = shown(node.id);
        if (!look) return null;
        const { x, y } = spots[node.id];
        const tone = pickTone(pick, node.id, look.tone);
        const plain = tone === "idle" || tone === "faded";
        return (
          <g key={`node-${node.id}`} className={GLIDE} style={{ opacity: tone === "faded" ? 0.4 : 1 }}>
            {node.parent === null ? (
              <rect className={GLIDE} x={x - 24} y={y - 12} width={48} height={24} rx={8} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={plain ? 1.25 : 2} />
            ) : (
              <circle className={GLIDE} cx={x} cy={y} r={radius} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={plain ? 1.25 : 2} strokeDasharray={look.dotted ? "3 3" : undefined} />
            )}
            <text x={x} y={y + 4.5} textAnchor="middle" fontSize={node.parent === null ? 11.5 : 13} fontWeight={700} fill={look.dotted ? VIZ_COLORS.muted : VIZ_COLORS.ink} fontFamily={MONO}>
              {node.text}
            </text>
            {look.crossed ? (
              <path d={`M${x - radius + 3} ${y + radius - 3} L${x + radius - 3} ${y - radius + 3}`} stroke={VIZ_COLORS.muted} strokeWidth={1.5} />
            ) : null}
            {/* High on the right, outside the circle: clear of the item, the walker on the left and the reason label below. */}
            <RejectedMark pick={pick} index={node.id} x={x + radius + 5} y={y - radius + 4} />
          </g>
        );
      })}

      {/* The walker: a small figure that glides to the spot where the walk is now. */}
      <g className={GLIDE} style={{ transform: `translate(${walker ? walker.x - walkerReach : 0}px, ${walker ? walker.y : 0}px)`, opacity: walker ? 1 : 0 }}>
        <circle cx={0} cy={-8} r={3.2} fill={VIZ_COLORS.accent} stroke="var(--background)" strokeWidth={2} paintOrder="stroke" />
        <path d="M0 -4 L-4.5 7 L4.5 7 Z" fill={VIZ_COLORS.accent} stroke="var(--background)" strokeWidth={2} paintOrder="stroke" />
      </g>

      {state.reason && reasonNode ? (
        <text x={reasonX} y={reasonNode.y + radius + 13} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={reasonColor} stroke="var(--background)" strokeWidth={3} paintOrder="stroke">
          {state.reason.text}
        </text>
      ) : null}

      {state.shelf ? <Strip strip={state.shelf} x={16} y={bagRow} /> : null}

      {state.notebook.label ? (
        <g>
          <Label x={bagLeft - 38} y={bagRow + 16} size={12} weight={600}>
            bag
          </Label>
          <rect x={bagLeft} y={bagRow - 4} width={bagWidth} height={32} rx={10} fill="transparent" stroke={VIZ_COLORS.line} strokeWidth={1.25} />
          {state.bag.map((chip, index) => (
            <Chip key={`bag-${index}`} x={bagLeft + 6 + index * 36} y={bagRow} chip={chip} />
          ))}
          {state.leaving !== null ? (
            <g>
              <path d={`M${bagLeft + bagWidth + 3} ${bagRow + 12} l9 0 m-4 -4 l4 4 l-4 4`} fill="none" stroke={VIZ_COLORS.coral} strokeWidth={1.75} />
              <Chip x={bagLeft + bagWidth + 16} y={bagRow} chip={{ text: state.leaving, tone: "miss" }} dashed />
              <Label x={bagLeft + bagWidth + 50} y={bagRow + 16} size={10.5} weight={600} tone="coral">
                out
              </Label>
            </g>
          ) : null}
        </g>
      ) : null}

      <Strip strip={state.notebook} x={16} y={bookRow} />

      {/* Click targets sit on top, only for forks that are drawn. */}
      {nodes.map((node) =>
        shown(node.id) ? (
          <PickTarget
            key={`pick-${node.id}`}
            pick={pick}
            index={node.id}
            x={spots[node.id].x - radius - 3}
            y={spots[node.id].y - radius - 3}
            width={radius * 2 + 6}
            height={radius * 2 + 6}
            rx={radius + 3}
            label={node.parent === null ? "Choose the start" : `Choose the fork ${node.text} below ${node.parent === 0 ? "the start" : nodes[node.parent].text}`}
          />
        ) : null,
      )}
    </Frame>
  );
}
