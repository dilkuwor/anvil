import {
  ArrowDefs,
  Edge,
  Frame,
  Label,
  Legend,
  VIZ_COLORS,
} from "./primitives";
import { asNumber, type VizDefinition, type VizStep } from "./types";

/**
 * The scaling decision sequence, walked with the reader's own numbers: writes first, then reads,
 * then whether the reads are cacheable, then whether the cache itself is too big for one node.
 * The reader steps; the path lights up one decision at a time.
 */

export type ScalingDecisionParams = {
  writes: number;
  reads: number;
  hitRate: number;
};

export type NodeId =
  "q1" | "s1" | "q2" | "baseline" | "c1" | "s2" | "s3" | "q3" | "s4" | "s5";
export type NodeTone = "idle" | "active" | "hot" | "ok";
export type DecisionNode = {
  id: NodeId;
  title: string;
  detail: string;
  tone: NodeTone;
};
export type DecisionEdge = {
  from: NodeId;
  to: NodeId;
  label: string;
  tone: "idle" | "active" | "hot" | "ok";
};

export type ScalingDecisionState = {
  nodes: DecisionNode[];
  edges: DecisionEdge[];
  footer: string;
  plan: string[];
};

export const WRITE_TRIGGER = 3000;
export const READ_TRIGGER = 5000;
export const CACHE_HIT_TRIGGER = 0.75;
export const CACHE_OPS_TRIGGER = 100_000;

const DEFAULTS: ScalingDecisionParams = {
  writes: 1500,
  reads: 40_000,
  hitRate: 0.85,
};

const NODE_TITLES: Record<NodeId, string> = {
  q1: "Writes over 3k/s?",
  s1: "Scale writes",
  q2: "Reads over 5k/s?",
  baseline: "One node is fine",
  c1: "Cacheable?",
  s2: "Cache in front",
  s3: "Replicas + pooler",
  q3: "Cache over 100k/s?",
  s4: "Cluster + L1 cache",
  s5: "One cache node",
};

const EDGES: Omit<DecisionEdge, "tone">[] = [
  { from: "q1", to: "s1", label: "yes" },
  { from: "q1", to: "q2", label: "no" },
  { from: "q2", to: "baseline", label: "no" },
  { from: "q2", to: "c1", label: "yes" },
  { from: "c1", to: "s3", label: "no" },
  { from: "c1", to: "s2", label: "yes" },
  { from: "s2", to: "q3", label: "" },
  { from: "q3", to: "s4", label: "yes" },
  { from: "q3", to: "s5", label: "no" },
];

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function initial(): ScalingDecisionState {
  return {
    nodes: (Object.keys(NODE_TITLES) as NodeId[]).map((id) => ({
      id,
      title: NODE_TITLES[id],
      detail: "",
      tone: "idle",
    })),
    edges: EDGES.map((edge) => ({ ...edge, tone: "idle" })),
    footer: "",
    plan: [],
  };
}

function snapshot(state: ScalingDecisionState): ScalingDecisionState {
  return {
    ...state,
    nodes: state.nodes.map((n) => ({ ...n })),
    edges: state.edges.map((e) => ({ ...e })),
    plan: [...state.plan],
  };
}

function frame(
  state: ScalingDecisionState,
  kind: VizStep<ScalingDecisionState>["kind"],
  title: string,
  explain: string,
  interview: string,
): VizStep<ScalingDecisionState> {
  return { title, explain, interview, kind, state: snapshot(state) };
}

function setNode(
  state: ScalingDecisionState,
  id: NodeId,
  patch: Partial<Omit<DecisionNode, "id">>,
) {
  state.nodes = state.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n));
}

function setEdge(
  state: ScalingDecisionState,
  from: NodeId,
  to: NodeId,
  tone: DecisionEdge["tone"],
) {
  state.edges = state.edges.map((e) =>
    e.from === from && e.to === to ? { ...e, tone } : e,
  );
}

