import { Box, Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asNumber, type VizDefinition, type VizStep } from "./types";

/** Quorum reads and writes: W + R > N guarantees overlap. Set it below N to watch a stale read appear. */

export type QuorumParams = { n: number; w: number; r: number };
export type QuorumState = { versions: number[]; wrote: number[]; read: number[]; slow: number; result: number | null; phase: "idle" | "write" | "read" | "done" };

const DEFAULTS: QuorumParams = { n: 3, w: 2, r: 2 };

function frame(state: QuorumState, kind: VizStep<QuorumState>["kind"], title: string, explain: string, interview: string): VizStep<QuorumState> {
  return { title, explain, interview, kind, state: { ...state, versions: [...state.versions], wrote: [...state.wrote], read: [...state.read] } };
}

export function quorumSteps(params: QuorumParams): VizStep<QuorumState>[] {
  const { n, w, r } = params;
  const steps: VizStep<QuorumState>[] = [];
  const overlap = w + r > n;
  const state: QuorumState = { versions: Array(n).fill(1), wrote: [], read: [], slow: n - 1, result: null, phase: "idle" };
  steps.push(frame(state, "setup", `N=${n}, W=${w}, R=${r}: ${overlap ? "W + R > N" : "W + R ≤ N"}`, `All ${n} replicas hold v1. A write waits for ${w} acks; a read asks ${r} replicas and takes the newest version.`, overlap ? "State the rule and what it buys: 'W + R > N means every read set overlaps every write set in at least one replica, so a read always sees the latest acknowledged write'. That is the sentence." : "You have chosen W + R ≤ N. Say what that means before the demo shows it: 'a read set can miss the write set entirely, so stale reads are possible'. Sometimes that is fine; say when."));
  state.phase = "write";
  for (let i = 0; i < n; i += 1) {
    if (i === state.slow) continue;
    if (state.wrote.length >= w) break;
    state.versions[i] = 2;
    state.wrote.push(i);
  }
  steps.push(frame(state, "decision", `Write v2: ${state.wrote.length} of ${w} acks`, `Replica ${state.slow + 1} is slow. Replicas ${state.wrote.map((i) => i + 1).join(", ")} acknowledge v2.${state.wrote.length >= w ? " That is enough; the write succeeds." : ""}`, "Say why the coordinator does not wait for all N: 'waiting for W lets the write succeed while some replicas are slow or down; that is the availability side of the trade'. The write is acknowledged when W replicas have it, not when all do."));
  if (state.wrote.length < w) {
    state.versions[state.slow] = 2;
    state.wrote.push(state.slow);
    steps.push(frame(state, "invariant", `Waiting on the slow replica for the ${w}th ack`, "W is as large as N here, so the write cannot complete until every replica responds.", "Say the cost of W = N: 'one slow or dead replica blocks every write; strong durability, weak availability'. Most systems pick W = majority."));
  }
  state.phase = "read";
  const candidates = [...Array(n).keys()].filter((i) => !state.wrote.includes(i));
  const readSet = [...candidates, ...state.wrote.filter((i) => !candidates.includes(i))].slice(0, r);
  state.read = readSet;
  state.result = Math.max(...readSet.map((i) => state.versions[i]));
  const stale = state.result < 2;
  steps.push(frame(state, stale ? "tradeoff" : "invariant", `Read R=${r} replicas ${readSet.map((i) => i + 1).join(", ")}: newest is v${state.result}`, stale ? `The read set avoided every replica that has v2. The client gets v1 even though v2 was acknowledged.` : `At least one replica in the read set (${readSet.filter((i) => state.versions[i] === 2).map((i) => i + 1).join(", ")}) has v2. The coordinator returns the highest version.`, stale ? "This is the stale read W + R ≤ N allows. Say the fix and its cost: 'raise R or W until they sum past N; every step toward that adds latency, because the coordinator waits on more replicas'." : "Say how the coordinator picks: 'compare versions (or vector clocks) and return the newest; then read-repair the replicas that were behind'. Read repair is how the slow replica eventually catches up without a separate process."));
  state.phase = "done";
  steps.push(frame(state, "result", overlap ? "Overlap guaranteed" : "No overlap guarantee", overlap ? `Any ${w} writers and any ${r} readers share at least ${w + r - n} replica${w + r - n === 1 ? "" : "s"}.` : `Writers and readers can be disjoint sets.`, "Close with the tuning: 'W=1, R=N for write-heavy with strong reads; W=N, R=1 for read-heavy; majority both ways as the default'. Then the honest limit: 'quorums give you read-your-writes at the replica level, not transactions; concurrent writes to the same key still need versioning or last-writer-wins, and I should say which'."));
  return steps;
}

export function QuorumView({ state, params }: { state: QuorumState; params: QuorumParams }) {
  const width = 480;
  const height = 150;
  const spacing = (width - 60) / params.n;
  return (
    <div>
      <Frame width={width} height={height} label="Replicas with versions">
        {state.versions.map((v, i) => {
          const x = 30 + i * spacing;
          const inWrite = state.wrote.includes(i);
          const inRead = state.read.includes(i);
          const tone = inRead && state.phase !== "write" ? (v < 2 && state.result !== null && state.result < 2 ? "hot" : "ok") : inWrite ? "active" : "idle";
          return (
            <Box key={i} x={x} y={30} width={spacing - 14} height={70} title={`Replica ${i + 1}${i === state.slow ? " (slow)" : ""}`} tone={tone}>
              <text x={x + (spacing - 14) / 2} y={70} textAnchor="middle" fontSize={16} fontWeight={700} fill={v === 2 ? VIZ_COLORS.teal : VIZ_COLORS.ink} fontFamily="ui-monospace, monospace">
                v{v}
              </text>
              <text x={x + (spacing - 14) / 2} y={90} textAnchor="middle" fontSize={9} fill={VIZ_COLORS.muted}>
                {[inWrite ? "W" : null, inRead ? "R" : null].filter(Boolean).join(" · ")}
              </text>
            </Box>
          );
        })}
        <Label x={30} y={height - 12} tone="ink" weight={600}>
          N={params.n} W={params.w} R={params.r} · {params.w + params.r > params.n ? "W + R > N" : "W + R ≤ N"}
        </Label>
        <Label x={width - 30} y={height - 12} anchor="end" tone={state.result !== null && state.result < 2 ? "coral" : "muted"}>
          {state.result !== null ? `read returned v${state.result}` : ""}
        </Label>
      </Frame>
      <Legend items={[{ tone: "accent", label: "in write set" }, { tone: "teal", label: "in read set / has v2" }, { tone: "coral", label: "stale read" }]} />
    </div>
  );
}

export const quorumViz: VizDefinition<QuorumParams, QuorumState> = {
  id: "quorum",
  title: "Quorum reads and writes",
  summary: "W + R > N makes read and write sets overlap. Lower one of them and watch a stale read appear.",
  fields: [
    { key: "n", label: "N replicas", kind: "number" },
    { key: "w", label: "W (write acks)", kind: "number" },
    { key: "r", label: "R (replicas read)", kind: "number" },
  ],
  defaults: DEFAULTS,
  parse: (raw) => {
    const n = asNumber(raw.n, DEFAULTS.n, 2, 5);
    return { n, w: Math.min(n, asNumber(raw.w, DEFAULTS.w, 1, 5)), r: Math.min(n, asNumber(raw.r, DEFAULTS.r, 1, 5)) };
  },
  steps: quorumSteps,
  View: QuorumView,
};
