import { ArrowDefs, Edge, Frame, Legend, VIZ_COLORS } from "./primitives";
import { asChoice, asStringList, type VizDefinition, type VizStep } from "./types";

/**
 * BFS and DFS on the same graph. The frames carry the two things interviewers listen for:
 * when a node is marked visited (and why that differs between the two), and what each
 * traversal can and cannot promise about the order it produces.
 */

export type GraphTraversalParams = { edges: string[]; start: string; mode: "bfs" | "dfs" };

export type GraphTraversalState = {
  frontier: string[];
  visited: string[];
  order: string[];
  current: string | null;
  activeEdge: [string, string] | null;
  depth: Record<string, number>;
};

const DEFAULTS: GraphTraversalParams = { edges: ["A-B", "A-C", "B-D", "C-D", "C-E", "D-F", "E-F"], start: "A", mode: "bfs" };

function parseEdges(edges: string[]): { nodes: string[]; adjacency: Map<string, string[]> } {
  const adjacency = new Map<string, string[]>();
  const add = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.get(a)!.includes(b)) adjacency.get(a)!.push(b);
  };
  for (const raw of edges) {
    const [a, b] = raw.split(/[-–>]+/).map((part) => part.trim());
    if (!a || !b) continue;
    add(a, b);
    add(b, a);
  }
  return { nodes: [...adjacency.keys()], adjacency };
}

function frame(state: GraphTraversalState, kind: VizStep<GraphTraversalState>["kind"], title: string, explain: string, interview: string): VizStep<GraphTraversalState> {
  return { title, explain, interview, kind, state: { ...state, frontier: [...state.frontier], visited: [...state.visited], order: [...state.order], depth: { ...state.depth }, activeEdge: state.activeEdge ? [...state.activeEdge] : null } };
}

export function graphTraversalSteps(params: GraphTraversalParams): VizStep<GraphTraversalState>[] {
  const { nodes, adjacency } = parseEdges(params.edges);
  const start = nodes.includes(params.start) ? params.start : nodes[0];
  const bfs = params.mode === "bfs";
  const steps: VizStep<GraphTraversalState>[] = [];
  const state: GraphTraversalState = { frontier: [], visited: [], order: [], current: null, activeEdge: null, depth: {} };
  if (!start) return steps;

  state.frontier = [start];
  state.visited = [start];
  state.depth = { [start]: 0 };
  steps.push(
    frame(
      state,
      "setup",
      bfs ? "Seed the queue, mark visited" : "Seed the stack",
      bfs ? `Push ${start} onto the queue and mark it visited immediately.` : `Push ${start} onto the stack. Mark visited when it is popped, not when it is pushed.`,
      bfs
        ? "State the invariant that makes BFS correct: 'a node enters the queue exactly once, at the moment it is discovered, and the queue holds nodes in non-decreasing distance from the start'. Marking on enqueue is what prevents duplicates."
        : "Say why the marking differs: 'with an explicit stack a node can be pushed several times before it is processed, so I mark it when I pop it and skip if already visited'. Recursive DFS hides this because the call itself is the visit.",
    ),
  );

  let guard = 0;
  while (state.frontier.length && guard < 200) {
    guard += 1;
    const node = bfs ? state.frontier.shift()! : state.frontier.pop()!;
    if (!bfs && state.order.includes(node)) {
      state.current = node;
      steps.push(frame(state, "decision", `Pop ${node}, already visited, skip`, `${node} was pushed twice through two different neighbours. Discard the second copy.`, "This is the line most candidates forget in iterative DFS. Without the check the traversal still terminates on a finite graph, but the order and the work are wrong."));
      continue;
    }
    if (!bfs) state.visited = [...new Set([...state.visited, node])];
    state.current = node;
    state.order.push(node);
    state.activeEdge = null;
    steps.push(
      frame(
        state,
        "invariant",
        `${bfs ? "Dequeue" : "Pop"} ${node} (depth ${state.depth[node] ?? 0})`,
        `${node} is processed now. Order so far: ${state.order.join(" → ")}.`,
        bfs
          ? `Everything already processed is at depth ≤ ${state.depth[node] ?? 0}. That is the shortest-path guarantee: the first time BFS reaches a node is along a shortest path in an unweighted graph.`
          : "DFS gives no distance guarantee. What it gives you is structure: discovery and finish order, which is what cycle detection and topological sort need.",
      ),
    );
    const neighbours = adjacency.get(node) ?? [];
    for (const next of neighbours) {
      if (bfs) {
        if (state.visited.includes(next)) continue;
        state.visited.push(next);
        state.depth[next] = (state.depth[node] ?? 0) + 1;
        state.frontier.push(next);
        state.activeEdge = [node, next];
        steps.push(frame(state, "decision", `Discover ${next}, enqueue`, `${next} is unvisited: mark it, record depth ${state.depth[next]}, push to the back of the queue.`, `Queue is now [${state.frontier.join(", ")}]. Say the complexity as you go: 'each edge is examined once from each end, so O(V + E)'.`));
      } else {
        if (state.order.includes(next)) continue;
        state.frontier.push(next);
        state.depth[next] = state.depth[next] ?? (state.depth[node] ?? 0) + 1;
        state.activeEdge = [node, next];
        steps.push(frame(state, "decision", `Push ${next}`, `${next} is not yet processed: push it. Stack is now [${state.frontier.join(", ")}].`, "Name the risk while pushing: 'recursive DFS uses the call stack, so on a long path it can overflow; for a million-node graph I use this explicit stack'."));
      }
    }
  }

  state.current = null;
  state.activeEdge = null;
  steps.push(
    frame(
      state,
      "result",
      `Order: ${state.order.join(" → ")}`,
      `All ${state.order.length} reachable nodes processed. Frontier is empty.`,
      bfs
        ? "Close with the decision rule: 'BFS when the question says shortest, fewest, or level; DFS when it says connected, cycle, order, or all paths'. And name the memory trade-off: BFS can hold a whole level in the queue, DFS holds one path."
        : "Close with the decision rule: 'DFS when the question says connected, cycle, order, or all paths; BFS when it says shortest or fewest'. Then the memory trade-off: DFS holds one path, BFS can hold an entire level.",
    ),
  );
  return steps;
}