export function scalingDecisionSteps(
  params: ScalingDecisionParams,
): VizStep<ScalingDecisionState>[] {
  const { writes, reads, hitRate } = params;
  const steps: VizStep<ScalingDecisionState>[] = [];
  const state = initial();
  state.footer = `${fmt(writes)} writes/s · ${fmt(reads)} reads/s · hit rate ${Math.round(hitRate * 100)}%`;
  steps.push(
    frame(
      state,
      "setup",
      "Start from the numbers",
      `Peak traffic is ${fmt(writes)} writes and ${fmt(reads)} reads per second, and about ${Math.round(hitRate * 100)}% of reads would hit a cache. The sequence asks four questions in order and stops at the first threshold that is not crossed.`,
      "Say the order out loud before answering: 'writes first, because only sharding or a different store fixes a write ceiling; then reads; then whether they cache; then whether the cache itself needs a cluster.' The order is the point of the model.",
    ),
  );

  // Q1: writes
  setNode(state, "q1", { tone: "active", detail: `${fmt(writes)} writes/s` });
  steps.push(
    frame(
      state,
      "decision",
      "Question 1: are writes past one primary?",
      `One relational primary is comfortable up to roughly ${fmt(WRITE_TRIGGER)} writes per second. Peak here is ${fmt(writes)}.`,
      "'A single primary takes every write; replicas do not help. Its comfort zone is one to three thousand writes per second, and the trigger to move is three to five thousand.' Give the number before the verdict.",
    ),
  );
  if (writes > WRITE_TRIGGER) {
    setNode(state, "q1", {
      tone: "hot",
      detail: `${fmt(writes)} > ${fmt(WRITE_TRIGGER)}`,
    });
    setEdge(state, "q1", "s1", "hot");
    setNode(state, "s1", {
      tone: "hot",
      detail: "shard · wide-column · log",
    });
    state.plan.push(
      `Writes ${fmt(writes)}/s: shard by key, or move the write path to a wide-column store, or buffer bursts through a log`,
    );
    steps.push(
      frame(
        state,
        "decision",
        "Yes: the write path must change first",
        `${fmt(writes)} writes per second is past the trigger. Nothing on the read side fixes this: the write path shards by key, moves to a wide-column store, or buffers bursts through a log.`,
        "'Twenty thousand writes per second is past a single primary, so the write path shards by user id.' Then say which of the three moves fits: sharding keeps SQL, a wide-column store scales appends, a log smooths bursts.",
      ),
    );
    setNode(state, "q1", { tone: "ok" });
    setEdge(state, "q1", "s1", "ok");
    setNode(state, "s1", { tone: "ok" });
  } else {
    setNode(state, "q1", {
      tone: "ok",
      detail: `${fmt(writes)} ≤ ${fmt(WRITE_TRIGGER)}`,
    });
    setEdge(state, "q1", "q2", "ok");
    steps.push(
      frame(
        state,
        "invariant",
        "No: writes stay on one primary",
        `${fmt(writes)} writes per second is inside the comfort zone, so the write path is not the problem and the question moves to reads.`,
        "'Writes are fine at this scale, so I keep one primary and do not shard.' Saying what you are not doing, with the number, is as strong as the moves you make.",
      ),
    );
  }

  // Q2: reads
  setNode(state, "q2", { tone: "active", detail: `${fmt(reads)} reads/s` });
  if (writes > WRITE_TRIGGER) setEdge(state, "q1", "q2", "ok");
  steps.push(
    frame(
      state,
      "decision",
      "Question 2: are reads past one node?",
      `One relational node serves about ${fmt(READ_TRIGGER)} to 10,000 indexed reads per second comfortably. Peak here is ${fmt(reads)}.`,
      "'Under five thousand reads per second one node is enough, and I would not add a cache or replicas without a number that says so.' Interviewers mark down components that nothing justifies.",
    ),
  );
  if (reads <= READ_TRIGGER) {
    setNode(state, "q2", {
      tone: "ok",
      detail: `${fmt(reads)} ≤ ${fmt(READ_TRIGGER)}`,
    });
    setEdge(state, "q2", "baseline", "ok");
    setNode(state, "baseline", { tone: "ok", detail: "no cache, no replicas" });
    state.plan.push(
      `Reads ${fmt(reads)}/s: one relational node, no cache and no replicas`,
    );
    steps.push(
      frame(
        state,
        "result",
        "One node is comfortable: stop here",
        `${fmt(reads)} reads per second is inside one node's comfort zone. The read path stays as it is. Plan: ${state.plan.join("; ")}.`,
        "Close with the decision the numbers forced: 'one primary handles this read load, so no cache and no replicas yet; the first thing to watch as we grow is the read rate crossing five thousand per second.'",
      ),
    );
    return steps;
  }
  setNode(state, "q2", {
    tone: "hot",
    detail: `${fmt(reads)} > ${fmt(READ_TRIGGER)}`,
  });
  setEdge(state, "q2", "c1", "hot");
  steps.push(
    frame(
      state,
      "decision",
      "Yes: reads need help",
      `${fmt(reads)} reads per second is past one node. The next question decides how: a cache if the reads repeat, replicas if they do not.`,
      "'Reads are past one node, so the question becomes whether they repeat. A cache absorbs repeated reads; replicas spread any read.' Name both options before choosing.",
    ),
  );
  setNode(state, "q2", { tone: "ok" });
  setEdge(state, "q2", "c1", "ok");

  // C1: cacheable
  setNode(state, "c1", {
    tone: "active",
    detail: `hit rate ${Math.round(hitRate * 100)}%`,
  });
  steps.push(
    frame(
      state,
      "decision",
      "Question 3: would a cache hit most of the time?",
      `The test is a hit rate above about ${Math.round(CACHE_HIT_TRIGGER * 100)}%. Repeated reads of the same profiles, timelines, or lookups pass it; unique, must-be-fresh queries do not. Here the estimate is ${Math.round(hitRate * 100)}%.`,
      "'Feed reads repeat heavily, so I expect a hit rate above eighty percent.' Give the reason for the hit rate, not just the number: interviewers want to hear why the reads repeat.",
    ),
  );
  if (hitRate < CACHE_HIT_TRIGGER) {
    setNode(state, "c1", {
      tone: "hot",
      detail: `${Math.round(hitRate * 100)}% < ${Math.round(CACHE_HIT_TRIGGER * 100)}%`,
    });
    setEdge(state, "c1", "s3", "hot");
    const replicas = Math.max(1, Math.ceil(reads / 15_000));
    setNode(state, "s3", {
      tone: "hot",
      detail: `~${replicas} replica${replicas === 1 ? "" : "s"} + PgBouncer`,
    });
    state.plan.push(
      `Reads ${fmt(reads)}/s with a low hit rate: about ${replicas} read replica${replicas === 1 ? "" : "s"} plus a connection pooler`,
    );
    steps.push(
      frame(
        state,
        "tradeoff",
        "No: read replicas, and pool the connections",
        `A cache would miss too often to help. Replicas serve any query at roughly 10,000 to 20,000 reads per second each, so ${fmt(reads)} reads per second needs about ${replicas}. A pooler keeps their connections bounded.`,
        "'The reads do not repeat, so replicas rather than a cache; about one replica per fifteen thousand reads per second, and I watch replication lag against the freshness SLA, routing reads that must be fresh to the primary.'",
      ),
    );
    setNode(state, "c1", { tone: "ok" });
    setEdge(state, "c1", "s3", "ok");
    setNode(state, "s3", { tone: "ok" });
    steps.push(
      frame(
        state,
        "result",
        "Plan decided",
        `Plan: ${state.plan.join("; ")}.`,
        "Close by repeating each number with its move, in the order the sequence asked them. That is the whole justification for the boxes on the whiteboard.",
      ),
    );
    return steps;
  }
  setNode(state, "c1", {
    tone: "hot",
    detail: `${Math.round(hitRate * 100)}% ≥ ${Math.round(CACHE_HIT_TRIGGER * 100)}%`,
  });
  setEdge(state, "c1", "s2", "hot");
  const absorbed = reads * hitRate;
  const leftover = reads - absorbed;
  setNode(state, "s2", {
    tone: "hot",
    detail: `~${fmt(absorbed)}/s hit · ${fmt(leftover)}/s to DB`,
  });
  state.plan.push(
    `Reads ${fmt(reads)}/s at ${Math.round(hitRate * 100)}% hit rate: a cache absorbs ~${fmt(absorbed)}/s and the database sees ~${fmt(leftover)}/s`,
  );
  steps.push(
    frame(
      state,
      "decision",
      "Yes: put a cache in front",
      `At a ${Math.round(hitRate * 100)}% hit rate the cache absorbs about ${fmt(absorbed)} reads per second and the database sees about ${fmt(leftover)}${leftover > READ_TRIGGER ? ", which still needs replicas" : ", which one node handles"}.`,
      "'A cache at eighty-five percent takes the database from forty thousand reads per second to six thousand.' Then say the cost: the first read after a write misses, and a cache outage sends the full load to the database.",
    ),
  );
  setNode(state, "c1", { tone: "ok" });
  setEdge(state, "c1", "s2", "ok");
  setNode(state, "s2", { tone: "ok" });

  // Q3: cache size
  setEdge(state, "s2", "q3", "ok");
  setNode(state, "q3", { tone: "active", detail: `~${fmt(absorbed)} ops/s` });
  steps.push(
    frame(
      state,
      "decision",
      "Question 4: is the cache itself too big for one node?",
      `One Redis node handles about ${fmt(CACHE_OPS_TRIGGER)} operations per second. The cache here would serve about ${fmt(absorbed)}.`,
      "'One Redis node does about a hundred thousand operations per second, so I divide the cache load by that and round up.' Add the hot-key caveat: a single key above thirty thousand reads per second needs an in-process cache, not more shards.",
    ),
  );
  if (absorbed > CACHE_OPS_TRIGGER) {
    const nodes = Math.ceil(absorbed / CACHE_OPS_TRIGGER);
    setNode(state, "q3", {
      tone: "hot",
      detail: `${fmt(absorbed)} > ${fmt(CACHE_OPS_TRIGGER)}`,
    });
    setEdge(state, "q3", "s4", "hot");
    setNode(state, "s4", {
      tone: "hot",
      detail: `cluster of ~${nodes} · L1 hot keys`,
    });
    state.plan.push(
      `Cache ${fmt(absorbed)} ops/s: a Redis Cluster of about ${nodes} primaries, plus an in-process cache for any single hot key`,
    );
    steps.push(
      frame(
        state,
        "tradeoff",
        "Yes: a cache cluster, and an in-process cache for hot keys",
        `${fmt(absorbed)} operations per second needs about ${nodes} Redis primaries. Sharding spreads keys, but a single key hotter than 30,000 reads per second still lands on one core; only an in-process cache on the servers fixes that.`,
        "'Five hundred thousand cache reads per second is five or six Redis nodes; a viral profile on one key is a one-second in-process cache on every app server.' Say the cluster and the hot-key answer separately.",
      ),
    );
    setNode(state, "q3", { tone: "ok" });
    setEdge(state, "q3", "s4", "ok");
    setNode(state, "s4", { tone: "ok" });
  } else {
    setNode(state, "q3", {
      tone: "ok",
      detail: `${fmt(absorbed)} ≤ ${fmt(CACHE_OPS_TRIGGER)}`,
    });
    setEdge(state, "q3", "s5", "ok");
    setNode(state, "s5", { tone: "ok", detail: "plus a replica for failover" });
    state.plan.push(`Cache ${fmt(absorbed)} ops/s: one Redis node is enough`);
    steps.push(
      frame(
        state,
        "invariant",
        "No: one cache node is enough",
        `${fmt(absorbed)} operations per second fits one Redis node with room to spare, so no cluster yet. Watch for one key that gets far hotter than the rest.`,
        "'The cache load is under one node's ceiling, so a single Redis with a replica for failover; I would add an in-process cache only if one key goes viral.'",
      ),
    );
  }
  if (leftover > READ_TRIGGER) {
    const replicas = Math.max(1, Math.ceil(leftover / 15_000));
    setNode(state, "s3", {
      tone: "ok",
      detail: `misses → ~${replicas} replica${replicas === 1 ? "" : "s"}`,
    });
    state.plan.push(
      `Cache misses ${fmt(leftover)}/s still exceed one node: about ${replicas} read replica${replicas === 1 ? "" : "s"} behind the cache`,
    );
  }
  steps.push(
    frame(
      state,
      "result",
      "Plan decided",
      `Plan: ${state.plan.join("; ")}.`,
      "Close by repeating each number with its move, in the order the sequence asked them. That is the whole justification for the boxes on the whiteboard.",
    ),
  );
  return steps;
}

