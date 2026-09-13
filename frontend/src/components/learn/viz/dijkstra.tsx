import { ArrowDefs, Edge, Frame, Legend, VIZ_COLORS } from "./primitives";
import { asStringList, type VizDefinition, type VizStep } from "./types";

/** Dijkstra with a priority queue. The invariant is why a popped node is final; the trade-off is negative edges. */

export type DijkstraParams = { edges: string[]; start: string };
export type DijkstraState = { dist: Record<string, number>; done: string[]; pq: { node: string; dist: number }[]; current: string | null; activeEdge: [string, string] | null; via: Record<string, string> };

const DEFAULTS: DijkstraParams = { edges: ["A-B:4", "A-C:1", "C-B:2", "B-D:5", "C-D:8", "D-E:3", "C-E:10"], start: "A" };

function parse(edges: string[]): { nodes: string[]; adj: Map<string, { to: string; w: number }[]>; negative: boolean } {
  const adj = new Map<string, { to: string; w: number }[]>();
  const nodes: string[] = [];
  let negative = false;
  const add = (n: string) => {
    if (!adj.has(n)) {
      adj.set(n, []);
      nodes.push(n);
    }
  };
  for (const raw of edges) {
    const [pair, weightRaw] = raw.split(":");
    const [a, b] = (pair ?? "").split(/[-–>]+/).map((s) => s.trim());
    const w = Number(weightRaw);
    if (!a || !b || !Number.isFinite(w)) continue;
    add(a);
    add(b);
    adj.get(a)!.push({ to: b, w });
    adj.get(b)!.push({ to: a, w });
    if (w < 0) negative = true;
  }
  return { nodes, adj, negative };
}

function frame(state: DijkstraState, kind: VizStep<DijkstraState>["kind"], title: string, explain: string, interview: string): VizStep<DijkstraState> {
  return { title, explain, interview, kind, state: { ...state, dist: { ...state.dist }, done: [...state.done], pq: state.pq.map((p) => ({ ...p })), via: { ...state.via }, activeEdge: state.activeEdge ? [...state.activeEdge] : null } };
}

