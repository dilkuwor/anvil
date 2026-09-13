import { Box, Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asNumber, asStringList, type VizDefinition, type VizStep } from "./types";

/** Circuit breaker state machine driven by a sequence of calls. Closed, open, half-open, and why each exists. */

export type CircuitBreakerParams = { threshold: number; cooldown: number; calls: string[] };
export type CircuitBreakerState = { i: number; status: "closed" | "open" | "half-open"; failures: number; openedAt: number | null; outcome: "ok" | "fail" | "rejected" | "probe-ok" | "probe-fail" | null; log: string[] };

const DEFAULTS: CircuitBreakerParams = { threshold: 3, cooldown: 4, calls: ["ok", "fail", "fail", "fail", "ok", "ok", "wait", "wait", "ok", "ok", "fail"] };

function frame(state: CircuitBreakerState, kind: VizStep<CircuitBreakerState>["kind"], title: string, explain: string, interview: string): VizStep<CircuitBreakerState> {
  return { title, explain, interview, kind, state: { ...state, log: [...state.log] } };
}

export function circuitBreakerSteps(params: CircuitBreakerParams): VizStep<CircuitBreakerState>[] {
  const steps: VizStep<CircuitBreakerState>[] = [];
  const state: CircuitBreakerState = { i: -1, status: "closed", failures: 0, openedAt: null, outcome: null, log: [] };
  steps.push(frame(state, "setup", `Closed. Opens after ${params.threshold} consecutive failures, retries after ${params.cooldown} ticks`, "Calls flow through normally. The breaker counts failures.", "Say the problem it solves: 'when a dependency is down, every call still burns a thread and a timeout; the breaker fails fast so the caller stays healthy and the dependency gets room to recover'. It protects the caller as much as the callee."));
  let tick = 0;
  for (let i = 0; i < params.calls.length; i += 1) {
    state.i = i;
    tick += 1;
    const call = params.calls[i].toLowerCase();
    if (state.status === "open" && state.openedAt !== null && tick - state.openedAt >= params.cooldown) {
      state.status = "half-open";
      state.outcome = null;
      steps.push(frame({ ...state, i: i - 1 }, "decision", `Tick ${tick}: cooldown elapsed, half-open`, "The breaker will let exactly one probe call through to test the dependency.", "Half-open is the part candidates forget: 'without it, the breaker either stays open forever or reopens the floodgates all at once'. One probe, and its result decides."));
    }
    if (call === "wait") {
      state.outcome = null;
      state.log.push("wait");
      steps.push(frame(state, "invariant", `Tick ${tick}: no traffic`, `Breaker is ${state.status}. Waiting for the cooldown to pass.`, "Cooldown is a trade-off between recovery time and hammering a struggling dependency. Say a number: 'start at a few seconds with backoff'."));
      continue;
    }
    if (state.status === "open") {
      state.outcome = "rejected";
      state.log.push("rejected");
      steps.push(frame(state, "decision", `Call ${i + 1}: rejected immediately`, "The breaker is open. The call fails in microseconds without touching the dependency.", "This is fail-fast, and the reply must say what the caller does instead: 'return a cached value, a default, or a clear error; never queue the call for later without a bound'."));
      continue;
    }
    if (state.status === "half-open") {
      if (call === "ok") {
        state.status = "closed";
        state.failures = 0;
        state.openedAt = null;
        state.outcome = "probe-ok";
        state.log.push("probe ok");
        steps.push(frame(state, "result", `Probe succeeded: closed again`, "The dependency answered. Normal traffic resumes and the failure count resets.", "Say what 'success' should mean for the probe: 'a real request, not a ping, because the dependency can be up and still failing the actual call'."));
      } else {
        state.status = "open";
        state.openedAt = tick;
        state.outcome = "probe-fail";
        state.log.push("probe fail");
        steps.push(frame(state, "tradeoff", `Probe failed: open again`, "Back to open for another cooldown. Only one request paid the price.", "Backoff the cooldown on repeated probe failures, and say the observability angle: 'breaker state changes are the alert; a breaker that flaps is a dependency that is half-dead'."));
      }
      continue;
    }
    if (call === "ok") {
      state.failures = 0;
      state.outcome = "ok";
      state.log.push("ok");
      steps.push(frame(state, "invariant", `Call ${i + 1}: ok`, "Success resets the consecutive-failure count.", "Say which failures count: 'timeouts and 5xx count, 4xx do not; a client error is not a sign the dependency is unhealthy'. A breaker that trips on 404s takes a healthy service offline."));
    } else {
      state.failures += 1;
      state.outcome = "fail";
      state.log.push("fail");
      if (state.failures >= params.threshold) {
        state.status = "open";
        state.openedAt = tick;
        steps.push(frame(state, "decision", `Call ${i + 1}: failure ${state.failures} of ${params.threshold}: OPEN`, "Threshold reached. The breaker opens and subsequent calls are rejected without being sent.", "Threshold by count is the simple version; say the better one: 'a failure rate over a sliding window with a minimum volume, so one bad call at 3 a.m. does not trip it'."));
      } else {
        steps.push(frame(state, "decision", `Call ${i + 1}: failure ${state.failures} of ${params.threshold}`, "Still closed. Counting.", "Each failure here still costs a full timeout. Say the pairing: 'breakers need short timeouts to be useful; a 30-second timeout with a breaker is still 30 seconds per failure until it trips'."));
      }
    }
  }
  steps.push(frame(state, "result", `Ended ${state.status}`, `Sequence: ${state.log.join(", ")}.`, "Close with scope: 'one breaker per dependency, not one global; and pair it with bulkheads so one slow dependency cannot exhaust the thread pool for everything else'. Resilience patterns are a set, not a single switch."));
  return steps;
}

