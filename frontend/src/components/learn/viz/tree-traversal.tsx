import { Edge, Frame, Legend, VIZ_COLORS } from "./primitives";
import { asChoice, asStringList, type VizDefinition, type VizStep } from "./types";

/** Pre-, in-, and post-order on the same tree. What each order is FOR is the interview content. */

export type TreeTraversalParams = { tree: string[]; order: "pre" | "in" | "post" };
export type TreeTraversalState = { visited: string[]; current: number | null; stack: number[]; action: "down-left" | "visit" | "down-right" | "up" | null };

const DEFAULTS: TreeTraversalParams = { tree: ["8", "3", "10", "1", "6", "null", "14"], order: "in" };

type Node = { index: number; value: string; left: number | null; right: number | null };

function build(tree: string[]): Map<number, Node> {
  const nodes = new Map<number, Node>();
  tree.forEach((value, index) => {
    if (value === "null" || value === "-") return;
    nodes.set(index, { index, value, left: null, right: null });
  });
  for (const node of nodes.values()) {
    const l = 2 * node.index + 1;
    const r = 2 * node.index + 2;
    if (nodes.has(l)) node.left = l;
    if (nodes.has(r)) node.right = r;
  }
  return nodes;
}

function frame(state: TreeTraversalState, kind: VizStep<TreeTraversalState>["kind"], title: string, explain: string, interview: string): VizStep<TreeTraversalState> {
  return { title, explain, interview, kind, state: { ...state, visited: [...state.visited], stack: [...state.stack] } };
}

const PURPOSE = {
  pre: "Pre-order visits a node before its children: 'copying or serializing a tree, because the parent must exist before the children are attached'.",
  in: "In-order on a binary search tree yields sorted order: 'validate a BST, find the kth smallest, or build a sorted list without sorting'.",
  post: "Post-order visits children first: 'deleting a tree, computing heights or subtree sizes, evaluating expression trees, because a node needs its children's answers'.",
};

export function treeTraversalSteps(params: TreeTraversalParams): VizStep<TreeTraversalState>[] {
  const nodes = build(params.tree);
  const steps: VizStep<TreeTraversalState>[] = [];
  const state: TreeTraversalState = { visited: [], current: null, stack: [], action: null };
  const order = params.order;
  steps.push(frame(state, "setup", `${order === "pre" ? "Pre" : order === "in" ? "In" : "Post"}-order: ${order === "pre" ? "node, left, right" : order === "in" ? "left, node, right" : "left, right, node"}`, `${nodes.size} nodes given level by level. Recursion goes left first in every order; only when the node itself is visited changes.`, `Start with what the order is for, not the definition. ${PURPOSE[order]} Then the shape: 'the three orders are the same recursion with the visit line moved'.`));
  function walk(index: number | null, depth: number) {
    if (index === null) return;
    const node = nodes.get(index)!;
    state.stack.push(index);
    state.current = index;
    if (order === "pre") {
      state.visited.push(node.value);
      state.action = "visit";
      steps.push(frame(state, "decision", `Visit ${node.value}`, `Pre-order: visit before descending. Output: ${state.visited.join(" ")}.`, "Say what the call stack holds: 'the path from the root to here, so recursion depth equals tree height'. On a skewed tree that is n; on a balanced one log n. That is the memory answer."));
    }
    if (node.left !== null) {
      state.action = "down-left";
      steps.push(frame(state, "invariant", `${node.value}: go left to ${nodes.get(node.left)!.value}`, "Recurse into the left subtree first.", "Left before right in all three orders. The invariant: 'everything in the left subtree is fully handled before anything in the right subtree'. On a BST that is what makes in-order sorted."));
      walk(node.left, depth + 1);
      state.current = index;
    }
    if (order === "in") {
      state.visited.push(node.value);
      state.action = "visit";
      steps.push(frame(state, "decision", `Visit ${node.value}`, `In-order: left subtree done, now the node. Output: ${state.visited.join(" ")}.`, "If this is a BST, say the invariant out loud: 'every value visited so far is smaller than this one'. Comparing to the previous visited value is how you validate a BST in O(n) with O(h) space."));
    }
    if (node.right !== null) {
      state.action = "down-right";
      steps.push(frame(state, "invariant", `${node.value}: go right to ${nodes.get(node.right)!.value}`, "Recurse into the right subtree.", "Iterative version: 'push the node when going left, pop it when the left side is exhausted, then move right'. Interviewers ask for it when they want to see you handle the stack yourself."));
      walk(node.right, depth + 1);
      state.current = index;
    }
    if (order === "post") {
      state.visited.push(node.value);
      state.action = "visit";
      steps.push(frame(state, "decision", `Visit ${node.value}`, `Post-order: both subtrees done, now the node. Output: ${state.visited.join(" ")}.`, "This is the moment a node can use its children's results: 'height = 1 + max(left, right)' is computed exactly here. Most 'tree DP' answers are post-order traversals in disguise."));
    }
    state.stack.pop();
    state.action = "up";
  }
  walk(nodes.size ? 0 : null, 0);
  state.current = null;
  state.stack = [];
  state.action = null;
  steps.push(frame(state, "result", `Output: ${state.visited.join(" ")}`, `${state.visited.length} nodes visited, each exactly once: O(n) time, O(h) space for the stack.`, "Close with the fourth order they will ask about: 'level-order is BFS with a queue, not recursion; use it for anything that says level, depth, or nearest'. And the trick question: 'pre-order plus in-order reconstructs the tree; pre-order alone does not'."));
  return steps;
}

