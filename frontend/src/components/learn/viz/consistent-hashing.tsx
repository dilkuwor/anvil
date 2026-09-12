import { Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asNumber, asStringList, type VizDefinition, type VizStep } from "./types";

/**
 * Keys on a hash ring. The frames make the interviewer's comparison explicit: modulo hashing
 * remaps almost every key when a node joins; the ring moves only the keys between the new
 * node and its predecessor. Virtual nodes are the follow-up.
 */

export type ConsistentHashingParams = { nodes: string[]; keys: string[]; add: string; virtual: number };

export type ConsistentHashingState = {
  ring: { label: string; angle: number; node: string }[];
  keys: { key: string; angle: number; owner: string | null; moved: boolean }[];
  added: string | null;
  highlightRange: [number, number] | null;
  modulo: Record<string, string> | null;
};

const DEFAULTS: ConsistentHashingParams = { nodes: ["N1", "N2", "N3"], keys: ["user:7", "user:19", "post:3", "post:44", "cart:5", "cart:61", "feed:2", "feed:90"], add: "N4", virtual: 1 };

/** Deterministic string hash → angle in degrees. Not cryptographic; it only needs to be stable and spread. */
export function hashAngle(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return (hash % 3600) / 10;
}

function ringFor(nodes: string[], virtual: number): ConsistentHashingState["ring"] {
  const ring: ConsistentHashingState["ring"] = [];
  for (const node of nodes) {
    for (let replica = 0; replica < virtual; replica += 1) {
      const label = virtual > 1 ? `${node}#${replica}` : node;
      ring.push({ label, angle: hashAngle(label), node });
    }
  }
  return ring.sort((a, b) => a.angle - b.angle);
}

function ownerOf(angle: number, ring: ConsistentHashingState["ring"]): string | null {
  if (!ring.length) return null;
  const next = ring.find((point) => point.angle >= angle) ?? ring[0];
  return next.node;
}

function frame(state: ConsistentHashingState, kind: VizStep<ConsistentHashingState>["kind"], title: string, explain: string, interview: string): VizStep<ConsistentHashingState> {
  return { title, explain, interview, kind, state: { ...state, ring: state.ring.map((point) => ({ ...point })), keys: state.keys.map((key) => ({ ...key })), modulo: state.modulo ? { ...state.modulo } : null } };
}