const WIDTH = 480;
const HEIGHT = 352;
const RECT_W = 140;
const RECT_H = 42;
const DIAMOND_HW = 78;
const DIAMOND_HH = 24;
const ROW_Y = [34, 100, 166, 232, 298];
const CENTER_X = WIDTH / 2;
const LEFT_X = 12;
const RIGHT_X = WIDTH - 12 - RECT_W;

type Placement = { cx: number; cy: number; shape: "diamond" | "rect" };
const PLACE: Record<NodeId, Placement> = {
  q1: { cx: CENTER_X, cy: ROW_Y[0], shape: "diamond" },
  s1: { cx: RIGHT_X + RECT_W / 2, cy: ROW_Y[0], shape: "rect" },
  q2: { cx: CENTER_X, cy: ROW_Y[1], shape: "diamond" },
  baseline: { cx: LEFT_X + RECT_W / 2, cy: ROW_Y[1], shape: "rect" },
  c1: { cx: CENTER_X, cy: ROW_Y[2], shape: "diamond" },
  s3: { cx: RIGHT_X + RECT_W / 2, cy: ROW_Y[2], shape: "rect" },
  s2: { cx: CENTER_X, cy: ROW_Y[3], shape: "rect" },
  q3: { cx: CENTER_X, cy: ROW_Y[4], shape: "diamond" },
  s4: { cx: RIGHT_X + RECT_W / 2, cy: ROW_Y[4], shape: "rect" },
  s5: { cx: LEFT_X + RECT_W / 2, cy: ROW_Y[4], shape: "rect" },
};

