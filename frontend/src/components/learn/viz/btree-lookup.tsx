import { ArrowDefs, Cell, type CellTone, Edge, Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asNumber, asNumberList, type VizDefinition, type VizStep } from "./types";

/**
 * A B+ tree index lookup, one page per step. Leaves hold the keys in sorted order and
 * are linked left to right; inner nodes hold only separators. The reader walks root to
 * leaf, sees the page count, then follows a leaf link for a range scan.
 *
 *   :::viz btree-lookup {"keys": [3, 8, 12, 17, 21, 26, 30, 35, 41, 47, 52, 58], "fanout": 3, "find": 35}
 */

export type BTreeParams = { keys: number[]; fanout: number; find: number };

export type BTreeNode = { id: string; level: number; keys: number[]; children: string[]; leaf: boolean };
export type BTree = { nodes: Record<string, BTreeNode>; levels: string[][]; root: string; leaves: string[]; depth: number };

export type BTreeState = {
  /** Pages on the path so far, root first. */
  path: string[];
  /** The page being read right now. */
  current: string | null;
  /** The separator or key the comparison is looking at. */
  compareKey: number | null;
  /** The pointer index taken out of the current page, or null. */
  pointer: number | null;
  found: boolean;
  missing: boolean;
  /** Keys returned by the range scan so far. */
  scanned: number[];
  /** The leaf link followed by the scan, as [from, to]. */
  link: [string, string] | null;
  pagesRead: number;
  phase: "setup" | "search" | "leaf" | "scan" | "insert" | "result";
};

const DEFAULTS: BTreeParams = { keys: [3, 8, 12, 17, 21, 26, 30, 35, 41, 47, 52, 58], fanout: 3, find: 35 };

const MAX_KEYS = 24;

export function normalizeKeys(keys: number[]): number[] {
  return [...new Set(keys.map((key) => Math.round(key)))].sort((a, b) => a - b).slice(0, MAX_KEYS);
}

/** Builds the tree bottom-up: leaves of `fanout` keys, then parents of `fanout + 1` children, until one root remains. */
export function buildBTree(keys: number[], fanout: number): BTree {
  const sorted = normalizeKeys(keys);
  const nodes: Record<string, BTreeNode> = {};
  const leaves: string[] = [];
  for (let i = 0; i < sorted.length; i += fanout) {
    const id = `leaf-${leaves.length + 1}`;
    nodes[id] = { id, level: 0, keys: sorted.slice(i, i + fanout), children: [], leaf: true };
    leaves.push(id);
  }
  const levels: string[][] = [leaves];
  let row = leaves;
  let level = 1;
  while (row.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < row.length; i += fanout + 1) {
      const children = row.slice(i, i + fanout + 1);
      const id = `inner-${level}-${next.length + 1}`;
      // A separator is the smallest key under each child except the first.
      const separators = children.slice(1).map((child) => firstKey(nodes, child));
      nodes[id] = { id, level, keys: separators, children, leaf: false };
      next.push(id);
    }
    levels.unshift(next);
    row = next;
    level += 1;
  }
  const root = row[0];
  return { nodes, levels, root, leaves, depth: levels.length };
}

function firstKey(nodes: Record<string, BTreeNode>, id: string): number {
  let node = nodes[id];
  while (!node.leaf) node = nodes[node.children[0]];
  return node.keys[0];
}

function frame(state: BTreeState, kind: VizStep<BTreeState>["kind"], title: string, explain: string, interview: string): VizStep<BTreeState> {
  return { title, explain, interview, kind, state: { ...state, path: [...state.path], scanned: [...state.scanned] } };
}

