import { Cell, Frame, Label, Legend, Pointer } from "./primitives";
import { asNumber, asNumberList, type VizDefinition, type VizStep } from "./types";

/**
 * Variable-size window: smallest subarray with sum >= target.
 * The interview content is the invariant that lets the left pointer move without looking back.
 */

export type SlidingWindowParams = { array: number[]; target: number };

export type SlidingWindowState = {
  left: number;
  right: number; // inclusive; -1 before the first expand
  sum: number;
  best: { left: number; right: number } | null;
  phase: "idle" | "expand" | "contract" | "done";
};

const DEFAULTS: SlidingWindowParams = { array: [2, 3, 1, 2, 4, 3], target: 7 };

function frame(state: SlidingWindowState, kind: VizStep<SlidingWindowState>["kind"], title: string, explain: string, interview: string): VizStep<SlidingWindowState> {
  return { title, explain, interview, kind, state: { ...state, best: state.best ? { ...state.best } : null } };
}

export function slidingWindowSteps(params: SlidingWindowParams): VizStep<SlidingWindowState>[] {
  const { array, target } = params;
  const steps: VizStep<SlidingWindowState>[] = [];
  const state: SlidingWindowState = { left: 0, right: -1, sum: 0, best: null, phase: "idle" };
  const negatives = array.some((value) => value < 0);

  steps.push(
    frame(
      state,
      "setup",
      "Name the invariant",
      `Find the shortest contiguous run whose sum is at least ${target}. Two pointers bound the window; a running sum summarizes it.`,
      "Say the invariant before touching the array: every element is non-negative, so the sum can only grow when the window expands and only shrink when it contracts. That is what makes moving left safe.",
    ),
  );

  for (let right = 0; right < array.length; right += 1) {
    state.right = right;
    state.sum += array[right];
    state.phase = "expand";
    steps.push(
      frame(
        state,
        "invariant",
        `Expand to include ${array[right]}`,
        `Move right to index ${right}. Sum becomes ${state.sum}. Adding one element is O(1); no window is recomputed.`,
        state.sum < target
          ? `Sum ${state.sum} is below ${target}, so nothing ending here can qualify. The only move is to expand. Say that out loud: 'the window is too small, and shrinking cannot help'.`
          : `Sum ${state.sum} meets the target. Now the question is whether a shorter window ending here also qualifies, so contract from the left while it still does.`,
      ),
    );

    while (state.sum >= target && state.left <= state.right) {
      const length = state.right - state.left + 1;
      if (!state.best || length < state.best.right - state.best.left + 1) {
        state.best = { left: state.left, right: state.right };
      }
      const removed = array[state.left];
      const before = state.sum;
      state.sum -= removed;
      state.left += 1;
      state.phase = "contract";
      steps.push(
        frame(
          state,
          "decision",
          `Record length ${length}, drop ${removed}`,
          `Window [${state.left - 1}, ${state.right}] sums to ${before} with length ${length}; record it if shorter. Then remove ${removed} from the left. Sum is now ${state.sum}.`,
          `Why is it safe to never move left backwards? Any window starting before index ${state.left} and ending here was already considered, and it was longer. That is the invariant: left only advances, so the whole pass is O(n) even though there is a loop inside a loop.`,
        ),
      );
    }
  }

  state.phase = "done";
  const bestLength = state.best ? state.best.right - state.best.left + 1 : 0;
  steps.push(
    frame(
      state,
      "result",
      state.best ? `Answer: length ${bestLength}` : "Answer: no window",
      state.best
        ? `Shortest qualifying window is [${state.best.left}, ${state.best.right}], length ${bestLength}. Each index entered and left the window at most once.`
        : `No window reached ${target}. The pointers still touched each element at most twice.`,
      "Complexity: O(n) time, O(1) space. Then volunteer the trade-off before they ask: 'this breaks with negative numbers, because removing from the left could raise the sum; for that I would switch to prefix sums with a monotonic deque'.",
    ),
  );

  if (negatives) {
    steps.push(
      frame(
        state,
        "tradeoff",
        "Your input has negatives",
        "The array you entered contains a negative number, so the answer above may be wrong: shrinking the window can increase the sum.",
        "This is the trap interviewers set. State the precondition explicitly: 'sliding window with shrink is only valid when the summary is monotone in the window size'. With negatives, use prefix sums and a monotonic deque, O(n) still, or accept O(n²).",
      ),
    );
  }
  return steps;
}

export function SlidingWindowView({ state, params }: { state: SlidingWindowState; params: SlidingWindowParams }) {
  const size = 36;
  const gap = 8;
  const width = Math.max(420, params.array.length * (size + gap) + 40);
  return (
    <div>
      <Frame width={width} height={132} label="Sliding window over the array">
        {params.array.map((value, index) => {
          const inWindow = index >= state.left && index <= state.right;
          const inBest = state.best && index >= state.best.left && index <= state.best.right && state.phase === "done";
          const tone = inBest ? "done" : inWindow ? (index === state.left || index === state.right ? "edge" : "window") : index < state.left ? "faded" : "idle";
          return <Cell key={index} x={20 + index * (size + gap)} y={40} size={size} value={value} tone={tone} caption={String(index)} />;
        })}
        {state.right >= 0 ? <Pointer x={20 + state.left * (size + gap) + size / 2} y={36} label="L" /> : null}
        {state.right >= 0 ? <Pointer x={20 + state.right * (size + gap) + size / 2} y={36} label="R" tone="teal" /> : null}
        <Label x={20} y={118} tone="ink" weight={600}>
          sum = {state.sum}
        </Label>
        <Label x={110} y={118}>
          target ≥ {params.target}
        </Label>
        <Label x={width - 20} y={118} anchor="end" tone={state.best ? "teal" : "muted"}>
          {state.best ? `best length ${state.best.right - state.best.left + 1}` : "best: none yet"}
        </Label>
      </Frame>
      <Legend items={[{ tone: "window", label: "current window" }, { tone: "edge", label: "pointers" }, { tone: "done", label: "answer" }]} />
    </div>
  );
}

export const slidingWindowViz: VizDefinition<SlidingWindowParams, SlidingWindowState> = {
  id: "sliding-window",
  title: "Variable-size sliding window",
  summary: "Smallest subarray with sum ≥ target. Watch why the left pointer never needs to look back.",
  fields: [
    { key: "array", label: "Array", kind: "text", hint: "Comma-separated. Try adding a negative number." },
    { key: "target", label: "Target sum", kind: "number" },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({
    array: asNumberList(raw.array, DEFAULTS.array).slice(0, 14),
    target: asNumber(raw.target, DEFAULTS.target, 1),
  }),
  steps: slidingWindowSteps,
  View: SlidingWindowView,
};
