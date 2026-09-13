import { ArrowDefs, Edge, Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asNumber, asStringList, type VizDefinition, type VizStep } from "./types";

/** Disjoint set union with union by rank and path compression. The two optimizations are the interview. */

export type UnionFindParams = { n: number; ops: string[] };
export type UnionFindState = { parent: number[]; rank: number[]; touched: number[]; op: string | null; components: number };

const DEFAULTS: UnionFindParams = { n: 7, ops: ["U:0-1", "U:2-3", "U:1-3", "U:4-5", "F:0", "U:5-6", "U:3-6", "F:6"] };

function frame(state: UnionFindState, kind: VizStep<UnionFindState>["kind"], title: string, explain: string, interview: string): VizStep<UnionFindState> {
  return { title, explain, interview, kind, state: { ...state, parent: [...state.parent], rank: [...state.rank], touched: [...state.touched] } };
}

function root(parent: number[], x: number): number {
  let r = x;
  while (parent[r] !== r) r = parent[r];
  return r;
}

export function unionFindSteps(params: UnionFindParams): VizStep<UnionFindState>[] {
  const steps: VizStep<UnionFindState>[] = [];
  const state: UnionFindState = { parent: Array.from({ length: params.n }, (_, i) => i), rank: Array(params.n).fill(0), touched: [], op: null, components: params.n };
  steps.push(frame(state, "setup", `${params.n} singletons`, "Every element is its own root. parent[x] = x, rank 0.", "Define the structure in one sentence: 'a forest where each tree is a set and the root is the representative; find walks to the root, union links two roots'. Then name the two optimizations up front: union by rank keeps trees shallow, path compression flattens them on the way up."));
  for (const raw of params.ops) {
    const [kind, rest] = raw.split(":");
    state.op = raw;
    if (kind.toUpperCase().startsWith("F")) {
      const x = Number(rest);
      if (!Number.isInteger(x) || x < 0 || x >= params.n) continue;
      const path: number[] = [];
      let r = x;
      while (state.parent[r] !== r) {
        path.push(r);
        r = state.parent[r];
      }
      state.touched = [...path, r];
      for (const node of path) state.parent[node] = r;
      steps.push(frame(state, path.length > 1 ? "decision" : "invariant", `find(${x}) = ${r}${path.length > 1 ? ", compress path" : ""}`, path.length > 1 ? `Walked ${[x, ...path.slice(1), r].join(" → ")}. Every node on the path now points straight at ${r}.` : `${x} is ${x === r ? "a root" : `directly under ${r}`}. Nothing to compress.`, path.length > 1 ? "Path compression: 'the answer for every node on the path is the same root, so I rewrite them all to point at it; the next find is O(1)'. This is what makes the amortized cost near constant." : "A find that is already short is the payoff of the earlier compressions. Say the bound: 'amortized O(α(n)) per operation, effectively constant'."));
      continue;
    }
    const [aRaw, bRaw] = (rest ?? "").split("-").map(Number);
    if (!Number.isInteger(aRaw) || !Number.isInteger(bRaw) || aRaw < 0 || bRaw < 0 || aRaw >= params.n || bRaw >= params.n) continue;
    const ra = root(state.parent, aRaw);
    const rb = root(state.parent, bRaw);
    state.touched = [aRaw, bRaw, ra, rb];
    if (ra === rb) {
      steps.push(frame(state, "decision", `union(${aRaw}, ${bRaw}): same set`, `Both roots are ${ra}. This edge would close a cycle; nothing changes.`, "This is cycle detection for free: 'if two endpoints already share a root, the edge is redundant'. That is Kruskal's algorithm and the 'redundant connection' problem in one line."));
      continue;
    }
    let low = ra;
    let high = rb;
    if (state.rank[ra] > state.rank[rb]) {
      low = rb;
      high = ra;
    }
    state.parent[low] = high;
    if (state.rank[ra] === state.rank[rb]) state.rank[high] += 1;
    state.components -= 1;
    steps.push(frame(state, "invariant", `union(${aRaw}, ${bRaw}): ${low} under ${high}`, `Roots ${ra} and ${rb} differ. Attach the shorter tree (rank ${state.rank[low]}) under the taller (rank ${state.rank[high]}). ${state.components} components remain.`, "Union by rank: 'always hang the shallower tree under the deeper one, so the height grows only when ranks tie; that bounds height by log n'. Without it, a chain of unions can make find O(n)."));
  }
  state.op = null;
  state.touched = [];
  steps.push(frame(state, "result", `${state.components} component${state.components === 1 ? "" : "s"}`, `Remaining roots: ${state.parent.map((p, i) => (p === i ? i : null)).filter((v) => v !== null).join(", ")}. Every element finds its representative in a step or two.`, "Close with when to reach for it: 'dynamic connectivity, counting components, Kruskal's MST, accounts merge, percolation'. And its limit: 'union-find cannot delete edges; for that I need a different structure or offline processing'."));
  return steps;
}

