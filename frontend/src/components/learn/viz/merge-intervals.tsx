import { Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asStringList, type VizDefinition, type VizStep } from "./types";

/** Merge overlapping intervals. Sorting by start is the decision that makes a single pass correct. */

export type MergeIntervalsParams = { intervals: string[] };
type Interval = [number, number];
export type MergeIntervalsState = { sorted: Interval[]; merged: Interval[]; i: number; action: "merge" | "push" | null };

const DEFAULTS: MergeIntervalsParams = { intervals: ["1-3", "8-10", "2-6", "15-18", "17-20", "6-7"] };

function parse(items: string[]): Interval[] {
  const out: Interval[] = [];
  for (const raw of items) {
    const [a, b] = raw.split(/[-–,]/).map(Number);
    if (Number.isFinite(a) && Number.isFinite(b)) out.push([Math.min(a, b), Math.max(a, b)]);
  }
  return out;
}

function frame(state: MergeIntervalsState, kind: VizStep<MergeIntervalsState>["kind"], title: string, explain: string, interview: string): VizStep<MergeIntervalsState> {
  return { title, explain, interview, kind, state: { ...state, sorted: state.sorted.map((x) => [...x] as Interval), merged: state.merged.map((x) => [...x] as Interval) } };
}

export function mergeIntervalsSteps(params: MergeIntervalsParams): VizStep<MergeIntervalsState>[] {
  const raw = parse(params.intervals);
  const steps: VizStep<MergeIntervalsState>[] = [];
  const state: MergeIntervalsState = { sorted: raw.map((x) => [...x] as Interval), merged: [], i: -1, action: null };
  steps.push(frame(state, "setup", "Unsorted input", `${raw.length} intervals in arrival order. Overlaps can be anywhere.`, "Say the key decision before touching the data: 'sort by start; after that, any interval that overlaps the current merged one must be the next one in order, so one pass is enough'. Without the sort you compare every pair, O(n²)."));
  state.sorted = [...raw].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  steps.push(frame(state, "decision", "Sort by start", `Sorted: ${state.sorted.map(([a, b]) => `[${a},${b}]`).join(" ")}.`, "The sort is the cost: 'O(n log n) dominates; the merge pass is O(n)'. Say that the invariant you are about to keep is 'the last merged interval has the largest end seen so far among intervals that touch it'."));
  for (let i = 0; i < state.sorted.length; i += 1) {
    state.i = i;
    const [s, e] = state.sorted[i];
    const last = state.merged[state.merged.length - 1];
    if (last && s <= last[1]) {
      const before = last[1];
      last[1] = Math.max(last[1], e);
      state.action = "merge";
      steps.push(frame(state, "decision", `[${s},${e}] overlaps [${last[0]},${before}] → [${last[0]},${last[1]}]`, `Start ${s} ≤ current end ${before}, so they touch. Extend the end to max(${before}, ${e}) = ${last[1]}.`, "Two things to say: 'the overlap test is start ≤ previous end because they are sorted by start' and 'the end must be max, not just the new end, because the new interval can be entirely inside the old one'. Ask whether touching endpoints ([1,3] and [3,5]) count; interviewers care that you asked."));
    } else {
      state.merged.push([s, e]);
      state.action = "push";
      steps.push(frame(state, "invariant", `[${s},${e}] starts after ${last ? last[1] : "nothing"}: new group`, `${last ? `${s} > ${last[1]}, so there is a gap.` : "First interval."} Push it as the start of a new merged interval.`, "Once an interval does not overlap the last merged one, nothing later can overlap that merged one either, because starts only increase. That is the sentence that proves the single pass."));
    }
  }
  state.i = state.sorted.length;
  state.action = null;
  steps.push(frame(state, "result", `Merged: ${state.merged.map(([a, b]) => `[${a},${b}]`).join(" ")}`, `${raw.length} intervals became ${state.merged.length}.`, "Close with the family: 'insert interval is the same pass with one extra interval; meeting rooms asks how many overlap at once, which is a sweep line over sorted starts and ends; non-overlapping intervals is greedy by end time'. Naming the sibling problems is what shows pattern recognition."));
  return steps;
}

export function MergeIntervalsView({ state, params }: { state: MergeIntervalsState; params: MergeIntervalsParams }) {
  const all = parse(params.intervals);
  const max = Math.max(1, ...all.map(([, b]) => b));
  const width = 520;
  const rowH = 18;
  const top = 30;
  const scale = (x: number) => 30 + (x / max) * (width - 60);
  const rows = state.sorted;
  const height = top + rows.length * rowH + 60;
  return (
    <div>
      <Frame width={width} height={height} label="Intervals on a number line">
        <line x1={30} y1={top - 8} x2={width - 30} y2={top - 8} stroke={VIZ_COLORS.line} />
        {Array.from({ length: Math.min(max, 20) + 1 }, (_, t) => Math.round((t * max) / Math.min(max, 20))).filter((v, i, arr) => arr.indexOf(v) === i).map((t) => (
          <text key={t} x={scale(t)} y={top - 12} textAnchor="middle" fontSize={8} fill={VIZ_COLORS.muted}>
            {t}
          </text>
        ))}
        {rows.map(([a, b], index) => {
          const active = index === state.i;
          const consumed = index < state.i;
          return (
            <g key={`${a}-${b}-${index}`} style={{ transition: "all 200ms" }} opacity={consumed ? 0.45 : 1}>
              <rect x={scale(a)} y={top + index * rowH} width={Math.max(4, scale(b) - scale(a))} height={rowH - 6} rx={4} fill={active ? (state.action === "merge" ? "color-mix(in srgb, var(--accent) 45%, transparent)" : "color-mix(in srgb, var(--teal) 40%, transparent)") : "color-mix(in srgb, var(--steel-700) 60%, transparent)"} stroke={active ? VIZ_COLORS.accent : VIZ_COLORS.line} />
              <text x={scale(a) - 4} y={top + index * rowH + 10} textAnchor="end" fontSize={9} fill={VIZ_COLORS.muted}>
                [{a},{b}]
              </text>
            </g>
          );
        })}
        <Label x={30} y={top + rows.length * rowH + 14} tone="ink" weight={600}>
          merged
        </Label>
        {state.merged.map(([a, b], index) => (
          <g key={`m-${index}`}>
            <rect x={scale(a)} y={top + rows.length * rowH + 22} width={Math.max(4, scale(b) - scale(a))} height={14} rx={4} fill="color-mix(in srgb, var(--teal) 45%, transparent)" stroke={VIZ_COLORS.teal} />
            <text x={(scale(a) + scale(b)) / 2} y={top + rows.length * rowH + 33} textAnchor="middle" fontSize={9} fill={VIZ_COLORS.ink}>
              [{a},{b}]
            </text>
          </g>
        ))}
      </Frame>
      <Legend items={[{ tone: "accent", label: "merging into previous" }, { tone: "teal", label: "new group / merged" }]} />
    </div>
  );
}

export const mergeIntervalsViz: VizDefinition<MergeIntervalsParams, MergeIntervalsState> = {
  id: "merge-intervals",
  title: "Merge overlapping intervals",
  summary: "Sort by start, then one pass. The overlap test only works because of the sort.",
  fields: [{ key: "intervals", label: "Intervals", kind: "text", hint: "start-end pairs, comma-separated." }],
  defaults: DEFAULTS,
  parse: (raw) => ({ intervals: asStringList(raw.intervals, DEFAULTS.intervals).slice(0, 12) }),
  steps: mergeIntervalsSteps,
  View: MergeIntervalsView,
};
