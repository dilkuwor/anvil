import { Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asNumber, type VizDefinition, type VizStep } from "./types";

/** Producer faster than consumers: the backlog grows until you add consumers or apply backpressure. */

export type BackpressureParams = { producerRate: number; consumerRate: number; consumers: number; addConsumersAt: number; seconds: number; bound: number };
export type BackpressureState = { t: number; backlog: number; consumers: number; history: number[]; dropped: number; drainEta: number | null };

const DEFAULTS: BackpressureParams = { producerRate: 1000, consumerRate: 300, consumers: 2, addConsumersAt: 6, seconds: 12, bound: 0 };

function frame(state: BackpressureState, kind: VizStep<BackpressureState>["kind"], title: string, explain: string, interview: string): VizStep<BackpressureState> {
  return { title, explain, interview, kind, state: { ...state, history: [...state.history] } };
}

export function backpressureSteps(params: BackpressureParams): VizStep<BackpressureState>[] {
  const steps: VizStep<BackpressureState>[] = [];
  const state: BackpressureState = { t: 0, backlog: 0, consumers: params.consumers, history: [0], dropped: 0, drainEta: null };
  const capacity = () => state.consumers * params.consumerRate;
  steps.push(frame(state, "setup", `Producer ${params.producerRate}/s, ${params.consumers} consumers × ${params.consumerRate}/s`, `Consume capacity is ${capacity()}/s. ${params.bound > 0 ? `Queue bounded at ${params.bound}.` : "Queue unbounded."}`, "Say the balance equation first: 'backlog grows at produce minus consume; if that is positive for long, the queue is not a buffer, it is a leak'. A queue only absorbs bursts; it cannot fix a sustained rate mismatch."));
  for (let t = 1; t <= params.seconds; t += 1) {
    state.t = t;
    if (t === params.addConsumersAt) {
      state.consumers *= 2;
      steps.push(frame(state, "decision", `t=${t}s: scale consumers to ${state.consumers}`, `Consume capacity is now ${capacity()}/s${capacity() > params.producerRate ? ", above the producer" : ", still below the producer"}.`, "Adding consumers is the right first move only if the work is parallel: 'more consumers need more partitions or the extra ones sit idle', and 'if the bottleneck is the database the consumers write to, more consumers just move the queue downstream'."));
    }
    const delta = params.producerRate - capacity();
    let next = state.backlog + delta;
    if (params.bound > 0 && next > params.bound) {
      state.dropped += next - params.bound;
      next = params.bound;
    }
    state.backlog = Math.max(0, next);
    state.history.push(state.backlog);
    const rate = capacity() - params.producerRate;
    state.drainEta = state.backlog > 0 && rate > 0 ? Math.ceil(state.backlog / rate) : null;
    if (t === params.addConsumersAt) continue;
    const growing = delta > 0;
    const capped = params.bound > 0 && state.backlog >= params.bound && growing;
    steps.push(frame(state, capped ? "tradeoff" : growing ? "invariant" : "invariant", `t=${t}s: backlog ${state.backlog}${capped ? ` (capped, dropped ${state.dropped})` : ""}`, growing ? `${params.producerRate} in, ${capacity()} out: +${delta}/s.` : `${capacity()} out vs ${params.producerRate} in: draining ${-delta}/s${state.drainEta ? `, empty in ~${state.drainEta}s` : ""}.`, capped ? "A bounded queue makes the choice explicit: 'drop, block the producer, or shed low-priority work'. Say which one and why; unbounded queues just turn the same decision into an out-of-memory crash later." : growing ? "Say the number as lag, not size: 'at this rate a message waits backlog ÷ consume-rate seconds; that is the SLO I actually care about'. Monitor consumer lag, not queue depth." : "Draining is where you compute recovery time out loud: 'backlog divided by the surplus rate'. If that is longer than the SLO, you need burst capacity, not just enough."));
  }
  steps.push(frame(state, "result", state.backlog === 0 ? "Backlog cleared" : `Backlog ${state.backlog} after ${params.seconds}s`, `Peak backlog ${Math.max(...state.history)}${state.dropped ? `, dropped ${state.dropped}` : ""}.`, "Close with the three levers in order: 'scale consumers if the work is parallel; apply backpressure (bounded queue, 429s, credit-based flow) to slow producers; and shed or sample when neither is possible'. Then name the dead-letter queue for the messages that fail rather than wait."));
  return steps;
}