export function UnionFindView({ state, params }: { state: UnionFindState; params: UnionFindParams }) {
  const width = 520;
  const height = 170;
  const spacing = Math.min(70, (width - 60) / Math.max(1, params.n));
  const roots = state.parent.filter((p, i) => p === i);
  const colorFor = (i: number) => {
    const r = root(state.parent, i);
    const palette = ["var(--accent)", "var(--teal)", "#8b5cf6", "var(--coral)", "#eab308", "#06b6d4", "#ec4899"];
    return palette[roots.indexOf(r) % palette.length];
  };
  const pos = (i: number): [number, number] => [40 + i * spacing, state.parent[i] === i ? 50 : 120];
  return (
    <div>
      <Frame width={width} height={height} label="Union-find forest">
        <ArrowDefs />
        {state.parent.map((p, i) => (p === i ? null : <Edge key={i} from={[pos(i)[0], pos(i)[1] - 14]} to={[pos(p)[0], pos(p)[1] + 14]} tone={state.touched.includes(i) ? "active" : "idle"} />))}
        {state.parent.map((p, i) => {
          const [x, y] = pos(i);
          return (
            <g key={i} style={{ transition: "all 200ms" }}>
              <circle cx={x} cy={y} r={14} fill={`color-mix(in srgb, ${colorFor(i)} ${p === i ? 45 : 18}%, transparent)`} stroke={state.touched.includes(i) ? VIZ_COLORS.ink : colorFor(i)} strokeWidth={state.touched.includes(i) ? 2 : 1.25} />
              <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.ink}>
                {i}
              </text>
              {p === i ? (
                <text x={x} y={y - 20} textAnchor="middle" fontSize={9} fill={VIZ_COLORS.muted}>
                  r{state.rank[i]}
                </text>
              ) : null}
            </g>
          );
        })}
        <Label x={20} y={height - 10} tone="ink" weight={600}>
          {state.op ? `op ${state.op}` : "roots on top, rank shown as r"}
        </Label>
        <Label x={width - 20} y={height - 10} anchor="end">
          {state.components} components
        </Label>
      </Frame>
      <Legend items={[{ tone: "accent", label: "touched by this op" }]} />
    </div>
  );
}

export const unionFindViz: VizDefinition<UnionFindParams, UnionFindState> = {
  id: "union-find",
  title: "Union-find with rank and path compression",
  summary: "Unions link roots, finds flatten paths. Same-root unions are cycle detection for free.",
  fields: [
    { key: "n", label: "Elements", kind: "number" },
    { key: "ops", label: "Operations", kind: "text", hint: "U:a-b to union, F:x to find. Comma-separated." },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({ n: asNumber(raw.n, DEFAULTS.n, 2, 10), ops: asStringList(raw.ops, DEFAULTS.ops).slice(0, 16) }),
  steps: unionFindSteps,
  View: UnionFindView,
};