export function consistentHashingSteps(params: ConsistentHashingParams): VizStep<ConsistentHashingState>[] {
  const steps: VizStep<ConsistentHashingState>[] = [];
  const nodes = params.nodes.filter((node) => node !== params.add);
  const state: ConsistentHashingState = { ring: ringFor(nodes, params.virtual), keys: params.keys.map((key) => ({ key, angle: hashAngle(key), owner: null, moved: false })), added: null, highlightRange: null, modulo: null };

  steps.push(
    frame(
      state,
      "setup",
      `${nodes.length} nodes on the ring`,
      `Each node is hashed to a point on a circle${params.virtual > 1 ? `, ${params.virtual} points each (virtual nodes)` : ""}. Keys will be hashed to the same circle.`,
      "Start with why a ring at all: 'hash(key) mod N works until N changes; then almost every key maps to a different node and the cache or shard is effectively empty'. The ring exists to make membership changes cheap.",
    ),
  );

  state.keys = state.keys.map((key) => ({ ...key, owner: ownerOf(key.angle, state.ring) }));
  const counts = countByOwner(state.keys);
  steps.push(
    frame(
      state,
      "invariant",
      "Each key belongs to the next node clockwise",
      `Place the ${state.keys.length} keys. Ownership: ${Object.entries(counts).map(([node, count]) => `${node}=${count}`).join(", ")}.`,
      "State the lookup rule and its cost: 'walk clockwise from the key's point to the first node; with the ring stored sorted that is a binary search, O(log N)'. Then point at the imbalance if you see one: few nodes means uneven arcs, which is the virtual-node conversation.",
    ),
  );

  const modulo: Record<string, string> = {};
  const moduloAfter: Record<string, string> = {};
  const allNodes = [...nodes, params.add];
  for (const key of state.keys) {
    const bucket = Math.floor(key.angle * 10);
    modulo[key.key] = nodes[bucket % nodes.length];
    moduloAfter[key.key] = allNodes[bucket % allNodes.length];
  }
  const moduloMoved = state.keys.filter((key) => modulo[key.key] !== moduloAfter[key.key]).length;
  state.modulo = modulo;
  steps.push(
    frame(
      state,
      "tradeoff",
      `Baseline: hash mod ${nodes.length}`,
      `With plain modulo hashing, adding one node changes the divisor to ${allNodes.length}. Here that would move ${moduloMoved} of ${state.keys.length} keys.`,
      `Give the number: 'with mod N, adding a node remaps about (N−1)/N of keys, ${moduloMoved}/${state.keys.length} in this example, which is a cold cache or a full reshard'. This is the sentence that earns the ring.`,
    ),
  );
  state.modulo = null;

  const before = new Map(state.keys.map((key) => [key.key, key.owner]));
  state.ring = ringFor([...nodes, params.add], params.virtual);
  state.added = params.add;
  const addedPoints = state.ring.filter((point) => point.node === params.add);
  const first = addedPoints[0];
  const predecessor = first ? [...state.ring].reverse().find((point) => point.angle < first.angle) ?? state.ring[state.ring.length - 1] : null;
  state.highlightRange = first && predecessor ? [predecessor.angle, first.angle] : null;
  steps.push(
    frame(
      state,
      "decision",
      `Add ${params.add} to the ring`,
      `${params.add} lands at ${addedPoints.map((point) => `${Math.round(point.angle)}°`).join(", ")}. Only keys between its predecessor and ${params.add} change owner; everything else keeps its node.`,
      "Say the bound: 'adding a node moves about K/N keys, only those in the arc it now owns'. Then say where they come from: 'all from one neighbour, which is why a single new node does not spread load evenly and why virtual nodes matter'.",
    ),
  );

  state.keys = state.keys.map((key) => {
    const owner = ownerOf(key.angle, state.ring);
    return { ...key, owner, moved: before.get(key.key) !== owner };
  });
  const moved = state.keys.filter((key) => key.moved);
  steps.push(
    frame(
      state,
      "result",
      `${moved.length} of ${state.keys.length} keys moved`,
      `Moved: ${moved.map((key) => key.key).join(", ") || "none"}. Modulo hashing would have moved ${moduloMoved}.`,
      params.virtual > 1
        ? `With ${params.virtual} virtual nodes each physical node owns several small arcs, so the moved keys came from several neighbours instead of one. Say the trade-off: 'more virtual nodes means smoother balance and a bigger ring to search and gossip; 100–200 per node is the usual range'.`
        : "Close with the two follow-ups: 'a hot key is still a hot key; the ring balances key count, not traffic, so I choose the shard key to avoid celebrities', and 'with one point per node, a departed node dumps its whole arc on one neighbour; virtual nodes spread that'. Set virtual nodes above 1 to see it.",
    ),
  );
  return steps;
}

function countByOwner(keys: ConsistentHashingState["keys"]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const key of keys) {
    if (!key.owner) continue;
    counts[key.owner] = (counts[key.owner] ?? 0) + 1;
  }
  return counts;
}

const NODE_COLORS = ["var(--accent)", "var(--teal)", "#8b5cf6", "var(--coral)", "#eab308", "#06b6d4"];