function toneColors(tone: NodeTone): {
  stroke: string;
  fill: string;
  text: string;
} {
  if (tone === "active")
    return {
      stroke: VIZ_COLORS.accent,
      fill: "color-mix(in srgb, var(--accent) 12%, transparent)",
      text: VIZ_COLORS.accent,
    };
  if (tone === "hot")
    return {
      stroke: VIZ_COLORS.coral,
      fill: "color-mix(in srgb, var(--coral) 12%, transparent)",
      text: VIZ_COLORS.coral,
    };
  if (tone === "ok")
    return {
      stroke: VIZ_COLORS.teal,
      fill: "color-mix(in srgb, var(--teal) 12%, transparent)",
      text: VIZ_COLORS.teal,
    };
  return {
    stroke: VIZ_COLORS.line,
    fill: "transparent",
    text: VIZ_COLORS.muted,
  };
}

/** Where an edge leaves or enters a node: the tip of a diamond, the middle of a rectangle's side. */
function port(
  id: NodeId,
  side: "left" | "right" | "top" | "bottom",
): [number, number] {
  const { cx, cy, shape } = PLACE[id];
  const hw = shape === "diamond" ? DIAMOND_HW : RECT_W / 2;
  const hh = shape === "diamond" ? DIAMOND_HH : RECT_H / 2;
  if (side === "left") return [cx - hw, cy];
  if (side === "right") return [cx + hw, cy];
  if (side === "top") return [cx, cy - hh];
  return [cx, cy + hh];
}

