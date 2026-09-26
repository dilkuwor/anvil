import { Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asNumber, asNumberList, type VizDefinition, type VizStep } from "./types";

/**
 * Twitter Snowflake: a 64-bit id built from a 41-bit timestamp, a 10-bit machine id and a
 * 12-bit sequence. Requests arrive with their own clock readings so the same millisecond
 * makes the sequence count up, and a clock that runs backwards makes the generator refuse.
 */

export type SnowflakeParams = { machineId: number; timestamps: number[] };
export type SnowflakeId = { ts: number; delta: number; seq: number; id: string; refused: boolean };
export type SnowflakeState = {
  phase: "layout" | "generate" | "result";
  i: number;
  ts: number | null;
  delta: number | null;
  seq: number;
  lastTs: number;
  refused: boolean;
  ids: SnowflakeId[];
};

/** Custom epoch in ms since Unix epoch (13 Sep 2020). Every timestamp is stored relative to it. */
export const SNOWFLAKE_EPOCH = 1_600_000_000_000;
export const TIMESTAMP_BITS = 41;
export const MACHINE_BITS = 10;
export const SEQUENCE_BITS = 12;
const MAX_MACHINE = 2 ** MACHINE_BITS - 1;
const MAX_SEQUENCE = 2 ** SEQUENCE_BITS - 1;
const MAX_DELTA = 2 ** TIMESTAMP_BITS - 1;

const DEFAULTS: SnowflakeParams = {
  machineId: 7,
  timestamps: [1_600_000_005_000, 1_600_000_005_000, 1_600_000_005_000, 1_600_000_005_001, 1_600_000_004_999, 1_600_000_005_003],
};

/** (delta << 22) | (machine << 12) | seq, done with BigInt because the result does not fit a double. */
export function snowflakeId(delta: number, machineId: number, seq: number): string {
  const shifted = BigInt(delta) * BigInt(2 ** (MACHINE_BITS + SEQUENCE_BITS));
  const machine = BigInt(machineId) * BigInt(2 ** SEQUENCE_BITS);
  return (shifted + machine + BigInt(seq)).toString();
}

function frame(state: SnowflakeState, kind: VizStep<SnowflakeState>["kind"], title: string, explain: string, interview: string): VizStep<SnowflakeState> {
  return { title, explain, interview, kind, state: { ...state, ids: state.ids.map((entry) => ({ ...entry })) } };
}

