import { ArrowDefs, Edge, Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asNumber, type VizDefinition, type VizStep } from "./types";

/** Floyd's cycle detection, then finding the cycle entry. The distance argument is what gets asked. */

export type FastSlowParams = { length: number; cycleStart: number };
export type FastSlowState = { slow: number; fast: number; phase: "detect" | "met" | "locate" | "done"; entry: number | null; moves: number };

const DEFAULTS: FastSlowParams = { length: 7, cycleStart: 3 };

function nextOf(index: number, params: FastSlowParams): number | null {
  if (index < params.length - 1) return index + 1;
  return params.cycleStart >= 0 ? params.cycleStart : null;
}

function frame(state: FastSlowState, kind: VizStep<FastSlowState>["kind"], title: string, explain: string, interview: string): VizStep<FastSlowState> {
  return { title, explain, interview, kind, state: { ...state } };
}

export function fastSlowSteps(params: FastSlowParams): VizStep<FastSlowState>[] {
  const steps: VizStep<FastSlowState>[] = [];
  const state: FastSlowState = { slow: 0, fast: 0, phase: "detect", entry: null, moves: 0 };
  steps.push(frame(state, "setup", "Two pointers, two speeds", `${params.length} nodes${params.cycleStart >= 0 ? `; the tail links back to node ${params.cycleStart}` : "; no cycle"}. slow moves one, fast moves two.`, "Say the invariant that makes the meeting inevitable: 'once both pointers are inside the cycle, fast gains exactly one node on slow every step, so the gap shrinks by one modulo the cycle length and hits zero within one lap'. Also say what you get for free: O(1) space, unlike a visited set."));
  let guard = 0;
  while (guard < 60) {
    guard += 1;
    const s = nextOf(state.slow, params);
    const f1 = nextOf(state.fast, params);
    const f2 = f1 === null ? null : nextOf(f1, params);
    if (s === null || f2 === null) {
      state.phase = "done";
      steps.push(frame(state, "result", "fast hit null: no cycle", "The fast pointer ran off the end. A list with a cycle has no end to run off.", "The null check is the termination proof for the acyclic case: 'fast or fast.next becomes null within n/2 steps'. Mention both checks; forgetting fast.next is the classic NullPointerException."));
      return steps;
    }
    state.slow = s;
    state.fast = f2;
    state.moves += 1;
    if (state.slow === state.fast) {
      state.phase = "met";
      steps.push(frame(state, "invariant", `Met at node ${state.slow} after ${state.moves} moves`, "slow and fast point at the same node, which can only happen inside a cycle.", "Meeting proves the cycle. Now the question they actually ask: 'where does it start?' Set up the distance argument: let the head-to-entry distance be a, and the entry-to-meeting distance be b. Slow walked a + b; fast walked 2(a + b) and is exactly one or more laps ahead."));
      break;
    }
    steps.push(frame(state, "decision", `slow → ${state.slow}, fast → ${state.fast}`, `Move slow one node and fast two. ${state.fast > state.slow ? `Gap is ${state.fast - state.slow}.` : "Both are inside the cycle now."}`, "Narrate the gap rather than the positions: 'the gap changes by one each step, so they cannot jump over each other'. That is why speed 2 is enough and why speed 3 would also work but with a messier proof."));
  }
  state.phase = "locate";
  let p = 0;
  let q = state.slow;
  steps.push(frame({ ...state, slow: p, fast: q }, "decision", "Reset one pointer to the head", "Move one pointer back to the head. Now advance both one step at a time.", "The argument: 'fast covered a + b + kL and slow a + b, so kL = a + b, meaning the distance from the meeting point to the entry equals the distance from the head to the entry, modulo laps'. Two pointers walking at speed one from those two places therefore meet at the entry."));
  guard = 0;
  while (p !== q && guard < 60) {
    guard += 1;
    p = nextOf(p, params) ?? p;
    q = nextOf(q, params) ?? q;
    steps.push(frame({ ...state, slow: p, fast: q }, "invariant", `Both step: ${p} and ${q}`, "Both pointers advance by one; the distances to the entry stay equal.", "If they ask for the cycle length: 'freeze one pointer at the meeting point and walk the other around until it returns; count the steps'. Say it before they ask."));
  }
  state.slow = p;
  state.fast = q;
  state.entry = p;
  state.phase = "done";
  steps.push(frame(state, "result", `Cycle starts at node ${p}`, "The two pointers meet at the entry of the cycle.", "Complexity: O(n) time, O(1) space. Then volunteer the other uses of the same shape: 'middle of a list in one pass, kth from the end with a fixed gap, and duplicate finding on an array treated as next pointers'."));
  return steps;
}