function layout(nodes: string[], width: number, height: number): Record<string, [number, number]> {
  const positions: Record<string, [number, number]> = {};
  const count = nodes.length;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 34;
  nodes.forEach((node, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, count)) * Math.PI * 2;
    positions[node] = [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });
  return positions;
}

export function GraphTraversalView({ state, params }: { state: GraphTraversalState; params: GraphTraversalParams }) {
  const { nodes, adjacency } = parseEdges(params.edges);
  const width = 300;
  const height = 240;
  const positions = layout(nodes, width, height);
  const bfs = params.mode === "bfs";
  const seen = new Set<string>();
  const edges: [string, string][] = [];
  for (const [a, list] of adjacency) {
    for (const b of list) {
      const key = [a, b].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([a, b]);
    }
  }
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px]">
      <Frame width={width} height={height} label={`${bfs ? "Breadth" : "Depth"}-first traversal`}>
        <ArrowDefs />
        {edges.map(([a, b]) => {
          const active = state.activeEdge && ((state.activeEdge[0] === a && state.activeEdge[1] === b) || (state.activeEdge[0] === b && state.activeEdge[1] === a));
          return <Edge key={`${a}-${b}`} from={positions[a]} to={positions[b]} tone={active ? "active" : "idle"} />;
        })}
        {nodes.map((node) => {
          const [x, y] = positions[node];
          const processed = state.order.includes(node);
          const inFrontier = state.frontier.includes(node);
          const isCurrent = state.current === node;
          const stroke = isCurrent ? VIZ_COLORS.accent : processed ? VIZ_COLORS.teal : inFrontier ? VIZ_COLORS.accent : VIZ_COLORS.line;
          const fill = isCurrent ? "color-mix(in srgb, var(--accent) 40%, transparent)" : processed ? "color-mix(in srgb, var(--teal) 30%, transparent)" : inFrontier ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--steel-900)";
          return (
            <g key={node} style={{ transition: "all 200ms" }}>
              <circle cx={x} cy={y} r={17} fill={fill} stroke={stroke} strokeWidth={isCurrent || inFrontier ? 2 : 1.25} />
              <text x={x} y={y + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill={VIZ_COLORS.ink}>
                {node}
              </text>
              {state.depth[node] !== undefined && bfs ? (
                <text x={x + 20} y={y - 14} fontSize={9} fill={VIZ_COLORS.muted}>
                  d{state.depth[node]}
                </text>
              ) : null}
            </g>
          );
        })}
      </Frame>
      <div className="space-y-2 text-[12px]">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{bfs ? "Queue (front → back)" : "Stack (bottom → top)"}</div>
          <div className="mt-1 flex min-h-7 flex-wrap gap-1">
            {state.frontier.length ? (
              state.frontier.map((node, index) => (
                <span key={`${node}-${index}`} className="rounded-md border border-accent/50 bg-accent/10 px-2 py-0.5 font-mono text-[12px]">
                  {node}
                </span>
              ))
            ) : (
              <span className="text-muted-foreground">empty</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Processed order</div>
          <div className="mt-1 font-mono text-[12px] text-foreground/90">{state.order.join(" → ") || "—"}</div>
        </div>
        <Legend items={[{ tone: "accent", label: bfs ? "in queue" : "on stack" }, { tone: "teal", label: "processed" }]} />
      </div>
    </div>
  );
}

export const graphTraversalViz: VizDefinition<GraphTraversalParams, GraphTraversalState> = {
  id: "graph-traversal",
  title: "BFS vs DFS",
  summary: "Same graph, two frontiers. The difference is when a node is marked and what the order promises.",
  fields: [
    { key: "edges", label: "Edges", kind: "text", hint: "Comma-separated pairs like A-B,B-C." },
    { key: "start", label: "Start node", kind: "text" },
    {
      key: "mode",
      label: "Traversal",
      kind: "select",
      options: [
        { value: "bfs", label: "BFS (queue)" },
        { value: "dfs", label: "DFS (explicit stack)" },
      ],
    },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({
    edges: asStringList(raw.edges, DEFAULTS.edges).slice(0, 16),
    start: typeof raw.start === "string" && raw.start.trim() ? raw.start.trim() : DEFAULTS.start,
    mode: asChoice(raw.mode, ["bfs", "dfs"] as const, DEFAULTS.mode),
  }),
  steps: graphTraversalSteps,
  View: GraphTraversalView,
};