export function btreeLookupSteps(params: BTreeParams): VizStep<BTreeState>[] {
  const tree = buildBTree(params.keys, params.fanout);
  const { find, fanout } = params;
  const total = tree.leaves.reduce((sum, id) => sum + tree.nodes[id].keys.length, 0);
  const steps: VizStep<BTreeState>[] = [];
  const state: BTreeState = { path: [], current: null, compareKey: null, pointer: null, found: false, missing: false, scanned: [], link: null, pagesRead: 0, phase: "setup" };

  steps.push(
    frame(
      state,
      "setup",
      `${total} keys, fan-out ${fanout}, ${tree.depth} level${tree.depth === 1 ? "" : "s"}`,
      `Every key lives in a leaf at the bottom, in sorted order. The nodes above hold only separators that say which way to go. All ${tree.leaves.length} leaves sit at the same depth, so every lookup reads the same number of pages.`,
      "Say what the index is before you use it: 'a sorted copy of the column, kept as a B-tree where each node is one disk page; all leaves are at the same depth, so every lookup costs the same small number of page reads'.",
    ),
  );

  state.phase = "search";
  let id = tree.root;
  while (!tree.nodes[id].leaf) {
    const node = tree.nodes[id];
    state.current = id;
    state.path.push(id);
    state.pagesRead += 1;
    // Go right past every separator that is <= find.
    const pointer = node.keys.filter((separator) => find >= separator).length;
    state.pointer = pointer;
    state.compareKey = pointer === 0 ? node.keys[0] : node.keys[pointer - 1];
    const left = pointer === 0 ? null : node.keys[pointer - 1];
    const right = pointer < node.keys.length ? node.keys[pointer] : null;
    const rule = left === null ? `${find} is below ${right}, so take the first pointer.` : right === null ? `${find} is at or above ${left}, so take the last pointer.` : `${find} is at or above ${left} and below ${right}, so take pointer ${pointer + 1}.`;
    steps.push(
      frame(
        state,
        "decision",
        `Page ${state.pagesRead}: ${id === tree.root ? "root" : "inner node"}, one comparison`,
        `Read this page and compare ${find} with its separators. ${rule}`,
        `Narrate one page per level: 'I read the ${id === tree.root ? "root" : "next"} page, compare against the separators, and follow exactly one pointer down; the separators are copies of the smallest key under each child'.`,
      ),
    );
    id = node.children[pointer];
  }

  state.phase = "leaf";
  const leaf = tree.nodes[id];
  state.current = id;
  state.path.push(id);
  state.pagesRead += 1;
  state.pointer = null;
  state.compareKey = find;
  state.found = leaf.keys.includes(find);
  state.missing = !state.found;
  steps.push(
    frame(
      state,
      "invariant",
      state.found ? `Page ${state.pagesRead}: leaf holds ${find}` : `Page ${state.pagesRead}: leaf, ${find} is not there`,
      state.found
        ? `The leaf is the only place a key can live. ${find} is in it, so the lookup is done after ${state.pagesRead} page reads, one per level. The leaf entry points back to the table row.`
        : `The leaf is the only place ${find} could live, and it is not there. The lookup is done after ${state.pagesRead} page reads; the answer is 'no such row', at the same cost as a hit.`,
      state.found
        ? "State the cost as pages, not comparisons: 'one page read per level, so this lookup touched " + state.pagesRead + " pages; the leaf entry holds the row pointer, so a covering index would stop here and a plain index does one more read for the row'."
        : "Point out that a miss costs the same as a hit: 'the tree tells me the key is absent after the same " + state.pagesRead + " page reads; that is why a unique-constraint check is cheap'.",
    ),
  );

  state.phase = "scan";
  const position = leaf.keys.findIndex((key) => key >= find);
  const fromHere = position === -1 ? [] : leaf.keys.slice(position);
  state.scanned = [...fromHere];
  state.compareKey = null;
  const leafIndex = tree.leaves.indexOf(id);
  const nextLeaf = leafIndex + 1 < tree.leaves.length ? tree.leaves[leafIndex + 1] : null;
  steps.push(
    frame(
      state,
      "invariant",
      fromHere.length ? `Range scan: read this leaf from ${fromHere[0]}` : "Range scan: nothing left in this leaf",
      fromHere.length
        ? `A range query (keys at or above ${find}) starts at the same leaf. The keys are already in order, so it reads them left to right: ${fromHere.join(", ")}.`
        : `A range query for keys at or above ${find} starts here too, but this leaf has nothing at or above it. The scan moves straight to the next leaf.`,
      "Explain why a range and an ORDER BY are cheap: 'the leaf is sorted, so a range scan is a sequential read from the first match; no sort step is needed because the index already is the order'.",
    ),
  );

  if (nextLeaf) {
    const next = tree.nodes[nextLeaf];
    state.link = [id, nextLeaf];
    state.current = nextLeaf;
    state.pagesRead += 1;
    state.scanned = [...state.scanned, ...next.keys];
    steps.push(
      frame(
        state,
        "invariant",
        `Follow the leaf link: ${next.keys.join(", ")}`,
        `Each leaf points to the next one. The scan follows that link to the next page instead of going back up the tree. One more page read, ${next.keys.length} more keys in order.`,
        "Name the leaf link: 'leaves are chained, so a scan walks sideways one page at a time; the cost of a range is the pages it covers, not the depth again for every key'.",
      ),
    );
  } else {
    steps.push(
      frame(
        state,
        "invariant",
        "Last leaf: the scan stops here",
        "This is the rightmost leaf, so there is no link to follow. A range scan ends when the leaf chain ends or a key passes the upper bound.",
        "Say what stops a scan: 'the chain ends, or the next key is past the upper bound; either way the scan reads only the leaves the range actually covers'.",
      ),
    );
  }

  state.phase = "insert";
  state.link = null;
  state.current = id;
  state.compareKey = find;
  steps.push(
    frame(
      state,
      "tradeoff",
      "The write side: every insert lands in this same leaf",
      `An insert of a key near ${find} must go into this exact leaf to keep the order. If the leaf is full (${fanout} keys), it splits and the parent gains a separator. Every index on the table pays this on every write.`,
      "Give the cost before you are asked: 'each index adds a page write and sometimes a split per insert; that is the write amplification, so I add one index per access pattern and no more'.",
    ),
  );

  state.phase = "result";
  state.current = null;
  state.compareKey = null;
  const perPage = fanout + 1;
  steps.push(
    frame(
      state,
      "result",
      `${tree.depth} page reads for ${total} keys: O(log n)`,
      `Each inner page fans out to ${perPage} children, so the depth grows as log base ${perPage} of the key count. A real page holds hundreds of keys, so a billion rows is only three or four levels, and the top levels stay in memory.`,
      "Close with why it is disk-friendly: 'a lookup is one page read per level and the depth is logarithmic in the fan-out, so a billion rows is about four pages, of which the top ones are cached; that is why an index turns a scan into milliseconds'.",
    ),
  );

  return steps;
}