export function BackpressureView({ state, params }: { state: BackpressureState; params: BackpressureParams }) {
  const width = 480;
  const height = 190;
  const max = Math.max(1, ...state.history, params.bound || 0);
  const barW = (width - 60) / Math.max(1, params.seconds + 1);
  const y = (v: number) => height - 40 - (v / max) * 110;
  return (
    <div>
      <Frame width={width} height={height} label="Queue backlog over time">
        {params.bound > 0 ? <line x1={30} y1={y(params.bound)} x2={width - 30} y2={y(params.bound)} stroke={VIZ_COLORS.coral} strokeDasharray="4 4" /> : null}
        {state.history.map((v, t) => (
          <rect key={t} x={30 + t * barW} y={y(v)} width={Math.max(2, barW - 4)} height={height - 40 - y(v)} rx={2} fill={t === state.t ? "color-mix(in srgb, var(--accent) 60%, transparent)" : v > (state.history[t - 1] ?? 0) ? "color-mix(in srgb, var(--coral) 45%, transparent)" : "color-mix(in srgb, var(--teal) 45%, transparent)"} />
        ))}
        {params.addConsumersAt > 0 && params.addConsumersAt <= params.seconds ? (
          <g>
            <line x1={30 + params.addConsumersAt * barW} y1={30} x2={30 + params.addConsumersAt * barW} y2={height - 40} stroke={VIZ_COLORS.accent} strokeDasharray="3 3" />
            <text x={30 + params.addConsumersAt * barW + 4} y={40} fontSize={9} fill={VIZ_COLORS.accent}>
              +consumers
            </text>
          </g>
        ) : null}
        <Label x={30} y={height - 22} tone="ink" weight={600}>
          t = {state.t}s · backlog {state.backlog}
        </Label>
        <Label x={width - 30} y={height - 22} anchor="end">
          {state.consumers} consumers · {state.consumers * params.consumerRate}/s out vs {params.producerRate}/s in
        </Label>
        <Label x={30} y={height - 6}>
          {state.drainEta ? `drains in ~${state.drainEta}s` : state.dropped ? `dropped ${state.dropped}` : "each bar is one second"}
        </Label>
      </Frame>
      <Legend items={[{ tone: "coral", label: "growing" }, { tone: "teal", label: "draining" }, { tone: "accent", label: "now" }]} />
    </div>
  );
}

export const backpressureViz: VizDefinition<BackpressureParams, BackpressureState> = {
  id: "queue-backpressure",
  title: "Queue backlog and backpressure",
  summary: "A queue only buffers a burst. Watch what a sustained mismatch does, then add consumers or a bound.",
  fields: [
    { key: "producerRate", label: "Producer /s", kind: "number" },
    { key: "consumerRate", label: "Per-consumer /s", kind: "number" },
    { key: "consumers", label: "Consumers", kind: "number" },
    { key: "addConsumersAt", label: "Double consumers at second", kind: "number", hint: "0 to never scale." },
    { key: "seconds", label: "Seconds", kind: "number" },
    { key: "bound", label: "Queue bound", kind: "number", hint: "0 for unbounded." },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({ producerRate: asNumber(raw.producerRate, DEFAULTS.producerRate, 1), consumerRate: asNumber(raw.consumerRate, DEFAULTS.consumerRate, 1), consumers: asNumber(raw.consumers, DEFAULTS.consumers, 1, 16), addConsumersAt: asNumber(raw.addConsumersAt, DEFAULTS.addConsumersAt, 0, 30), seconds: asNumber(raw.seconds, DEFAULTS.seconds, 3, 24), bound: asNumber(raw.bound, DEFAULTS.bound, 0) }),
  steps: backpressureSteps,
  View: BackpressureView,
  simulatorHref: "/system-design/simulator?sample=chat-system",
};
