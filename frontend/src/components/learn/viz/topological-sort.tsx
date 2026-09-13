import { ArrowDefs, Edge, Frame, Legend, VIZ_COLORS } from "./primitives";
import { asStringList, type VizDefinition, type VizStep } from "./types";

/** Kahn's algorithm. In-degrees, a queue of ready nodes, and the cycle check you get for free. */

export type TopoParams = { edges: string[] };
export type TopoState = { indegree: Record<string, number>; queue: string[]; order: string[]; current: string | null; activeEdge: [string, string] | null; cycle: boolean };

const DEFAULTS: TopoParams = { edges: ["A>B", "A>C", "B>D", "C>D", "D>E", "F>C"] };

function parse(edges: string[]): { nodes: string[]; out: Map<string, string[]> } {
  const out = new Map<string, string[]>();
  const nodes: string[] = [];
  const add = (n: string) => {
    if (!out.has(n)) {
      out.set(n, []);
      nodes.push(n);
    }
  };
  for (const raw of edges) {
    const [a, b] = raw.split(/[>→-]+/).map((s) => s.trim());
    if (!a || !b) continue;
    add(a);
    add(b);
    if (!out.get(a)!.includes(b)) out.get(a)!.push(b);
  }
  return { nodes, out };
}

function frame(state: TopoState, kind: VizStep<TopoState>["kind"], title: string, explain: string, interview: string): VizStep<TopoState> {
  return { title, explain, interview, kind, state: { ...state, indegree: { ...state.indegree }, queue: [...state.queue], order: [...state.order], activeEdge: state.activeEdge ? [...state.activeEdge] : null } };
}

export function topologicalSortSteps(params: TopoParams): VizStep<TopoState>[] {
  const { nodes, out } = parse(params.edges);
  const steps: VizStep<TopoState>[] = [];
  const state: TopoState = { indegree: Object.fromEntries(nodes.map((n) => [n, 0])), queue: [], order: [], current: null, activeEdge: null, cycle: false };
  for (const [, targets] of out) for (const t of targets) state.indegree[t] += 1;
  steps.push(frame(state, "setup", "Count in-degrees", `In-degree is the number of prerequisites still unmet: ${nodes.map((n) => `${n}=${state.indegree[n]}`).join(", ")}.`, "Frame the problem as dependencies: 'an edge A→B means A must come before B'. Then the invariant Kahn's algorithm keeps: 'a node is in the queue exactly when all of its prerequisites have already been emitted'."));
  state.queue = nodes.filter((n) => state.indegree[n] === 0);
  steps.push(frame(state, "invariant", `Ready: [${state.queue.join(", ")}]`, "Every node with in-degree 0 has nothing before it, so it can go first.", "Say why any of them can go first: 'if two nodes are both ready, either order is valid; a topological order is not unique'. If they want a specific one, a min-heap instead of a queue gives the lexicographically smallest."));
  let guard = 0;
  while (state.queue.length && guard < 100) {
    guard += 1;
    const node = state.queue.shift()!;
    state.current = node;
    state.order.push(node);
    state.activeEdge = null;
    steps.push(frame(state, "invariant", `Emit ${node}`, `Order so far: ${state.order.join(" → ")}.`, "Everything emitted before this node is either a prerequisite of it or unrelated. That is the correctness argument: 'a node is emitted only after its in-degree hits zero, which happens only after all its predecessors were emitted'."));
    for (const next of out.get(node) ?? []) {
      state.indegree[next] -= 1;
      state.activeEdge = [node, next];
      const ready = state.indegree[next] === 0;
      if (ready) state.queue.push(next);
      steps.push(frame(state, "decision", `${next}: in-degree ${state.indegree[next]}${ready ? ", now ready" : ""}`, `Remove the edge ${node}→${next}. ${ready ? `${next} has no prerequisites left; enqueue it.` : `${next} still waits on ${state.indegree[next]} other${state.indegree[next] === 1 ? "" : "s"}.`}`, "Each edge is removed exactly once, so the whole thing is O(V + E). Say it while you decrement, not at the end."));
    }
  }
  state.current = null;
  state.activeEdge = null;
  state.cycle = state.order.length < nodes.length;
  steps.push(frame(state, state.cycle ? "tradeoff" : "result", state.cycle ? `Only ${state.order.length} of ${nodes.length} emitted: cycle` : `Order: ${state.order.join(" → ")}`, state.cycle ? `Nodes never reached in-degree 0: ${nodes.filter((n) => !state.order.includes(n)).join(", ")}. They wait on each other.` : "Every node was emitted. The order respects every edge.", state.cycle ? "This is the free cycle check: 'if the output is shorter than the node count, the leftover nodes form or depend on a cycle'. Course schedule, build systems, and deadlock detection all reduce to this." : "Close with the alternative: 'DFS post-order reversed gives the same result; I use Kahn's when I also need to detect cycles or process level by level'."));
  return steps;
}