export function FastSlowView({ state, params }: { state: FastSlowState; params: FastSlowParams }) {
  const n = params.length;
  const width = 520;
  const height = 150;
  const spacing = Math.min(64, (width - 60) / Math.max(1, n));
  const pos = (index: number): [number, number] => [40 + index * spacing, 70];
  return (
    <div>
      <Frame width={width} height={height} label="Linked list with fast and slow pointers">
        <ArrowDefs />
        {Array.from({ length: n }, (_, index) => index).map((index) => {
          const next = nextOf(index, params);
          if (next === null) return null;
          if (next === index + 1) return <Edge key={index} from={[pos(index)[0] + 14, 70]} to={[pos(next)[0] - 16, 70]} tone="idle" />;
          const [x1] = pos(index);
          const [x2] = pos(next);
          return <path key={index} d={`M ${x1} 84 C ${x1} 130, ${x2} 130, ${x2} 84`} fill="none" stroke={VIZ_COLORS.coral} strokeWidth={1.5} markerEnd="url(#viz-arrow)" />;
        })}
        {Array.from({ length: n }, (_, index) => index).map((index) => {
          const [x, y] = pos(index);
          const isSlow = state.slow === index;
          const isFast = state.fast === index;
          const inCycle = params.cycleStart >= 0 && index >= params.cycleStart;
          const fill = state.entry === index ? "color-mix(in srgb, var(--teal) 45%, transparent)" : isSlow && isFast ? "color-mix(in srgb, var(--accent) 50%, transparent)" : isSlow || isFast ? "color-mix(in srgb, var(--accent) 22%, transparent)" : "var(--steel-900)";
          return (
            <g key={index} style={{ transition: "all 200ms" }}>
              <circle cx={x} cy={y} r={14} fill={fill} stroke={inCycle ? VIZ_COLORS.coral : VIZ_COLORS.line} strokeWidth={isSlow || isFast ? 2 : 1.25} />
              <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.ink}>
                {index}
              </text>
              {isSlow ? (
                <text x={x} y={y - 22} textAnchor="middle" fontSize={10} fontWeight={700} fill={VIZ_COLORS.accent}>
                  slow
                </text>
              ) : null}
              {isFast ? (
                <text x={x} y={y - (isSlow ? 34 : 22)} textAnchor="middle" fontSize={10} fontWeight={700} fill={VIZ_COLORS.teal}>
                  fast
                </text>
              ) : null}
            </g>
          );
        })}
        <Label x={20} y={height - 10}>
          {params.cycleStart >= 0 ? `tail → node ${params.cycleStart} (cycle length ${n - params.cycleStart})` : "no cycle"}
        </Label>
      </Frame>
      <Legend items={[{ tone: "coral", label: "cycle" }, { tone: "accent", label: "pointer" }, { tone: "teal", label: "entry found" }]} />
    </div>
  );
}

export const fastSlowViz: VizDefinition<FastSlowParams, FastSlowState> = {
  id: "fast-slow",
  title: "Fast and slow pointers",
  summary: "Detect the cycle, then find where it starts. The distance argument is the interview question.",
  fields: [
    { key: "length", label: "Nodes", kind: "number" },
    { key: "cycleStart", label: "Tail links back to node", kind: "number", hint: "−1 for no cycle." },
  ],
  defaults: DEFAULTS,
  parse: (raw) => {
    const length = asNumber(raw.length, DEFAULTS.length, 2, 12);
    return { length, cycleStart: Math.min(asNumber(raw.cycleStart, DEFAULTS.cycleStart, -1, length - 1), length - 1) };
  },
  steps: fastSlowSteps,
  View: FastSlowView,
};