export function snowflakeSteps(params: SnowflakeParams): VizStep<SnowflakeState>[] {
  const steps: VizStep<SnowflakeState>[] = [];
  const state: SnowflakeState = { phase: "layout", i: -1, ts: null, delta: null, seq: 0, lastTs: -1, refused: false, ids: [] };
  steps.push(
    frame(
      state,
      "setup",
      `64 bits: ${TIMESTAMP_BITS} timestamp + ${MACHINE_BITS} machine + ${SEQUENCE_BITS} sequence`,
      `One bit is left unused so the id stays a positive signed 64-bit integer. This node is machine ${params.machineId}. Timestamps are milliseconds since a custom epoch, not since 1970.`,
      "Name the three fields and what each one buys: 'the timestamp on top makes ids sort by time, the machine id lets every node generate without talking to anyone, and the sequence separates ids made in the same millisecond'. Then say the budget: 41 bits of milliseconds is about 69 years from the custom epoch.",
    ),
  );
  let burstStarted = false;
  for (let i = 0; i < params.timestamps.length; i += 1) {
    const ts = params.timestamps[i];
    state.phase = "generate";
    state.i = i;
    state.ts = ts;
    if (ts < state.lastTs) {
      state.refused = true;
      state.delta = null;
      state.ids.push({ ts, delta: -1, seq: -1, id: "refused", refused: true });
      steps.push(
        frame(
          state,
          "tradeoff",
          `Request ${i + 1}: clock went back ${state.lastTs - ts} ms, refuse`,
          `The clock now reads ${ts - SNOWFLAKE_EPOCH} but the last id used ${state.lastTs - SNOWFLAKE_EPOCH}. Reusing an older millisecond could repeat an id, so the generator returns an error instead.`,
          "Say the rule and the two ways to handle it: 'the generator remembers the last timestamp it used; if the clock is behind that, it either refuses the request or waits until the clock catches up'. Add that NTP should be set to slew, not step, so the jump stays small, and that a big jump is an alert.",
        ),
      );
      continue;
    }
    state.refused = false;
    const delta = Math.min(MAX_DELTA, ts - SNOWFLAKE_EPOCH);
    const sameMs = ts === state.lastTs;
    if (sameMs && state.seq >= MAX_SEQUENCE) {
      state.delta = delta;
      steps.push(
        frame(
          state,
          "decision",
          `Request ${i + 1}: sequence full, wait for the next ms`,
          `All ${MAX_SEQUENCE + 1} sequence values for this millisecond are used. The generator spins until the clock moves, then starts the sequence again at 0.`,
          "This is the per-node rate limit: 'one node can make 4,096 ids per millisecond, about four million per second, and past that it waits one millisecond rather than reusing a number'. Say that this is far above any single node's traffic, so the wait is rare.",
        ),
      );
      continue;
    }
    state.seq = sameMs ? state.seq + 1 : 0;
    state.lastTs = ts;
    state.delta = delta;
    const id = snowflakeId(delta, params.machineId, state.seq);
    state.ids.push({ ts, delta, seq: state.seq, id, refused: false });
    if (sameMs) {
      const first = !burstStarted;
      burstStarted = true;
      steps.push(
        frame(
          state,
          "decision",
          `Request ${i + 1}: same ms, sequence → ${state.seq}`,
          `The timestamp did not change, so the timestamp and machine bits are the same as the previous id. Only the sequence goes up by one. The id is still larger than the last one.`,
          first
            ? "Point at the sequence band: 'two requests in the same millisecond on the same node differ only in the low 12 bits'. Then explain why that is safe: 'the timestamp and machine id are equal, so the sequence is the only thing that can tell them apart, and it is a counter, so it never repeats within the millisecond'."
            : "Keep the invariant in words: 'within one node, the pair (timestamp, sequence) only ever goes up, so every id is bigger than the one before it'. That is what makes the ids sortable without any coordination between nodes.",
        ),
      );
    } else {
      burstStarted = false;
      steps.push(
        frame(
          state,
          "invariant",
          `Request ${i + 1}: t − epoch = ${delta}, sequence reset to 0`,
          `New millisecond. The timestamp field becomes ${delta} (the clock reading minus the custom epoch), the machine field stays ${params.machineId}, and the sequence starts again at 0.`,
          "Narrate the subtraction: 'we store milliseconds since our own epoch, not since 1970, because 41 bits only holds 69 years and we want all of them to be useful'. Then the assembly: 'shift the timestamp left 22 bits, shift the machine id left 12, OR in the sequence'.",
        ),
      );
    }
  }
  state.phase = "result";
  state.ts = null;
  state.delta = null;
  state.refused = false;
  const issued = state.ids.filter((entry) => !entry.refused);
  const refused = state.ids.length - issued.length;
  const sorted = issued.every((entry, idx) => idx === 0 || BigInt(entry.id) > BigInt(issued[idx - 1].id));
  steps.push(
    frame(
      state,
      "result",
      `${issued.length} ids issued${refused ? `, ${refused} refused` : ""}, ${sorted ? "strictly increasing" : "not sorted"}`,
      `Read the id column top to bottom: each id is larger than the one above it, so a database can index them like a counter. Ids from other machines with the same timestamp differ in the machine bits.`,
      "Close with the property the interviewer wants: 'ids are unique without coordination, roughly ordered by time across the cluster, and exactly ordered within a node'. Then name the limits: 'roughly, because clocks on different machines differ by a few ms; and the machine id must be assigned once, from ZooKeeper or config, so two nodes never share it'.",
    ),
  );
  return steps;
}

const BAND_FILL = {
  timestamp: "color-mix(in srgb, var(--accent) 30%, transparent)",
  machine: "color-mix(in srgb, var(--teal) 30%, transparent)",
  sequence: "color-mix(in srgb, var(--foreground) 14%, transparent)",
  unused: "transparent",
} as const;

const BAND_STROKE = {
  timestamp: VIZ_COLORS.accent,
  machine: VIZ_COLORS.teal,
  sequence: VIZ_COLORS.muted,
  unused: VIZ_COLORS.line,
} as const;