const PAD = 16;
const CELL = 26;
const ROW_H = 84;
const NODE_PAD = 6;
const GAP = 14;

function nodeWidth(node: BTreeNode, fanout: number): number {
  return Math.max(node.keys.length, node.leaf ? fanout : 1) * CELL + NODE_PAD * 2;
}

export function BTreeView({ state, params }: { state: BTreeState; params: BTreeParams }) {
  const tree = buildBTree(params.keys, params.fanout);
  const leafW = params.fanout * CELL + NODE_PAD * 2;
  const width = Math.max(520, PAD * 2 + tree.leaves.length * leafW + (tree.leaves.length - 1) * GAP);
  const height = PAD * 2 + tree.depth * ROW_H + 8;
  const at = new Map<string, { x: number; y: number; w: number }>();
  // Leaves are spread evenly across the bottom; every parent is centred over its children.
  const spread = (width - PAD * 2 - tree.leaves.length * leafW) / Math.max(1, tree.leaves.length - 1);
  tree.leaves.forEach((id, index) => at.set(id, { x: PAD + index * (leafW + spread), y: PAD + (tree.depth - 1) * ROW_H, w: leafW }));
  for (let level = tree.levels.length - 2; level >= 0; level -= 1) {
    for (const id of tree.levels[level]) {
      const node = tree.nodes[id];
      const first = at.get(node.children[0])!;
      const last = at.get(node.children[node.children.length - 1])!;
      const w = nodeWidth(node, params.fanout);
      const centre = (first.x + last.x + last.w) / 2;
      at.set(id, { x: centre - w / 2, y: PAD + (tree.depth - 1 - node.level) * ROW_H, w });
    }
  }
  const onPath = new Set(state.path);
  const scanned = new Set(state.scanned);

  return (
    <div className="space-y-2">
      <Frame width={width} height={height} label={`B+ tree of ${params.keys.length} keys`}>
        <ArrowDefs />
        {Object.values(tree.nodes).map((node) => {
          const pos = at.get(node.id)!;
          return node.children.map((child, index) => {
            const target = at.get(child)!;
            const taken = state.current !== null && onPath.has(node.id) && onPath.has(child) && state.path.indexOf(child) === state.path.indexOf(node.id) + 1;
            return <Edge key={`${node.id}>${child}`} from={[pos.x + NODE_PAD + index * CELL, pos.y + 40]} to={[target.x + target.w / 2, target.y]} tone={taken ? "active" : "idle"} />;
          });
        })}
        {tree.leaves.slice(0, -1).map((id, index) => {
          const a = at.get(id)!;
          const b = at.get(tree.leaves[index + 1])!;
          const used = state.link !== null && state.link[0] === id;
          return <Edge key={`${id}~`} from={[a.x + a.w, a.y + 26]} to={[b.x, b.y + 26]} tone={used ? "ok" : "idle"} dashed={!used} />;
        })}
        {Object.values(tree.nodes).map((node) => {
          const pos = at.get(node.id)!;
          const current = state.current === node.id;
          const visited = onPath.has(node.id);
          const stroke = current ? VIZ_COLORS.accent : visited ? VIZ_COLORS.teal : VIZ_COLORS.line;
          const fill = current ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent";
          const title = node.leaf ? `leaf ${tree.leaves.indexOf(node.id) + 1}` : node.id === tree.root ? "root" : "inner";
          return (
            <g key={node.id}>
              <rect x={pos.x} y={pos.y} width={pos.w} height={40} rx={8} fill={fill} stroke={stroke} strokeWidth={current || visited ? 1.75 : 1} />
              <text x={pos.x + pos.w / 2} y={pos.y - 4} textAnchor="middle" fontSize={9} fill={VIZ_COLORS.muted} letterSpacing={0.5}>
                {title.toUpperCase()}
              </text>
              {node.keys.map((key, index) => {
                let tone: CellTone = "idle";
                if (node.leaf && scanned.has(key)) tone = "done";
                if (node.leaf && state.found && key === params.find) tone = "hit";
                if (!node.leaf && current && state.compareKey === key) tone = "edge";
                if (node.leaf && state.phase === "insert" && current && key === state.compareKey) tone = "hit";
                return <Cell key={key} x={pos.x + NODE_PAD + index * CELL} y={pos.y + 7} size={CELL} value={key} tone={tone} />;
              })}
              {node.leaf && current && state.missing && state.phase === "leaf" ? (
                <text x={pos.x + pos.w / 2} y={pos.y + 54} textAnchor="middle" fontSize={10} fontWeight={600} fill={VIZ_COLORS.coral}>
                  {params.find} not here
                </text>
              ) : null}
            </g>
          );
        })}
        <Label x={PAD} y={height - 4} tone="ink" weight={600}>
          {state.pagesRead === 0 ? `find ${params.find}` : `find ${params.find} · pages read: ${state.pagesRead}`}
        </Label>
        <Label x={width - PAD} y={height - 4} anchor="end" tone={state.missing ? "coral" : state.found ? "teal" : "muted"}>
          {state.phase === "setup" ? `all leaves at depth ${tree.depth}` : state.missing ? "not found" : state.found ? "found" : ""}
        </Label>
      </Frame>
      <Legend items={[{ tone: "accent", label: "page being read" }, { tone: "edge", label: "separator compared" }, { tone: "hit", label: "key found" }, { tone: "done", label: "range scan" }, { tone: "teal", label: "leaf link followed" }]} />
    </div>
  );
}

export const btreeLookupViz: VizDefinition<BTreeParams, BTreeState> = {
  id: "btree-lookup",
  title: "B-tree index lookup, one page per level",
  summary: "Walk root to leaf on a small B+ tree, count the pages, then follow the leaf links for a range scan.",
  fields: [
    { key: "keys", label: "Indexed keys", kind: "text", hint: "sorted for you; up to 24 numbers" },
    { key: "fanout", label: "Keys per page (fan-out)", kind: "number", hint: "2 to 4" },
    { key: "find", label: "Key to find", kind: "number" },
  ],
  defaults: DEFAULTS,
  parse: (raw) => {
    const keys = normalizeKeys(asNumberList(raw.keys, DEFAULTS.keys));
    return { keys, fanout: Math.round(asNumber(raw.fanout, DEFAULTS.fanout, 2, 4)), find: Math.round(asNumber(raw.find, DEFAULTS.find)) };
  },
  steps: btreeLookupSteps,
  View: BTreeView,
};
