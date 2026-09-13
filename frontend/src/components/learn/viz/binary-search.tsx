import { Cell, Frame, Label, Legend, Pointer } from "./primitives";
import { asChoice, asNumber, asNumberList, type VizDefinition, type VizStep } from "./types";

/**
 * Classic binary search, with the invariant the candidate is expected to state at every step:
 * "if the target exists, it is inside [lo, hi]". The variant switch shows why the loop
 * condition and the mid update are a package deal.
 */

export type BinarySearchParams = { array: number[]; target: number; variant: "exact" | "first" };

export type BinarySearchState = {
  lo: number;
  hi: number;
  mid: number | null;
  found: number | null;
  compare: "lt" | "gt" | "eq" | null;
  phase: "idle" | "probe" | "done";
};

const DEFAULTS: BinarySearchParams = { array: [1, 3, 4, 4, 4, 7, 9, 12, 15], target: 4, variant: "first" };

function frame(state: BinarySearchState, kind: VizStep<BinarySearchState>["kind"], title: string, explain: string, interview: string): VizStep<BinarySearchState> {
  return { title, explain, interview, kind, state: { ...state } };
}

export function binarySearchSteps(params: BinarySearchParams): VizStep<BinarySearchState>[] {
  const array = [...params.array].sort((a, b) => a - b);
  const { target, variant } = params;
  const steps: VizStep<BinarySearchState>[] = [];
  const state: BinarySearchState = { lo: 0, hi: variant === "exact" ? array.length - 1 : array.length, mid: null, found: null, compare: null, phase: "idle" };

  steps.push(
    frame(
      state,
      "setup",
      variant === "exact" ? "Invariant: target ∈ [lo, hi]" : "Invariant: answer ∈ [lo, hi)",
      variant === "exact"
        ? `Search for ${target} in a sorted array of ${array.length}. lo = 0, hi = ${state.hi}, both inclusive.`
        : `Find the first index whose value is ≥ ${target}. lo = 0, hi = ${state.hi}; hi is exclusive and can equal the length, meaning "not found".`,
      variant === "exact"
        ? "Before writing the loop, say the invariant: 'if the target is in the array, it is within lo..hi inclusive'. Every line of the loop exists to keep that sentence true while shrinking the range."
        : "Say the invariant for the boundary variant: 'everything before lo is < target, everything from hi onward is ≥ target'. The answer is wherever lo and hi meet. This framing removes the off-by-one guesswork.",
    ),
  );

  let guard = 0;
  if (variant === "exact") {
    while (state.lo <= state.hi && guard < 64) {
      guard += 1;
      const mid = state.lo + Math.floor((state.hi - state.lo) / 2);
      state.mid = mid;
      state.phase = "probe";
      const value = array[mid];
      if (value === target) {
        state.compare = "eq";
        state.found = mid;
        state.phase = "done";
        steps.push(
          frame(state, "result", `a[${mid}] = ${value}, found`, `mid = lo + (hi − lo) / 2 = ${mid}. The value matches; return ${mid}.`, "Two things to say: 'mid is computed as lo + (hi − lo) / 2 to avoid integer overflow', and 'this returns some matching index, not necessarily the first; if the question needs the first occurrence I switch to the boundary form'."),
        );
        return steps;
      }
      if (value < target) {
        state.compare = "lt";
        steps.push(
          frame(state, "decision", `a[${mid}] = ${value} < ${target}, go right`, `Everything at or before ${mid} is ≤ ${value}, so the target cannot be there. Set lo = ${mid + 1}.`, `Justify the +1: 'mid itself is ruled out by the comparison, so excluding it keeps the invariant and guarantees the range shrinks'. Without the +1, lo == mid can loop forever when the range has two elements.`),
        );
        state.lo = mid + 1;
      } else {
        state.compare = "gt";
        steps.push(
          frame(state, "decision", `a[${mid}] = ${value} > ${target}, go left`, `Everything at or after ${mid} is ≥ ${value}, so the target must be before it. Set hi = ${mid - 1}.`, `Same argument mirrored: mid is excluded by the comparison. Halving the range each step is where the O(log n) comes from; say the number: about ${Math.ceil(Math.log2(Math.max(2, array.length)))} probes for ${array.length} elements.`),
        );
        state.hi = mid - 1;
      }
    }
    state.mid = null;
    state.phase = "done";
    steps.push(
      frame(state, "result", "lo > hi, not found", `The range is empty (lo = ${state.lo}, hi = ${state.hi}). The invariant still holds: the target would be inside an empty range, so it is not present.`, "Termination argument: 'the range strictly shrinks each iteration and the loop ends when it is empty'. Then add the follow-up they will ask: 'the insert position is lo', which is why the boundary variant matters."),
    );
    return steps;
  }

  while (state.lo < state.hi && guard < 64) {
    guard += 1;
    const mid = state.lo + Math.floor((state.hi - state.lo) / 2);
    state.mid = mid;
    state.phase = "probe";
    const value = array[mid];
    if (value < target) {
      state.compare = "lt";
      steps.push(
        frame(state, "decision", `a[${mid}] = ${value} < ${target}, lo = ${mid + 1}`, `Index ${mid} cannot be the first ≥ ${target}, so the answer is after it. lo = ${mid + 1}.`, "Say why lo moves past mid but hi does not: 'mid is proven too small, so it is excluded; when mid is big enough it stays as a candidate, so hi = mid, not mid − 1'. That asymmetry is the whole boundary pattern."),
      );
      state.lo = mid + 1;
    } else {
      state.compare = "gt";
      steps.push(
        frame(state, "decision", `a[${mid}] = ${value} ≥ ${target}, hi = ${mid}`, `Index ${mid} could be the answer, so keep it: hi = ${mid}. Nothing after it can be first.`, "This is why the loop is lo < hi and not lo <= hi: hi stays a candidate, so the loop must stop when lo meets it, or it would never end."),
      );
      state.hi = mid;
    }
  }
  state.mid = null;
  state.phase = "done";
  state.found = state.lo < array.length && array[state.lo] >= target ? state.lo : null;
  steps.push(
    frame(state, "result", state.found !== null ? `First index ≥ ${target} is ${state.lo}` : `No value ≥ ${target}, position ${state.lo}`, `lo == hi == ${state.lo}. ${state.found !== null ? `a[${state.lo}] = ${array[state.lo]}.` : "That is the array length, meaning every element is smaller."}`, "Close with the generalization: 'any monotone predicate can be searched this way, which is how binary search on the answer works: minimum capacity, earliest day, smallest speed'. That sentence is what turns a textbook question into a senior answer."),
  );
  return steps;
}

