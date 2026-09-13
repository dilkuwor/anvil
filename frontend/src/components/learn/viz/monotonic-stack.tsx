import { Cell, Frame, Label, Legend, Pointer } from "./primitives";
import { asNumberList, type VizDefinition, type VizStep } from "./types";

/** Next greater element to the right. The invariant is the whole trick: the stack stays decreasing. */

export type MonotonicStackParams = { array: number[] };
export type MonotonicStackState = { i: number; stack: number[]; result: (number | null)[]; popped: number | null; phase: "idle" | "pop" | "push" | "done" };

const DEFAULTS: MonotonicStackParams = { array: [2, 1, 5, 6, 2, 3] };

function frame(state: MonotonicStackState, kind: VizStep<MonotonicStackState>["kind"], title: string, explain: string, interview: string): VizStep<MonotonicStackState> {
  return { title, explain, interview, kind, state: { ...state, stack: [...state.stack], result: [...state.result] } };
}

export function monotonicStackSteps(params: MonotonicStackParams): VizStep<MonotonicStackState>[] {
  const a = params.array;
  const steps: VizStep<MonotonicStackState>[] = [];
  const state: MonotonicStackState = { i: -1, stack: [], result: a.map(() => null), popped: null, phase: "idle" };
  steps.push(frame(state, "setup", "Invariant: the stack is strictly decreasing", `For each element, find the first larger element to its right. The stack holds indices whose answer is still unknown.`, "State the invariant before coding: 'from bottom to top the stack values strictly decrease, and every index on it is still waiting for its next greater element'. Everything else follows from keeping that sentence true."));
  for (let i = 0; i < a.length; i += 1) {
    state.i = i;
    state.popped = null;
    while (state.stack.length && a[state.stack[state.stack.length - 1]] < a[i]) {
      const top = state.stack.pop()!;
      state.result[top] = a[i];
      state.popped = top;
      state.phase = "pop";
      steps.push(frame(state, "decision", `${a[i]} > ${a[top]}: pop index ${top}, answer ${a[i]}`, `Index ${top} (value ${a[top]}) is smaller than the new element, so ${a[i]} is its next greater. Record it and pop.`, `Why is ${a[i]} the first greater, not just some greater? Everything between index ${top} and ${i} was already popped by something smaller than ${a[i]}, or never exceeded ${a[top]}. The decreasing invariant guarantees it.`));
    }
    state.stack.push(i);
    state.phase = "push";
    state.popped = null;
    steps.push(frame(state, "invariant", `Push index ${i} (${a[i]})`, `Nothing left on the stack is smaller than ${a[i]}, so pushing keeps the stack decreasing. Stack: [${state.stack.map((k) => a[k]).join(", ")}].`, "Say the amortized argument here: 'each index is pushed once and popped at most once, so the nested while loop is O(n) total, not O(n²)'. Interviewers ask exactly this."));
  }
  state.phase = "done";
  state.i = a.length;
  steps.push(frame(state, "result", `Done: [${state.result.map((v) => (v === null ? "-1" : v)).join(", ")}]`, `Indices still on the stack (${state.stack.map((k) => a[k]).join(", ") || "none"}) have no greater element to the right; they get −1.`, "Close with where else this shape appears: 'daily temperatures, stock span, largest rectangle in a histogram, trapping rain water'. Same invariant, different comparison direction. If they ask for next smaller, flip the comparison; for previous greater, iterate from the right."));
  return steps;
}

export function MonotonicStackView({ state, params }: { state: MonotonicStackState; params: MonotonicStackParams }) {
  const a = params.array;
  const size = 36;
  const gap = 8;
  const width = Math.max(460, a.length * (size + gap) + 200);
  return (
    <div>
      <Frame width={width} height={150} label="Monotonic stack scanning the array">
        {a.map((value, index) => {
          const tone = state.popped === index ? "miss" : state.i === index && state.phase !== "done" ? "edge" : state.stack.includes(index) ? "window" : state.result[index] !== null ? "done" : "idle";
          return <Cell key={index} x={20 + index * (size + gap)} y={40} size={size} value={value} tone={tone} caption={state.result[index] === null ? String(index) : `→${state.result[index]}`} />;
        })}
        {state.i >= 0 && state.i < a.length ? <Pointer x={20 + state.i * (size + gap) + size / 2} y={36} label="i" /> : null}
        <Label x={width - 160} y={30} tone="muted">
          stack (top →)
        </Label>
        {state.stack.map((index, position) => (
          <Cell key={index} x={width - 160 + position * 30} y={40} size={26} value={a[index]} tone="window" />
        ))}
        {!state.stack.length ? (
          <Label x={width - 160} y={57}>
            empty
          </Label>
        ) : null}
        <Label x={20} y={132} tone="ink" weight={600}>
          answers: [{state.result.map((v) => (v === null ? "?" : v)).join(", ")}]
        </Label>
      </Frame>
      <Legend items={[{ tone: "window", label: "on stack" }, { tone: "edge", label: "current" }, { tone: "miss", label: "just popped" }, { tone: "done", label: "answered" }]} />
    </div>
  );
}

export const monotonicStackViz: VizDefinition<MonotonicStackParams, MonotonicStackState> = {
  id: "monotonic-stack",
  title: "Monotonic stack: next greater element",
  summary: "Each pop answers one index for good. Watch why the inner loop is still O(n) overall.",
  fields: [{ key: "array", label: "Array", kind: "text", hint: "Comma-separated." }],
  defaults: DEFAULTS,
  parse: (raw) => ({ array: asNumberList(raw.array, DEFAULTS.array).slice(0, 12) }),
  steps: monotonicStackSteps,
  View: MonotonicStackView,
};