export function ConsistentHashingView({ state, params }: { state: ConsistentHashingState; params: ConsistentHashingParams }) {
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 110;
  const allNodes = [...params.nodes.filter((node) => node !== params.add), params.add];
  const colorOf = (node: string | null) => (node ? NODE_COLORS[allNodes.indexOf(node) % NODE_COLORS.length] : VIZ_COLORS.line);
  const point = (angle: number, r: number): [number, number] => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return [cx + Math.cos(rad) * r, cy + Math.sin(rad) * r];
  };
  const arc = state.highlightRange
    ? (() => {
        const [from, to] = state.highlightRange;
        const start = point(from, radius);
        const end = point(to, radius);
        const sweep = (to - from + 360) % 360;
        return `M ${start[0]} ${start[1]} A ${radius} ${radius} 0 ${sweep > 180 ? 1 : 0} 1 ${end[0]} ${end[1]}`;
      })()
    : null;
  const counts = countByOwner(state.keys);
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px]">
      <Frame width={size} height={size} label="Consistent hashing ring">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke={VIZ_COLORS.line} strokeWidth={1.5} />
        {arc ? <path d={arc} fill="none" stroke={colorOf(state.added)} strokeWidth={6} opacity={0.35} /> : null}
        {state.keys.map((key) => {
          const [x, y] = point(key.angle, radius);
          return (
            <g key={key.key} style={{ transition: "all 200ms" }}>
              <circle cx={x} cy={y} r={key.moved ? 6 : 4.5} fill={colorOf(key.owner)} stroke={key.moved ? VIZ_COLORS.ink : "none"} strokeWidth={1.5} />
              {state.modulo ? (
                <text x={x} y={y - 9} textAnchor="middle" fontSize={8} fill={VIZ_COLORS.muted}>
                  {key.key} → {state.modulo[key.key]}
                </text>
              ) : null}
            </g>
          );
        })}
        {state.ring.map((node) => {
          const [x, y] = point(node.angle, radius);
          const [lx, ly] = point(node.angle, radius + 22);
          return (
            <g key={node.label} style={{ transition: "all 200ms" }}>
              <rect x={x - 7} y={y - 7} width={14} height={14} rx={3} fill={colorOf(node.node)} stroke={VIZ_COLORS.ink} strokeWidth={node.node === state.added ? 2 : 0.5} />
              <text x={lx} y={ly + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={colorOf(node.node)}>
                {node.label}
              </text>
            </g>
          );
        })}
        <Label x={cx} y={cy + 4} anchor="middle" tone="ink" weight={600} size={12}>
          {state.modulo ? "hash mod N" : `${state.ring.length} points`}
        </Label>
      </Frame>
      <div className="space-y-2 text-[12px]">
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Keys per node</div>
        <ul className="space-y-1">
          {allNodes
            .filter((node) => state.ring.some((point) => point.node === node))
            .map((node) => (
              <li key={node} className="flex items-center justify-between gap-2 font-mono">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: colorOf(node) }} />
                  {node}
                </span>
                <span>{counts[node] ?? 0}</span>
              </li>
            ))}
        </ul>
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Moved keys</div>
        <div className="font-mono text-[12px] text-foreground/90">{state.keys.filter((key) => key.moved).map((key) => key.key).join(", ") || "—"}</div>
        <Legend items={[{ tone: "idle", label: "ringed dot = moved" }]} />
      </div>
    </div>
  );
}

export const consistentHashingViz: VizDefinition<ConsistentHashingParams, ConsistentHashingState> = {
  id: "consistent-hashing",
  title: "Consistent hashing",
  summary: "Add a node and count what moves. Compare with plain modulo hashing, then turn on virtual nodes.",
  fields: [
    { key: "nodes", label: "Nodes", kind: "text", hint: "Comma-separated." },
    { key: "keys", label: "Keys", kind: "text", hint: "Comma-separated." },
    { key: "add", label: "Node to add", kind: "text" },
    { key: "virtual", label: "Virtual nodes per node", kind: "number", hint: "1 shows the imbalance; 4 or more smooths it." },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({
    nodes: asStringList(raw.nodes, DEFAULTS.nodes).slice(0, 6),
    keys: asStringList(raw.keys, DEFAULTS.keys).slice(0, 16),
    add: typeof raw.add === "string" && raw.add.trim() ? raw.add.trim() : DEFAULTS.add,
    virtual: asNumber(raw.virtual, DEFAULTS.virtual, 1, 8),
  }),
  steps: consistentHashingSteps,
  View: ConsistentHashingView,
  simulatorHref: "/system-design/simulator?sample=twitter-feed",
};