export function TreeTraversalView({ state, params }: { state: TreeTraversalState; params: TreeTraversalParams }) {
  const nodes = build(params.tree);
  const width = 320;
  const height = 200;
  const depthOf = (index: number) => Math.floor(Math.log2(index + 1));
  const maxDepth = Math.max(0, ...[...nodes.keys()].map(depthOf));
  const pos = (index: number): [number, number] => {
    const depth = depthOf(index);
    const offset = index - (2 ** depth - 1);
    const slots = 2 ** depth;
    return [((offset + 0.5) / slots) * width, 30 + depth * (Math.max(1, maxDepth) === 0 ? 0 : (height - 60) / Math.max(1, maxDepth))];
  };
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px]">
      <Frame width={width} height={height} label="Binary tree traversal">
        {[...nodes.values()].map((node) =>
          [node.left, node.right].map((child) =>
            child === null ? null : <Edge key={`${node.index}-${child}`} from={pos(node.index)} to={pos(child)} tone={state.stack.includes(child) && state.stack.includes(node.index) ? "active" : "idle"} />,
          ),
        )}
        {[...nodes.values()].map((node) => {
          const [x, y] = pos(node.index);
          const visited = state.visited.includes(node.value);
          const isCurrent = state.current === node.index;
          return (
            <g key={node.index} style={{ transition: "all 200ms" }}>
              <circle cx={x} cy={y} r={15} fill={isCurrent ? "color-mix(in srgb, var(--accent) 40%, transparent)" : visited ? "color-mix(in srgb, var(--teal) 30%, transparent)" : "var(--steel-900)"} stroke={isCurrent ? VIZ_COLORS.accent : visited ? VIZ_COLORS.teal : state.stack.includes(node.index) ? VIZ_COLORS.accent : VIZ_COLORS.line} strokeWidth={isCurrent || state.stack.includes(node.index) ? 2 : 1.25} />
              <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.ink}>
                {node.value}
              </text>
            </g>
          );
        })}
      </Frame>
      <div className="space-y-2 text-[12px]">
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Call stack (root → current)</div>
        <div className="font-mono">{state.stack.map((i) => nodes.get(i)?.value).join(" › ") || "empty"}</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Output</div>
        <div className="font-mono text-foreground/90">{state.visited.join(" ") || "—"}</div>
        <Legend items={[{ tone: "accent", label: "on the stack" }, { tone: "teal", label: "visited" }]} />
      </div>
    </div>
  );
}

export const treeTraversalViz: VizDefinition<TreeTraversalParams, TreeTraversalState> = {
  id: "tree-traversal",
  title: "Tree traversals",
  summary: "Same recursion, three places to put the visit. Switch the order and watch the output change.",
  fields: [
    { key: "tree", label: "Tree (level order)", kind: "text", hint: "Comma-separated, null for a missing child." },
    {
      key: "order",
      label: "Order",
      kind: "select",
      options: [
        { value: "pre", label: "Pre-order (node, left, right)" },
        { value: "in", label: "In-order (left, node, right)" },
        { value: "post", label: "Post-order (left, right, node)" },
      ],
    },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({ tree: asStringList(raw.tree, DEFAULTS.tree).slice(0, 15), order: asChoice(raw.order, ["pre", "in", "post"] as const, DEFAULTS.order) }),
  steps: treeTraversalSteps,
  View: TreeTraversalView,
};
