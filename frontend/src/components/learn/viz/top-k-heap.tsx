import { Cell, Frame, Label, Legend, Pointer } from "./primitives";
import { asNumber, asNumberList, type VizDefinition, type VizStep } from "./types";

/** Top-k largest from a stream with a min-heap of size k. The counterintuitive choice of heap is the point. */

export type TopKParams = { stream: number[]; k: number };
export type TopKState = { i: number; heap: number[]; action: "push" | "replace" | "skip" | null; evicted: number | null };

const DEFAULTS: TopKParams = { stream: [5, 1, 9, 3, 7, 2, 8, 6], k: 3 };

function frame(state: TopKState, kind: VizStep<TopKState>["kind"], title: string, explain: string, interview: string): VizStep<TopKState> {
  return { title, explain, interview, kind, state: { ...state, heap: [...state.heap] } };
}

export function topKSteps(params: TopKParams): VizStep<TopKState>[] {
  const { stream, k } = params;
  const steps: VizStep<TopKState>[] = [];
  const state: TopKState = { i: -1, heap: [], action: null, evicted: null };
  const sorted = () => state.heap.sort((a, b) => a - b);
  steps.push(frame(state, "setup", `Min-heap of size ${k} for the ${k} largest`, "Keep only k elements. The smallest of the kept ones sits at the top of the heap.", `Say the counterintuitive part first: 'for the k largest I use a MIN-heap, because the element that should leave is the smallest of the candidates, and a min-heap makes that the O(1) peek'. Then the size: 'the heap never exceeds k, so every operation is O(log k)'.`));
  for (let i = 0; i < stream.length; i += 1) {
    state.i = i;
    state.evicted = null;
    const value = stream[i];
    if (state.heap.length < k) {
      state.heap.push(value);
      sorted();
      state.action = "push";
      steps.push(frame(state, "invariant", `Push ${value} (heap has room)`, `Fewer than ${k} candidates so far; every element is a candidate. Heap: [${state.heap.join(", ")}], min ${state.heap[0]}.`, "Invariant to state: 'the heap always holds the k largest seen so far, with the weakest of them at the root'. Filling the first k keeps it trivially true."));
    } else if (value > state.heap[0]) {
      const evicted = state.heap[0];
      state.heap[0] = value;
      sorted();
      state.action = "replace";
      state.evicted = evicted;
      steps.push(frame(state, "decision", `${value} > min ${evicted}: replace`, `${value} beats the weakest candidate. Pop ${evicted}, push ${value}. Heap: [${state.heap.join(", ")}].`, "The comparison against the root is the whole decision: 'if the new value cannot beat the weakest of the top k, it can never be in the top k, so I skip it in O(1)'. That is where the n log k bound comes from: most elements never touch the heap."));
    } else {
      state.action = "skip";
      steps.push(frame(state, "decision", `${value} ≤ min ${state.heap[0]}: skip`, `${value} would not make the top ${k}. Nothing changes.`, "Say why skipping is safe: 'the heap root is a lower bound on membership; anything at or below it is dominated by k values already seen'."));
    }
  }
  state.i = stream.length;
  state.action = null;
  steps.push(frame(state, "result", `Top ${k}: [${[...state.heap].sort((a, b) => b - a).join(", ")}]`, `The heap holds the answer. ${stream.length} elements, ${k}-sized heap.`, "Complexity and alternatives, in one breath: 'O(n log k) time, O(k) space, and it works on a stream. If all the data is in memory and k is large, quickselect gives O(n) average; if k ≈ n, just sort.' Then the follow-up they will ask: 'for the k smallest, flip to a max-heap'."));
  return steps;
}

export function TopKView({ state, params }: { state: TopKState; params: TopKParams }) {
  const size = 34;
  const gap = 8;
  const width = Math.max(460, params.stream.length * (size + gap) + 220);
  return (
    <div>
      <Frame width={width} height={140} label="Stream of values and the current heap">
        <Label x={20} y={30}>
          stream
        </Label>
        {params.stream.map((value, index) => {
          const tone = index === state.i ? (state.action === "skip" ? "miss" : "edge") : index < state.i ? "faded" : "idle";
          return <Cell key={index} x={20 + index * (size + gap)} y={40} size={size} value={value} tone={tone} />;
        })}
        {state.i >= 0 && state.i < params.stream.length ? <Pointer x={20 + state.i * (size + gap) + size / 2} y={36} label="next" /> : null}
        <Label x={width - 190} y={30}>
          min-heap (root first)
        </Label>
        {state.heap.map((value, index) => (
          <Cell key={`${value}-${index}`} x={width - 190 + index * (size + 6)} y={40} size={size} value={value} tone={index === 0 ? "edge" : "window"} caption={index === 0 ? "min" : undefined} />
        ))}
        {state.evicted !== null ? (
          <Label x={width - 190} y={120} tone="coral">
            evicted {state.evicted}
          </Label>
        ) : null}
      </Frame>
      <Legend items={[{ tone: "edge", label: "root / current" }, { tone: "window", label: "in heap" }, { tone: "miss", label: "skipped" }]} />
    </div>
  );
}

export const topKViz: VizDefinition<TopKParams, TopKState> = {
  id: "top-k-heap",
  title: "Top-k with a min-heap",
  summary: "Why the k largest need a min-heap, and why most elements never touch it.",
  fields: [
    { key: "stream", label: "Stream", kind: "text", hint: "Comma-separated." },
    { key: "k", label: "k", kind: "number" },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({ stream: asNumberList(raw.stream, DEFAULTS.stream).slice(0, 12), k: asNumber(raw.k, DEFAULTS.k, 1, 6) }),
  steps: topKSteps,
  View: TopKView,
};