export function BinarySearchView({ state, params }: { state: BinarySearchState; params: BinarySearchParams }) {
  const array = [...params.array].sort((a, b) => a - b);
  const size = 36;
  const gap = 8;
  const width = Math.max(420, (array.length + 1) * (size + gap) + 40);
  const exclusiveHi = params.variant === "first";
  return (
    <div>
      <Frame width={width} height={132} label="Binary search over a sorted array">
        {array.map((value, index) => {
          const inRange = exclusiveHi ? index >= state.lo && index < state.hi : index >= state.lo && index <= state.hi;
          const tone = state.found === index ? "done" : state.mid === index ? (state.compare === "eq" ? "hit" : "edge") : inRange ? "window" : "faded";
          return <Cell key={index} x={20 + index * (size + gap)} y={40} size={size} value={value} tone={tone} caption={String(index)} />;
        })}
        {state.phase !== "done" || state.found === null ? <Pointer x={20 + Math.min(state.lo, array.length) * (size + gap) + size / 2} y={36} label="lo" /> : null}
        {state.phase !== "done" || state.found === null ? <Pointer x={20 + Math.min(state.hi, array.length) * (size + gap) + size / 2} y={36} label="hi" tone="coral" /> : null}
        {state.mid !== null ? <Pointer x={20 + state.mid * (size + gap) + size / 2} y={36} label="mid" tone="teal" /> : null}
        <Label x={20} y={118} tone="ink" weight={600}>
          target = {params.target}
        </Label>
        <Label x={130} y={118}>
          {exclusiveHi ? "hi is exclusive" : "hi is inclusive"} · range size {Math.max(0, exclusiveHi ? state.hi - state.lo : state.hi - state.lo + 1)}
        </Label>
      </Frame>
      <Legend items={[{ tone: "window", label: "still possible" }, { tone: "edge", label: "mid probe" }, { tone: "done", label: "answer" }]} />
    </div>
  );
}

export const binarySearchViz: VizDefinition<BinarySearchParams, BinarySearchState> = {
  id: "binary-search",
  title: "Binary search",
  summary: "Each probe halves the range while keeping one sentence true. Switch variants to see why the loop condition changes.",
  fields: [
    { key: "array", label: "Sorted array", kind: "text", hint: "Comma-separated; it is sorted for you." },
    { key: "target", label: "Target", kind: "number" },
    {
      key: "variant",
      label: "Variant",
      kind: "select",
      options: [
        { value: "exact", label: "Find any match (lo ≤ hi)" },
        { value: "first", label: "First index ≥ target (lo < hi)" },
      ],
    },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({
    array: asNumberList(raw.array, DEFAULTS.array).slice(0, 14),
    target: asNumber(raw.target, DEFAULTS.target),
    variant: asChoice(raw.variant, ["exact", "first"] as const, DEFAULTS.variant),
  }),
  steps: binarySearchSteps,
  View: BinarySearchView,
};
