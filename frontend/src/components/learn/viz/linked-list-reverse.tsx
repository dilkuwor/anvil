import { ArrowDefs, Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asNumberList, type VizDefinition, type VizStep } from "./types";

/** Iterative reversal with prev / curr / next. The invariant is "never lose the rest of the list". */

export type ListReverseParams = { values: number[] };
export type ListReverseState = { next: (number | null)[]; prev: number | null; curr: number | null; saved: number | null; action: "save" | "flip" | "advance" | null };

const DEFAULTS: ListReverseParams = { values: [1, 2, 3, 4, 5] };

function frame(state: ListReverseState, kind: VizStep<ListReverseState>["kind"], title: string, explain: string, interview: string): VizStep<ListReverseState> {
  return { title, explain, interview, kind, state: { ...state, next: [...state.next] } };
}

export function listReverseSteps(params: ListReverseParams): VizStep<ListReverseState>[] {
  const v = params.values;
  const steps: VizStep<ListReverseState>[] = [];
  const state: ListReverseState = { next: v.map((_, i) => (i + 1 < v.length ? i + 1 : null)), prev: null, curr: v.length ? 0 : null, saved: null, action: null };
  steps.push(frame(state, "setup", "prev = null, curr = head", `${v.length} nodes. Three pointers: prev (reversed part), curr (the node being flipped), next (the rest).`, "Say the invariant before the loop: 'everything before curr is already reversed and prev is its head; everything from curr onward is untouched and still reachable'. Every iteration must keep both halves of that sentence true."));
  let guard = 0;
  while (state.curr !== null && guard < 40) {
    guard += 1;
    const c = state.curr;
    state.saved = state.next[c];
    state.action = "save";
    steps.push(frame(state, "invariant", `next = ${state.saved === null ? "null" : v[state.saved]}`, `Save curr.next before touching it.`, "This is the line people forget: 'once I flip curr.next, the rest of the list is unreachable unless I saved it'. Say it as the reason for the third pointer."));
    state.next[c] = state.prev;
    state.action = "flip";
    steps.push(frame(state, "decision", `${v[c]}.next → ${state.prev === null ? "null" : v[state.prev]}`, `Point curr back at prev. ${v[c]} is now the head of the reversed part.`, "After the flip, the invariant holds with curr included: 'prev..curr is reversed, next.. is untouched'. That is the sentence that proves correctness without tracing the whole list."));
    state.prev = c;
    state.curr = state.saved;
    state.saved = null;
    state.action = "advance";
    steps.push(frame(state, "invariant", `prev = ${v[state.prev]}, curr = ${state.curr === null ? "null" : v[state.curr]}`, "Slide both pointers one step.", "O(n) time, O(1) space. Mention the recursive version and its cost: 'recursion is elegant but uses O(n) stack; for a long list I reverse iteratively'."));
  }
  state.action = null;
  steps.push(frame(state, "result", `New head: ${state.prev === null ? "null" : v[state.prev]}`, `curr is null, so prev is the new head. List: ${chain(state, v).join(" → ")}.`, "Close with the variants they will ask: 'reverse between positions m and n keeps the same loop with a fixed count; reverse in k-groups calls this as a helper and stitches the groups; both need the tail of the previous group'."));
  return steps;
}

function chain(state: ListReverseState, v: number[]): number[] {
  const out: number[] = [];
  let i = state.prev;
  let guard = 0;
  while (i !== null && guard < 50) {
    guard += 1;
    out.push(v[i]);
    i = state.next[i];
  }
  return out;
}

export function ListReverseView({ state, params }: { state: ListReverseState; params: ListReverseParams }) {
  const v = params.values;
  const width = 520;
  const height = 130;
  const spacing = Math.min(80, (width - 80) / Math.max(1, v.length));
  const x = (i: number) => 50 + i * spacing;
  return (
    <div>
      <Frame width={width} height={height} label="Linked list being reversed">
        <ArrowDefs />
        {v.map((_, i) => {
          const target = state.next[i];
          if (target === null) return <text key={i} x={x(i) + (target === null && i > 0 && state.next[i] === null && state.prev !== null && i <= (state.prev ?? -1) ? -34 : 24)} y={68} fontSize={9} fill={VIZ_COLORS.muted}>∅</text>;
          const backwards = target < i;
          return <path key={i} d={backwards ? `M ${x(i) - 16} 72 C ${x(i) - 30} 100, ${x(target) + 30} 100, ${x(target) + 16} 72` : `M ${x(i) + 16} 64 L ${x(target) - 18} 64`} fill="none" stroke={backwards ? VIZ_COLORS.teal : VIZ_COLORS.line} strokeWidth={backwards ? 2 : 1.25} markerEnd="url(#viz-arrow)" />;
        })}
        {v.map((value, i) => {
          const isPrev = state.prev === i;
          const isCurr = state.curr === i;
          const isSaved = state.saved === i;
          return (
            <g key={i} style={{ transition: "all 200ms" }}>
              <circle cx={x(i)} cy={64} r={15} fill={isCurr ? "color-mix(in srgb, var(--accent) 40%, transparent)" : isPrev ? "color-mix(in srgb, var(--teal) 30%, transparent)" : "var(--steel-900)"} stroke={isCurr ? VIZ_COLORS.accent : isPrev ? VIZ_COLORS.teal : isSaved ? VIZ_COLORS.coral : VIZ_COLORS.line} strokeWidth={isCurr || isPrev || isSaved ? 2 : 1.25} />
              <text x={x(i)} y={68} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.ink}>
                {value}
              </text>
              {isPrev ? <text x={x(i)} y={36} textAnchor="middle" fontSize={10} fontWeight={700} fill={VIZ_COLORS.teal}>prev</text> : null}
              {isCurr ? <text x={x(i)} y={isPrev ? 24 : 36} textAnchor="middle" fontSize={10} fontWeight={700} fill={VIZ_COLORS.accent}>curr</text> : null}
              {isSaved ? <text x={x(i)} y={36} textAnchor="middle" fontSize={10} fontWeight={700} fill={VIZ_COLORS.coral}>next</text> : null}
            </g>
          );
        })}
        <Label x={20} y={height - 8}>
          {state.prev === null ? "prev = null" : `reversed so far: ${chain(state, v).join(" → ")}`}
        </Label>
      </Frame>
      <Legend items={[{ tone: "teal", label: "reversed link / prev" }, { tone: "accent", label: "curr" }, { tone: "coral", label: "saved next" }]} />
    </div>
  );
}

export const listReverseViz: VizDefinition<ListReverseParams, ListReverseState> = {
  id: "linked-list-reverse",
  title: "Reverse a linked list",
  summary: "Save next, flip the pointer, slide. The saved pointer is the whole trick.",
  fields: [{ key: "values", label: "Values", kind: "text", hint: "Comma-separated." }],
  defaults: DEFAULTS,
  parse: (raw) => ({ values: asNumberList(raw.values, DEFAULTS.values).slice(0, 8) }),
  steps: listReverseSteps,
  View: ListReverseView,
};