export function CircuitBreakerView({ state, params }: { state: CircuitBreakerState; params: CircuitBreakerParams }) {
  const width = 480;
  const height = 170;
  const tone = state.status === "closed" ? "ok" : state.status === "open" ? "hot" : "active";
  return (
    <div>
      <Frame width={width} height={height} label="Circuit breaker state machine">
        {(["closed", "half-open", "open"] as const).map((s, i) => (
          <Box key={s} x={30 + i * 150} y={30} width={130} height={50} title={s} tone={state.status === s ? tone : "idle"}>
            <text x={95 + i * 150} y={68} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
              {s === "closed" ? `failures ${state.failures}/${params.threshold}` : s === "open" ? "rejecting" : "one probe"}
            </text>
          </Box>
        ))}
        <path d="M 160 55 L 320 55" stroke={VIZ_COLORS.line} strokeWidth={1} fill="none" />
        <Label x={20} y={110}>
          calls
        </Label>
        {params.calls.map((c, i) => {
          const done = i <= state.i;
          const outcome = state.log[i];
          const fill = !done ? "transparent" : outcome === "ok" || outcome === "probe ok" ? "color-mix(in srgb, var(--teal) 50%, transparent)" : outcome === "wait" ? "transparent" : "color-mix(in srgb, var(--coral) 45%, transparent)";
          return (
            <g key={i}>
              <rect x={60 + i * 34} y={96} width={28} height={20} rx={4} fill={fill} stroke={i === state.i ? VIZ_COLORS.accent : VIZ_COLORS.line} strokeWidth={i === state.i ? 2 : 1} />
              <text x={74 + i * 34} y={110} textAnchor="middle" fontSize={8} fill={VIZ_COLORS.ink}>
                {c === "wait" ? "…" : c}
              </text>
              {done && outcome ? (
                <text x={74 + i * 34} y={130} textAnchor="middle" fontSize={7} fill={VIZ_COLORS.muted}>
                  {outcome === "rejected" ? "rej" : outcome.replace("probe ", "p:")}
                </text>
              ) : null}
            </g>
          );
        })}
        <Label x={20} y={height - 10} tone="ink" weight={600}>
          {state.status.toUpperCase()}
          {state.outcome === "rejected" ? " · call rejected without reaching the dependency" : ""}
        </Label>
      </Frame>
      <Legend items={[{ tone: "teal", label: "success" }, { tone: "coral", label: "failure / rejected" }, { tone: "accent", label: "current" }]} />
    </div>
  );
}

export const circuitBreakerViz: VizDefinition<CircuitBreakerParams, CircuitBreakerState> = {
  id: "circuit-breaker",
  title: "Circuit breaker",
  summary: "Closed, open, half-open. Feed it a call sequence and watch when it trips and how it recovers.",
  fields: [
    { key: "threshold", label: "Failures to open", kind: "number" },
    { key: "cooldown", label: "Cooldown (ticks)", kind: "number" },
    { key: "calls", label: "Calls", kind: "text", hint: "ok, fail, or wait; comma-separated." },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({ threshold: asNumber(raw.threshold, DEFAULTS.threshold, 1, 10), cooldown: asNumber(raw.cooldown, DEFAULTS.cooldown, 1, 10), calls: asStringList(raw.calls, DEFAULTS.calls).slice(0, 14).map((c) => (["ok", "fail", "wait"].includes(c.toLowerCase()) ? c.toLowerCase() : "ok")) }),
  steps: circuitBreakerSteps,
  View: CircuitBreakerView,
};