function layout(nodes: string[], width: number, height: number): Record<string, [number, number]> {
  const positions: Record<string, [number, number]> = {};
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 30;
  nodes.forEach((node, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, nodes.length)) * Math.PI * 2;
    positions[node] = [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });
  return positions;
}

export function TopologicalSortView({ state, params }: { state: TopoState; params: TopoParams }) {
  const { nodes, out } = parse(params.edges);
  const width = 280;
  const height = 230;
  const positions = layout(nodes, width, height);
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
      <Frame width={width} height={height} label="Dependency graph">
        <ArrowDefs />
        {[...out.entries()].flatMap(([a, targets]) =>
          targets.map((b) => {
            const [x1, y1] = positions[a];
            const [x2, y2] = positions[b];
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.hypot(dx, dy) || 1;
            const active = state.activeEdge?.[0] === a && state.activeEdge?.[1] === b;
            const done = state.order.includes(a);
            return <Edge key={`${a}-${b}`} from={[x1 + (dx / len) * 17, y1 + (dy / len) * 17]} to={[x2 - (dx / len) * 19, y2 - (dy / len) * 19]} tone={active ? "active" : done ? "ok" : "idle"} dashed={done && !active} />;
          }),
        )}
        {nodes.map((node) => {
          const [x, y] = positions[node];
          const emitted = state.order.includes(node);
          const ready = state.queue.includes(node);
          const stroke = state.current === node ? VIZ_COLORS.accent : emitted ? VIZ_COLORS.teal : ready ? VIZ_COLORS.accent : VIZ_COLORS.line;
          return (
            <g key={node} style={{ transition: "all 200ms" }}>
              <circle cx={x} cy={y} r={16} fill={state.current === node ? "color-mix(in srgb, var(--accent) 40%, transparent)" : emitted ? "color-mix(in srgb, var(--teal) 25%, transparent)" : ready ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--steel-900)"} stroke={stroke} strokeWidth={1.5} />
              <text x={x} y={y + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.ink}>
                {node}
              </text>
              <text x={x + 18} y={y - 12} fontSize={9} fill={state.indegree[node] === 0 ? VIZ_COLORS.teal : VIZ_COLORS.muted}>
                in {state.indegree[node]}
              </text>
            </g>
          );
        })}
      </Frame>
      <div className="space-y-2 text-[12px]">
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Ready queue</div>
        <div className="font-mono">{state.queue.join(", ") || "empty"}</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Order</div>
        <div className="font-mono text-foreground/90">{state.order.join(" → ") || "—"}</div>
        {state.cycle ? <div className="font-semibold text-coral">cycle detected</div> : null}
        <Legend items={[{ tone: "accent", label: "ready / current" }, { tone: "teal", label: "emitted" }]} />
      </div>
    </div>
  );
}

export const topologicalSortViz: VizDefinition<TopoParams, TopoState> = {
  id: "topological-sort",
  title: "Topological sort (Kahn's algorithm)",
  summary: "Emit whatever has no prerequisites left. If the output is short, there is a cycle.",
  fields: [{ key: "edges", label: "Edges", kind: "text", hint: "A>B means A before B. Try adding E>A." }],
  defaults: DEFAULTS,
  parse: (raw) => ({ edges: asStringList(raw.edges, DEFAULTS.edges).slice(0, 16) }),
  steps: topologicalSortSteps,
  View: TopologicalSortView,
};