function Shape({ node }: { node: DecisionNode }) {
  const { cx, cy, shape } = PLACE[node.id];
  const colors = toneColors(node.tone);
  const strokeWidth = node.tone === "idle" ? 1 : 1.75;
  const points = `${cx - DIAMOND_HW},${cy} ${cx},${cy - DIAMOND_HH} ${cx + DIAMOND_HW},${cy} ${cx},${cy + DIAMOND_HH}`;
  return (
    <g style={{ transition: "all 200ms" }}>
      {shape === "diamond" ? (
        <polygon
          points={points}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      ) : (
        <rect
          x={cx - RECT_W / 2}
          y={cy - RECT_H / 2}
          width={RECT_W}
          height={RECT_H}
          rx={9}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
        />
      )}
      <text
        x={cx}
        y={node.detail ? cy - 2 : cy + 4}
        fontSize={11}
        fontWeight={600}
        textAnchor="middle"
        fill={VIZ_COLORS.ink}
      >
        {node.title}
      </text>
      {node.detail ? (
        <text
          x={cx}
          y={cy + 11}
          fontSize={9}
          textAnchor="middle"
          fill={colors.text}
        >
          {node.detail}
        </text>
      ) : null}
    </g>
  );
}

function Connector({ edge }: { edge: DecisionEdge }) {
  const a = PLACE[edge.from];
  const b = PLACE[edge.to];
  const horizontal = a.cy === b.cy;
  const from = horizontal
    ? port(edge.from, a.cx < b.cx ? "right" : "left")
    : port(edge.from, "bottom");
  const to = horizontal
    ? port(edge.to, a.cx < b.cx ? "left" : "right")
    : port(edge.to, "top");
  const midX = (from[0] + to[0]) / 2;
  const midY = (from[1] + to[1]) / 2;
  const active = edge.tone !== "idle";
  const labelColor =
    edge.tone === "hot"
      ? VIZ_COLORS.coral
      : edge.tone === "ok"
        ? VIZ_COLORS.teal
        : VIZ_COLORS.muted;
  const labelX = horizontal ? midX : from[0] + 19;
  const labelY = horizontal ? from[1] - 7 : midY + 3;
  return (
    <g>
      <Edge from={from} to={to} tone={edge.tone} dashed={!active} />
      {edge.label ? (
        <>
          <rect
            x={labelX - 12}
            y={labelY - 9}
            width={24}
            height={12}
            rx={6}
            fill={VIZ_COLORS.panel}
          />
          <text
            x={labelX}
            y={labelY}
            fontSize={9}
            fontWeight={active ? 700 : 500}
            textAnchor="middle"
            fill={labelColor}
          >
            {edge.label}
          </text>
        </>
      ) : null}
    </g>
  );
}

