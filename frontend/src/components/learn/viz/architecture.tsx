import { ArrowDefs, Box, Edge, Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { type StepKind, type VizDefinition, type VizStep } from "./types";

/**
 * A reusable architecture diagram: boxes on a grid, arrows between them, and a
 * step-through of one request's path. Lessons describe the picture in the directive:
 *
 *   :::viz architecture {"title": "...", "nodes": [{"id":"client","label":"Client","kind":"client","col":0,"row":0}, ...],
 *                        "edges": [{"from":"client","to":"lb"}, ...],
 *                        "steps": [{"title":"...","explain":"...","interview":"...","path":["client>lb","lb>api"]}, ...]}
 *
 * Nothing moves on its own: the reader steps, and one path lights up at a time.
 */

export type ArchKind = "client" | "edge" | "service" | "cache" | "db" | "queue" | "storage" | "external" | "worker";

export type ArchNode = { id: string; label: string; kind: ArchKind; col: number; row: number; note?: string };
export type ArchEdge = { from: string; to: string; label?: string; dashed?: boolean };
export type ArchStepSpec = { title: string; explain: string; interview: string; path: string[]; nodes: string[]; hot: string[]; kind: StepKind };

export type ArchitectureParams = { title: string; nodes: ArchNode[]; edges: ArchEdge[]; steps: ArchStepSpec[] };

export type ArchitectureState = { activeEdges: string[]; activeNodes: string[]; hotNodes: string[]; done: boolean };

const KINDS: ArchKind[] = ["client", "edge", "service", "cache", "db", "queue", "storage", "external", "worker"];
const KIND_LABEL: Record<ArchKind, string> = {
  client: "client",
  edge: "edge",
  service: "service",
  cache: "cache",
  db: "database",
  queue: "queue",
  storage: "storage",
  external: "external",
  worker: "worker",
};
const STEP_KINDS: StepKind[] = ["setup", "invariant", "decision", "tradeoff", "result"];

export const ARCH_DEFAULTS: ArchitectureParams = {
  title: "A typical web service",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "lb", label: "Load balancer", kind: "edge", col: 1, row: 1 },
    { id: "api", label: "API servers", kind: "service", col: 2, row: 1, note: "stateless" },
    { id: "cache", label: "Cache", kind: "cache", col: 3, row: 0 },
    { id: "db", label: "Database", kind: "db", col: 3, row: 1, note: "primary + replica" },
    { id: "queue", label: "Queue", kind: "queue", col: 3, row: 2 },
    { id: "worker", label: "Workers", kind: "worker", col: 4, row: 2 },
  ],
  edges: [
    { from: "client", to: "lb" },
    { from: "lb", to: "api" },
    { from: "api", to: "cache", label: "read first" },
    { from: "api", to: "db" },
    { from: "api", to: "queue", label: "slow work" },
    { from: "queue", to: "worker" },
  ],
  steps: [
    {
      title: "A read arrives",
      explain: "The client's request reaches the load balancer, which picks one API server. Any server will do, because none of them keeps state.",
      interview: "Say why the servers are stateless: it lets the balancer send any request anywhere, and a dead server loses nothing but the requests in flight.",
      path: ["client>lb", "lb>api"],
      nodes: [],
      hot: [],
      kind: "invariant",
    },
    {
      title: "Cache first, database second",
      explain: "The API server checks the cache. On a hit it answers in about a millisecond; on a miss it reads the database and fills the cache.",
      interview: "Give the hit ratio you expect and what the database must handle if the cache is cold. The database is sized for the misses, not the reads.",
      path: ["api>cache", "api>db"],
      nodes: [],
      hot: [],
      kind: "decision",
    },
    {
      title: "Slow work leaves the request path",
      explain: "Anything that is not needed to answer, such as sending an email or resizing an image, goes on the queue. A worker picks it up later.",
      interview: "Name what happens if the worker is slow: the queue grows, the user is not blocked, and you add workers. Then say how you notice the queue growing.",
      path: ["api>queue", "queue>worker"],
      nodes: [],
      hot: [],
      kind: "tradeoff",
    },
    {
      title: "The whole path",
      explain: "Client, balancer, stateless servers, a cache in front of the database, and a queue for slow work. Most designs start here and grow from it.",
      interview: "Close by naming the first thing that breaks at ten times the load, and what you would change. That shows you see the picture as a starting point, not the answer.",
      path: ["client>lb", "lb>api", "api>cache", "api>db", "api>queue", "queue>worker"],
      nodes: [],
      hot: [],
      kind: "result",
    },
  ],
};

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function int(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : fallback;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function parseNodes(raw: unknown): ArchNode[] {
  if (!Array.isArray(raw)) return [];
  const nodes: ArchNode[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const id = str(record.id);
    if (!id || nodes.some((node) => node.id === id)) continue;
    const kind = KINDS.includes(record.kind as ArchKind) ? (record.kind as ArchKind) : "service";
    nodes.push({ id, label: str(record.label, id), kind, col: int(record.col), row: int(record.row), note: str(record.note) || undefined });
  }
  return nodes;
}

function parseEdges(raw: unknown, nodes: ArchNode[]): ArchEdge[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set(nodes.map((node) => node.id));
  const edges: ArchEdge[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const from = str(record.from);
    const to = str(record.to);
    if (!ids.has(from) || !ids.has(to) || from === to) continue;
    edges.push({ from, to, label: str(record.label) || undefined, dashed: Boolean(record.dashed) });
  }
  return edges;
}

function parseSteps(raw: unknown): ArchStepSpec[] {
  if (!Array.isArray(raw)) return [];
  const steps: ArchStepSpec[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const title = str(record.title);
    const explain = str(record.explain);
    if (!title || !explain) continue;
    const kind = STEP_KINDS.includes(record.kind as StepKind) ? (record.kind as StepKind) : "decision";
    steps.push({
      title,
      explain,
      interview: str(record.interview) || `Say out loud what this step costs and what breaks if it fails: ${title.toLowerCase()}.`,
      path: strings(record.path),
      nodes: strings(record.nodes),
      hot: strings(record.hot),
      kind: kind === "setup" ? "invariant" : kind,
    });
  }
  return steps;
}

export function edgeKey(edge: ArchEdge): string {
  return `${edge.from}>${edge.to}`;
}

export function architectureSteps(params: ArchitectureParams): VizStep<ArchitectureState>[] {
  const steps: VizStep<ArchitectureState>[] = [];
  const names = params.nodes.map((node) => node.label).join(", ");
  steps.push({
    title: "The whole picture",
    explain: `${params.title}. The parts: ${names}. Step through one request to see which parts it touches and in what order.`,
    interview: "Before any detail, name every box in one breath and say what each one is for. An interviewer forgives a missing detail, not a missing component.",
    kind: "setup",
    state: { activeEdges: [], activeNodes: [], hotNodes: [], done: false },
  });
  const validEdges = new Set(params.edges.map(edgeKey));
  const validNodes = new Set(params.nodes.map((node) => node.id));
  params.steps.forEach((step, index) => {
    const activeEdges = step.path.filter((key) => validEdges.has(key));
    const endpoints = activeEdges.flatMap((key) => key.split(">"));
    const activeNodes = [...new Set([...endpoints, ...step.nodes.filter((id) => validNodes.has(id))])];
    const hotNodes = step.hot.filter((id) => validNodes.has(id));
    const last = index === params.steps.length - 1;
    steps.push({
      title: step.title,
      explain: step.explain,
      interview: step.interview,
      kind: last ? "result" : step.kind,
      state: { activeEdges, activeNodes, hotNodes, done: last },
    });
  });
  if (steps.length === 1) {
    steps.push({
      title: "Every part in place",
      explain: "No request path was given, so this is the map on its own. Read it left to right: where a request enters, what serves it, and what stores the data.",
      interview: "Walk the interviewer through the picture left to right, and say for each box what would happen to users if it disappeared.",
      kind: "result",
      state: { activeEdges: [], activeNodes: params.nodes.map((node) => node.id), hotNodes: [], done: true },
    });
  }
  return steps;
}

const COL_W = 156;
const ROW_H = 84;
const BOX_W = 124;
const BOX_H = 50;
const PAD = 16;

export function ArchitectureView({ state, params }: { state: ArchitectureState; params: ArchitectureParams }) {
  const cols = Math.max(...params.nodes.map((node) => node.col), 0) + 1;
  const rows = Math.max(...params.nodes.map((node) => node.row), 0) + 1;
  const width = PAD * 2 + cols * COL_W - (COL_W - BOX_W);
  const height = PAD * 2 + rows * ROW_H - (ROW_H - BOX_H) + 18;
  const at = new Map(params.nodes.map((node) => [node.id, { x: PAD + node.col * COL_W, y: PAD + node.row * ROW_H }] as const));
  const active = new Set(state.activeEdges);
  const activeNodes = new Set(state.activeNodes);
  const hot = new Set(state.hotNodes);

  return (
    <div className="space-y-2">
      <Frame width={width} height={height} label={params.title}>
        <ArrowDefs />
        {params.edges.map((edge) => {
          const a = at.get(edge.from);
          const b = at.get(edge.to);
          if (!a || !b) return null;
          const key = edgeKey(edge);
          const on = active.has(key);
          const [from, to] = anchors(a, b);
          const mid: [number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
          return (
            <g key={key}>
              <Edge from={from} to={to} tone={on ? "active" : "idle"} dashed={edge.dashed && !on} />
              {edge.label ? (
                <text x={mid[0]} y={mid[1] - 5} textAnchor="middle" fontSize={9.5} fill={on ? VIZ_COLORS.accent : VIZ_COLORS.muted} fontWeight={on ? 600 : 500}>
                  {edge.label}
                </text>
              ) : null}
            </g>
          );
        })}
        {params.nodes.map((node) => {
          const pos = at.get(node.id)!;
          const tone = hot.has(node.id) ? "hot" : activeNodes.has(node.id) ? "active" : "idle";
          return (
            <Box key={node.id} x={pos.x} y={pos.y} width={BOX_W} height={BOX_H} title={node.label} tone={tone}>
              <text x={pos.x + 10} y={pos.y + 33} fontSize={10} fill={VIZ_COLORS.muted}>
                {KIND_LABEL[node.kind]}
                {node.note ? ` · ${node.note}` : ""}
              </text>
            </Box>
          );
        })}
        <Label x={PAD} y={height - 6} tone="ink" weight={600}>
          {state.done ? "Full path" : state.activeEdges.length ? `${state.activeEdges.length} hop${state.activeEdges.length === 1 ? "" : "s"} on this step` : "Map"}
        </Label>
      </Frame>
      <Legend items={[{ tone: "accent", label: "on this step's path" }, { tone: "coral", label: "under stress" }]} />
    </div>
  );
}

function anchors(a: { x: number; y: number }, b: { x: number; y: number }): [[number, number], [number, number]] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
    const fromX = dx > 0 ? a.x + BOX_W : a.x;
    const toX = dx > 0 ? b.x : b.x + BOX_W;
    return [
      [fromX, a.y + BOX_H / 2],
      [toX, b.y + BOX_H / 2],
    ];
  }
  const fromY = dy > 0 ? a.y + BOX_H : a.y;
  const toY = dy > 0 ? b.y : b.y + BOX_H;
  return [
    [a.x + BOX_W / 2, fromY],
    [b.x + BOX_W / 2, toY],
  ];
}

export const architectureViz: VizDefinition<ArchitectureParams, ArchitectureState> = {
  id: "architecture",
  title: "Architecture, one request at a time",
  summary: "The boxes and arrows of the design, with the path one request takes lit up step by step.",
  fields: [],
  defaults: ARCH_DEFAULTS,
  parse: (raw) => {
    const nodes = parseNodes(raw.nodes);
    if (nodes.length === 0) return ARCH_DEFAULTS;
    const edges = parseEdges(raw.edges, nodes);
    const steps = parseSteps(raw.steps);
    return { title: str(raw.title, "Architecture"), nodes, edges, steps };
  },
  steps: architectureSteps,
  View: ArchitectureView,
};