export function dijkstraSteps(params: DijkstraParams): VizStep<DijkstraState>[] {
  const { nodes, adj, negative } = parse(params.edges);
  const start = nodes.includes(params.start) ? params.start : nodes[0];
  const steps: VizStep<DijkstraState>[] = [];
  const state: DijkstraState = { dist: Object.fromEntries(nodes.map((n) => [n, Infinity])), done: [], pq: [], current: null, activeEdge: null, via: {} };
  if (!start) return steps;
  state.dist[start] = 0;
  state.pq = [{ node: start, dist: 0 }];
  steps.push(frame(state, "setup", `dist[${start}] = 0, everything else ∞`, "A min-priority queue holds tentative distances. Pop the smallest, settle it, relax its edges.", "State the invariant that makes greedy correct here: 'when a node is popped with the smallest tentative distance, no other path can be shorter, because every other path passes through something at least as far and all edges are non-negative'. That last clause is the whole precondition."));
  let guard = 0;
  while (state.pq.length && guard < 200) {
    guard += 1;
    state.pq.sort((a, b) => a.dist - b.dist);
    const { node, dist } = state.pq.shift()!;
    if (state.done.includes(node)) {
      steps.push(frame({ ...state, current: node }, "decision", `Pop ${node} (${dist}): stale, skip`, `${node} was already settled with a smaller distance. This entry is a leftover from an earlier relaxation.`, "Lazy deletion: 'I leave old entries in the heap and skip them when popped, because Java's PriorityQueue has no decrease-key'. Say it before they ask why the same node appears twice."));
      continue;
    }
    state.done.push(node);
    state.current = node;
    state.activeEdge = null;
    steps.push(frame(state, "invariant", `Settle ${node} at ${dist}`, `${node} is popped with the smallest tentative distance, so ${dist} is final.`, `Say the guarantee as you settle: 'dist[${node}] = ${dist} is optimal now; I will never revisit it'. That is what distinguishes Dijkstra from BFS: BFS settles by hop count, this settles by accumulated weight.`));
    for (const { to, w } of adj.get(node) ?? []) {
      if (state.done.includes(to)) continue;
      const candidate = dist + w;
      state.activeEdge = [node, to];
      if (candidate < state.dist[to]) {
        const old = state.dist[to];
        state.dist[to] = candidate;
        state.via[to] = node;
        state.pq.push({ node: to, dist: candidate });
        steps.push(frame(state, "decision", `Relax ${node}→${to}: ${old === Infinity ? "∞" : old} → ${candidate}`, `${dist} + ${w} = ${candidate} beats the current ${old === Infinity ? "∞" : old}. Update and push.`, "Relaxation is the only update rule: 'if going through the settled node is cheaper, take it'. Each edge is relaxed once from each settled end, so with a binary heap the total is O((V + E) log V)."));
      } else {
        steps.push(frame(state, "decision", `${node}→${to}: ${candidate} ≥ ${state.dist[to]}, keep`, `Going through ${node} costs ${candidate}; the current ${state.dist[to]} is already as good.`, "No update means the existing path is at least as short. Nothing is pushed, so the heap does not grow. Mention that this check is what keeps the heap size bounded by E."));
      }
    }
  }
  state.current = null;
  state.activeEdge = null;
  steps.push(frame(state, negative ? "tradeoff" : "result", negative ? "Negative edge present: result may be wrong" : `Done: ${nodes.map((n) => `${n}=${state.dist[n] === Infinity ? "∞" : state.dist[n]}`).join(", ")}`, negative ? "One of your edges is negative. Dijkstra's invariant does not hold: a later path through the negative edge could be shorter than a settled distance." : "Every reachable node is settled. Paths can be rebuilt by following the via pointers back to the start.", negative ? "This is the trap: 'Dijkstra requires non-negative weights; with negatives I use Bellman-Ford, O(VE), which also detects negative cycles'. Say it before they hand you a negative edge." : "Close with the alternatives: 'unweighted → BFS; negative edges → Bellman-Ford; all pairs on a small dense graph → Floyd-Warshall; a good heuristic → A*'. Choosing the right one is worth more than reciting this one."));
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

export function DijkstraView({ state, params }: { state: DijkstraState; params: DijkstraParams }) {
  const { nodes, adj } = parse(params.edges);
  const width = 280;
  const height = 240;
  const positions = layout(nodes, width, height);
  const seen = new Set<string>();
  const edges: { a: string; b: string; w: number }[] = [];
  for (const [a, list] of adj) for (const { to, w } of list) {
    const key = [a, to].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ a, b: to, w });
  }
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
      <Frame width={width} height={height} label="Weighted graph">
        <ArrowDefs />
        {edges.map(({ a, b, w }) => {
          const [x1, y1] = positions[a];
          const [x2, y2] = positions[b];
          const active = state.activeEdge && ((state.activeEdge[0] === a && state.activeEdge[1] === b) || (state.activeEdge[0] === b && state.activeEdge[1] === a));
          const onTree = state.via[b] === a || state.via[a] === b;
          return (
            <g key={`${a}-${b}`}>
              <Edge from={[x1, y1]} to={[x2, y2]} tone={active ? "active" : onTree ? "ok" : "idle"} />
              <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} textAnchor="middle" fontSize={10} fill={w < 0 ? VIZ_COLORS.coral : VIZ_COLORS.muted}>
                {w}
              </text>
            </g>
          );
        })}
        {nodes.map((node) => {
          const [x, y] = positions[node];
          const settled = state.done.includes(node);
          const d = state.dist[node];
          return (
            <g key={node} style={{ transition: "all 200ms" }}>
              <circle cx={x} cy={y} r={16} fill={state.current === node ? "color-mix(in srgb, var(--accent) 40%, transparent)" : settled ? "color-mix(in srgb, var(--teal) 25%, transparent)" : "var(--steel-900)"} stroke={state.current === node ? VIZ_COLORS.accent : settled ? VIZ_COLORS.teal : VIZ_COLORS.line} strokeWidth={1.5} />
              <text x={x} y={y + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.ink}>
                {node}
              </text>
              <text x={x + 18} y={y - 12} fontSize={9} fill={settled ? VIZ_COLORS.teal : VIZ_COLORS.muted}>
                {d === Infinity ? "∞" : d}
              </text>
            </g>
          );
        })}
      </Frame>
      <div className="space-y-2 text-[12px]">
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Priority queue (min first)</div>
        <div className="font-mono">{[...state.pq].sort((a, b) => a.dist - b.dist).map((p) => `${p.node}:${p.dist}`).join("  ") || "empty"}</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Settled</div>
        <div className="font-mono text-foreground/90">{state.done.join(" → ") || "—"}</div>
        <Legend items={[{ tone: "accent", label: "relaxing" }, { tone: "teal", label: "settled / tree" }]} />
      </div>
    </div>
  );
}

export const dijkstraViz: VizDefinition<DijkstraParams, DijkstraState> = {
  id: "dijkstra",
  title: "Dijkstra's shortest paths",
  summary: "Pop the closest, settle it, relax its edges. Add a negative weight to see the precondition break.",
  fields: [
    { key: "edges", label: "Edges", kind: "text", hint: "A-B:4 means an undirected edge of weight 4." },
    { key: "start", label: "Start", kind: "text" },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({ edges: asStringList(raw.edges, DEFAULTS.edges).slice(0, 16), start: typeof raw.start === "string" && raw.start.trim() ? raw.start.trim() : DEFAULTS.start }),
  steps: dijkstraSteps,
  View: DijkstraView,
};
