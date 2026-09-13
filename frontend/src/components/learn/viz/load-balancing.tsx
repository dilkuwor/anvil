import { Box, Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asChoice, asNumber, asNumberList, type VizDefinition, type VizStep } from "./types";

/** Round-robin vs least-connections under uneven request cost. The difference only appears over time. */

export type LoadBalancingParams = { algorithm: "round_robin" | "least_connections"; servers: number; durations: number[] };
export type LoadBalancingState = { tick: number; active: number[][]; assigned: number | null; request: number | null; served: number };

const DEFAULTS: LoadBalancingParams = { algorithm: "round_robin", servers: 2, durations: [4, 1, 1, 4, 1, 1] };

function frame(state: LoadBalancingState, kind: VizStep<LoadBalancingState>["kind"], title: string, explain: string, interview: string): VizStep<LoadBalancingState> {
  return { title, explain, interview, kind, state: { ...state, active: state.active.map((s) => [...s]) } };
}

export function loadBalancingSteps(params: LoadBalancingParams): VizStep<LoadBalancingState>[] {
  const steps: VizStep<LoadBalancingState>[] = [];
  const rr = params.algorithm === "round_robin";
  const state: LoadBalancingState = { tick: 0, active: Array.from({ length: params.servers }, () => []), assigned: null, request: null, served: 0 };
  steps.push(frame(state, "setup", `${rr ? "Round-robin" : "Least-connections"} across ${params.servers} servers`, `One request arrives per tick with durations ${params.durations.join(", ")} ticks. Active work drains one tick at a time.`, "Say what the balancer can and cannot see: 'round-robin needs no state and assumes requests cost the same; least-connections tracks in-flight requests per server, which is a proxy for load, not a measurement of it'. Then say which you would start with: round-robin, until requests become uneven."));
  let rrIndex = 0;
  for (let i = 0; i < params.durations.length; i += 1) {
    state.tick = i;
    state.active = state.active.map((s) => s.map((r) => r - 1).filter((r) => r > 0));
    let target: number;
    if (rr) {
      target = rrIndex % params.servers;
      rrIndex += 1;
    } else {
      target = state.active.reduce((best, s, idx) => (s.length < state.active[best].length ? idx : best), 0);
    }
    state.active[target].push(params.durations[i]);
    state.assigned = target;
    state.request = i;
    const loads = state.active.map((s) => s.length);
    steps.push(frame(state, i === 0 ? "invariant" : "decision", `Request ${i + 1} (${params.durations[i]} ticks) → server ${target + 1}`, rr ? `Round-robin picks the next server in rotation regardless of what it is doing. In-flight: ${loads.join(" / ")}.` : `Least-connections picks the server with the fewest in-flight requests (${loads.map((l, idx) => `S${idx + 1}=${idx === target ? l - 1 : l}`).join(", ")} before assignment).`, rr ? (Math.max(...loads) - Math.min(...loads) >= 2 ? "Here is round-robin's failure: 'equal counts, unequal work; one server is holding the long requests while the other idles'. That is the sentence that justifies switching algorithms." : "Round-robin is fine while requests are uniform. Say the precondition out loud so the interviewer knows you know it.") : "Least-connections adapts to request cost without measuring it: 'a server holding slow requests accumulates connections and stops receiving new ones'. Cost: the balancer must track state per backend, which matters when there are many balancers.") );
  }
  state.request = null;
  state.assigned = null;
  const peak = Math.max(...state.active.map((s) => s.length));
  steps.push(frame(state, "result", `Final in-flight: ${state.active.map((s) => s.length).join(" / ")}`, `Peak concurrent work on one server: ${peak}.`, "Close with the parts of the answer beyond the algorithm: 'health checks pull a dead server out in seconds; sticky sessions break balancing and should be replaced by shared session state; L4 is faster, L7 can route by path'. And the follow-up: 'what if the balancer dies? Two of them behind DNS or a floating IP'."));
  return steps;
}

export function LoadBalancingView({ state, params }: { state: LoadBalancingState; params: LoadBalancingParams }) {
  const width = 480;
  const rowH = 54;
  const height = 60 + params.servers * rowH;
  return (
    <div>
      <Frame width={width} height={height} label="Load balancer assigning requests to servers">
        <Box x={20} y={height / 2 - 30} width={110} height={60} title="Balancer" tone={state.request !== null ? "active" : "idle"}>
          <text x={75} y={height / 2 + 12} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
            {params.algorithm === "round_robin" ? "round-robin" : "least-conn"}
          </text>
        </Box>
        {state.active.map((reqs, i) => {
          const y = 30 + i * rowH;
          const hot = reqs.length >= 3;
          return (
            <g key={i}>
              <line x1={130} y1={height / 2} x2={180} y2={y + 22} stroke={state.assigned === i ? VIZ_COLORS.accent : VIZ_COLORS.line} strokeWidth={state.assigned === i ? 2 : 1} />
              <Box x={180} y={y} width={280} height={44} title={`Server ${i + 1} · ${reqs.length} in flight`} tone={state.assigned === i ? "active" : hot ? "hot" : reqs.length === 0 ? "idle" : "ok"}>
                {reqs.map((remaining, r) => (
                  <rect key={r} x={190 + r * 44} y={y + 24} width={remaining * 9} height={12} rx={3} fill={r === reqs.length - 1 && state.assigned === i ? "color-mix(in srgb, var(--accent) 60%, transparent)" : "color-mix(in srgb, var(--teal) 45%, transparent)"} />
                ))}
              </Box>
            </g>
          );
        })}
        <Label x={20} y={height - 8}>
          {state.request !== null ? `tick ${state.tick + 1}: request ${state.request + 1}` : "bar length = ticks of work remaining"}
        </Label>
      </Frame>
      <Legend items={[{ tone: "accent", label: "just assigned" }, { tone: "teal", label: "in-flight work" }, { tone: "coral", label: "3+ in flight" }]} />
    </div>
  );
}

export const loadBalancingViz: VizDefinition<LoadBalancingParams, LoadBalancingState> = {
  id: "load-balancing",
  title: "Round-robin vs least-connections",
  summary: "Same requests, two algorithms. The difference shows up only when requests cost different amounts.",
  fields: [
    {
      key: "algorithm",
      label: "Algorithm",
      kind: "select",
      options: [
        { value: "round_robin", label: "Round-robin" },
        { value: "least_connections", label: "Least connections" },
      ],
    },
    { key: "servers", label: "Servers", kind: "number" },
    { key: "durations", label: "Request durations", kind: "text", hint: "Ticks each request takes, in arrival order." },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({ algorithm: asChoice(raw.algorithm, ["round_robin", "least_connections"] as const, DEFAULTS.algorithm), servers: asNumber(raw.servers, DEFAULTS.servers, 2, 4), durations: asNumberList(raw.durations, DEFAULTS.durations).slice(0, 10).map((d) => Math.max(1, Math.min(6, Math.round(d)))) }),
  steps: loadBalancingSteps,
  View: LoadBalancingView,
  simulatorHref: "/system-design/simulator?sample=url-shortener",
};