export function ScalingDecisionView({
  state,
}: {
  state: ScalingDecisionState;
  params: ScalingDecisionParams;
}) {
  const pending = state.edges.filter((edge) => edge.tone === "idle");
  const done = state.edges.filter((edge) => edge.tone !== "idle");
  return (
    <div>
      <Frame width={WIDTH} height={HEIGHT} label="Scaling decision flowchart">
        <ArrowDefs />
        {pending.map((edge) => (
          <Connector key={`${edge.from}-${edge.to}`} edge={edge} />
        ))}
        {done.map((edge) => (
          <Connector key={`${edge.from}-${edge.to}`} edge={edge} />
        ))}
        {state.nodes.map((node) => (
          <Shape key={node.id} node={node} />
        ))}
        <Label
          x={CENTER_X}
          y={HEIGHT - 8}
          tone="ink"
          weight={600}
          anchor="middle"
        >
          {state.footer}
        </Label>
      </Frame>
      <Legend
        items={[
          { tone: "accent", label: "question being asked" },
          { tone: "coral", label: "threshold crossed" },
          { tone: "teal", label: "decided" },
        ]}
      />
    </div>
  );
}

export const scalingDecisionViz: VizDefinition<
  ScalingDecisionParams,
  ScalingDecisionState
> = {
  id: "scaling-decision",
  title: "When to scale: the decision sequence",
  summary:
    "Writes, then reads, then cacheability, then cache size. Enter peak numbers and walk the four questions to the moves they force.",
  fields: [
    {
      key: "writes",
      label: "Peak writes / s",
      kind: "number",
      hint: "One primary is comfortable to about 3,000",
    },
    {
      key: "reads",
      label: "Peak reads / s",
      kind: "number",
      hint: "One node is comfortable to about 5,000",
    },
    {
      key: "hitRate",
      label: "Expected cache hit rate",
      kind: "number",
      hint: "0 to 1; above 0.75 means cacheable",
    },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({
    writes: asNumber(raw.writes, DEFAULTS.writes, 0, 10_000_000),
    reads: asNumber(raw.reads, DEFAULTS.reads, 0, 100_000_000),
    hitRate: asNumber(raw.hitRate, DEFAULTS.hitRate, 0, 1),
  }),
  steps: scalingDecisionSteps,
  View: ScalingDecisionView,
};
