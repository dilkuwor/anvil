import { Cell, Frame, Label, Legend, Pointer } from "./primitives";
import { asNumberList, type VizDefinition, type VizStep } from "./types";

/** House Robber: the 1-D DP shape. The frames carry the three sentences DP answers need: state, recurrence, base. */

export type Dp1dParams = { values: number[] };
export type Dp1dState = { i: number; dp: (number | null)[]; take: boolean[]; choice: "take" | "skip" | null; chosen: number[] };

const DEFAULTS: Dp1dParams = { values: [2, 7, 9, 3, 1] };

function frame(state: Dp1dState, kind: VizStep<Dp1dState>["kind"], title: string, explain: string, interview: string): VizStep<Dp1dState> {
  return { title, explain, interview, kind, state: { ...state, dp: [...state.dp], take: [...state.take], chosen: [...state.chosen] } };
}

export function dp1dSteps(params: Dp1dParams): VizStep<Dp1dState>[] {
  const v = params.values;
  const steps: VizStep<Dp1dState>[] = [];
  const state: Dp1dState = { i: -1, dp: v.map(() => null), take: v.map(() => false), choice: null, chosen: [] };
  steps.push(frame(state, "setup", "Define the state before the loop", "dp[i] = the best total using only houses 0..i. Adjacent houses cannot both be taken.", "Three sentences make a DP answer: the state ('dp[i] is the best I can do with the first i+1 houses'), the recurrence ('take i and add dp[i−2], or skip i and keep dp[i−1]'), and the base cases. Say them before writing code; the code is then mechanical."));
  for (let i = 0; i < v.length; i += 1) {
    state.i = i;
    const skip = i >= 1 ? (state.dp[i - 1] as number) : 0;
    const take = v[i] + (i >= 2 ? (state.dp[i - 2] as number) : 0);
    const chooseTake = take > skip;
    state.dp[i] = Math.max(take, skip);
    state.take[i] = chooseTake;
    state.choice = chooseTake ? "take" : "skip";
    const explain = i === 0 ? `Base case: dp[0] = ${v[0]}, take the only house.` : i === 1 ? `Base case: dp[1] = max(${v[0]}, ${v[1]}) = ${state.dp[1]}.` : `take = ${v[i]} + dp[${i - 2}] = ${take}; skip = dp[${i - 1}] = ${skip}. dp[${i}] = ${state.dp[i]}.`;
    steps.push(frame(state, i <= 1 ? "invariant" : "decision", `dp[${i}] = ${state.dp[i]} (${chooseTake ? "take" : "skip"} ${v[i]})`, explain, i <= 1 ? "Base cases are where off-by-ones live. Say them explicitly: 'with one house take it; with two take the larger'. Or pad the array with dp[-1] = 0 to avoid the special case." : "Each cell depends only on the two before it. Say the consequence: 'I only need two variables, so space drops from O(n) to O(1)'. Also say the cost of that: 'then I cannot reconstruct which houses were taken without keeping the array'."));
  }
  const chosen: number[] = [];
  let i = v.length - 1;
  while (i >= 0) {
    if (i === 0 || (state.dp[i] as number) !== (state.dp[i - 1] as number)) {
      chosen.push(i);
      i -= 2;
    } else {
      i -= 1;
    }
  }
  state.chosen = chosen.reverse();
  state.i = v.length;
  state.choice = null;
  steps.push(frame(state, "result", `Best = ${state.dp[v.length - 1]}, houses ${state.chosen.join(", ")}`, `Walk back from the end: whenever dp[i] differs from dp[i−1], house i was taken; then jump two.`, "Close with recognition cues: 'overlapping subproblems and an optimal substructure, a choice at each index, and the answer to i depends on a fixed number of earlier answers'. That pattern covers climbing stairs, decode ways, and max subarray with small changes to the recurrence."));
  return steps;
}

export function Dp1dView({ state, params }: { state: Dp1dState; params: Dp1dParams }) {
  const v = params.values;
  const size = 36;
  const gap = 8;
  const width = Math.max(440, v.length * (size + gap) + 100);
  return (
    <div>
      <Frame width={width} height={170} label="1-D DP table filling left to right">
        <Label x={20} y={30}>
          values
        </Label>
        {v.map((value, index) => (
          <Cell key={index} x={70 + index * (size + gap)} y={40} size={size} value={value} tone={state.chosen.includes(index) ? "done" : index === state.i ? (state.choice === "take" ? "edge" : "miss") : "idle"} caption={String(index)} />
        ))}
        {state.i >= 0 && state.i < v.length ? <Pointer x={70 + state.i * (size + gap) + size / 2} y={36} label="i" /> : null}
        <Label x={20} y={118}>
          dp
        </Label>
        {v.map((_, index) => (
          <Cell key={index} x={70 + index * (size + gap)} y={100} size={size} value={state.dp[index] === null ? "·" : (state.dp[index] as number)} tone={state.dp[index] === null ? "idle" : index === state.i ? "edge" : index === state.i - 1 || index === state.i - 2 ? "window" : "faded"} />
        ))}
        <Label x={20} y={160} tone="ink" weight={600}>
          {state.i >= 0 && state.i < v.length ? `dp[${state.i}] = max(v[${state.i}] + dp[${state.i - 2}], dp[${state.i - 1}])` : "dp[i] = max(v[i] + dp[i−2], dp[i−1])"}
        </Label>
      </Frame>
      <Legend items={[{ tone: "edge", label: "computing / take" }, { tone: "window", label: "cells it reads" }, { tone: "miss", label: "skip" }, { tone: "done", label: "in the answer" }]} />
    </div>
  );
}

export const dp1dViz: VizDefinition<Dp1dParams, Dp1dState> = {
  id: "dp-1d",
  title: "1-D dynamic programming (House Robber)",
  summary: "State, recurrence, base cases, then reconstruction. Each cell reads only the two before it.",
  fields: [{ key: "values", label: "House values", kind: "text", hint: "Comma-separated." }],
  defaults: DEFAULTS,
  parse: (raw) => ({ values: asNumberList(raw.values, DEFAULTS.values).slice(0, 10) }),
  steps: dp1dSteps,
  View: Dp1dView,
};