export function SnowflakeView({ state, params }: { state: SnowflakeState; params: SnowflakeParams }) {
  const width = 500;
  const rows = state.ids.length;
  const listTop = 125;
  const height = listTop + Math.max(1, rows) * 15 + 12;
  const barX = 30;
  const barW = width - 60;
  const perBit = barW / 64;
  const bands: { key: keyof typeof BAND_FILL; bits: number; label: string; value: string }[] = [
    { key: "unused", bits: 1, label: "", value: "" },
    { key: "timestamp", bits: TIMESTAMP_BITS, label: `timestamp (${TIMESTAMP_BITS} bits)`, value: state.delta === null ? "ms − epoch" : String(state.delta) },
    { key: "machine", bits: MACHINE_BITS, label: `machine (${MACHINE_BITS})`, value: String(params.machineId) },
    { key: "sequence", bits: SEQUENCE_BITS, label: `sequence (${SEQUENCE_BITS})`, value: state.phase === "generate" && !state.refused ? String(state.seq) : "0…4095" },
  ];
  let cursor = barX;
  const current = state.phase === "generate" ? state.ids[state.ids.length - 1] : undefined;
  return (
    <div>
      <Frame width={width} height={height} label="A 64-bit Snowflake id split into timestamp, machine and sequence bands">
        <Label x={barX} y={22} tone="ink" weight={600}>
          {state.phase === "layout" ? "one 64-bit id" : state.phase === "result" ? "every id, sorted by time" : state.refused ? `request ${state.i + 1}: refused (clock went backwards)` : `request ${state.i + 1}: ${current?.id ?? ""}`}
        </Label>
        {bands.map((band) => {
          const x = cursor;
          const w = band.bits * perBit;
          cursor += w;
          const hot = state.refused && band.key === "timestamp";
          return (
            <g key={band.key}>
              <rect x={x} y={32} width={w} height={30} fill={hot ? "color-mix(in srgb, var(--coral) 22%, transparent)" : BAND_FILL[band.key]} stroke={hot ? VIZ_COLORS.coral : BAND_STROKE[band.key]} strokeWidth={band.key === "unused" ? 1 : 1.5} />
              {band.key !== "unused" ? (
                <>
                  <text x={x + w / 2} y={51} textAnchor="middle" fontSize={11} fontWeight={600} fill={hot ? VIZ_COLORS.coral : VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                    {band.value}
                  </text>
                  <text x={x + w / 2} y={76} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
                    {band.label}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}
        <Label x={barX} y={98} tone={state.refused ? "coral" : "muted"} size={10}>
          {state.phase === "layout"
            ? `epoch = ${SNOWFLAKE_EPOCH} ms; last timestamp used: none yet`
            : state.refused
              ? `clock reads ${(state.ts ?? 0) - SNOWFLAKE_EPOCH}, last used ${state.lastTs - SNOWFLAKE_EPOCH}: ✕ not issued`
              : `last timestamp used: ${state.lastTs < 0 ? "none" : state.lastTs - SNOWFLAKE_EPOCH}`}
        </Label>
        <Label x={barX} y={listTop - 6} size={10}>
          #
        </Label>
        <Label x={barX + 30} y={listTop - 6} size={10}>
          ms − epoch
        </Label>
        <Label x={barX + 120} y={listTop - 6} size={10}>
          seq
        </Label>
        <Label x={barX + 165} y={listTop - 6} size={10}>
          id
        </Label>
        {state.ids.map((entry, idx) => {
          const y = listTop + 10 + idx * 15;
          const isCurrent = state.phase === "generate" && idx === state.ids.length - 1;
          const tone = entry.refused ? VIZ_COLORS.coral : isCurrent ? VIZ_COLORS.accent : VIZ_COLORS.ink;
          return (
            <g key={idx} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={10}>
              <text x={barX} y={y} fill={tone}>
                {idx + 1}
              </text>
              <text x={barX + 30} y={y} fill={tone}>
                {entry.ts - SNOWFLAKE_EPOCH}
              </text>
              <text x={barX + 120} y={y} fill={tone}>
                {entry.refused ? "–" : entry.seq}
              </text>
              <text x={barX + 165} y={y} fill={tone} fontWeight={isCurrent ? 600 : 400}>
                {entry.refused ? "✕ refused" : entry.id}
              </text>
            </g>
          );
        })}
      </Frame>
      <Legend items={[{ tone: "accent", label: "timestamp bits" }, { tone: "teal", label: "machine bits" }, { tone: "idle", label: "sequence bits" }, { tone: "coral", label: "refused: clock went backwards" }]} />
    </div>
  );
}

export const snowflakeIdViz: VizDefinition<SnowflakeParams, SnowflakeState> = {
  id: "snowflake-id",
  title: "Snowflake id generation",
  summary: "Requests arrive with clock readings. Watch the timestamp, machine and sequence bands build each 64-bit id.",
  fields: [
    { key: "machineId", label: "Machine id", kind: "number", hint: "0 to 1023; 10 bits" },
    { key: "timestamps", label: "Request timestamps (ms)", kind: "text", hint: "Unix ms, comma separated. Repeat a value for a burst; put a smaller one after a larger one for a clock rollback." },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({
    machineId: Math.floor(asNumber(raw.machineId, DEFAULTS.machineId, 0, MAX_MACHINE)),
    timestamps: asNumberList(raw.timestamps, DEFAULTS.timestamps)
      .slice(0, 12)
      .map((ts) => Math.max(SNOWFLAKE_EPOCH, Math.floor(ts))),
  }),
  steps: snowflakeSteps,
  View: SnowflakeView,
};
