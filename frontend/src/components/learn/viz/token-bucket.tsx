import { Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asNumber, asNumberList, type VizDefinition, type VizStep } from "./types";

/** Token bucket over a request timeline, with the fixed-window boundary burst as the comparison. */

export type TokenBucketParams = { capacity: number; refillPerSec: number; requests: number[] };
export type TokenBucketState = { i: number; tokens: number; lastTime: number; decisions: ("allow" | "deny")[]; windowDecisions: ("allow" | "deny")[] };

const DEFAULTS: TokenBucketParams = { capacity: 3, refillPerSec: 2, requests: [0, 0.1, 0.2, 0.3, 0.9, 1.0, 1.1, 1.2, 2.5, 2.6] };

function frame(state: TokenBucketState, kind: VizStep<TokenBucketState>["kind"], title: string, explain: string, interview: string): VizStep<TokenBucketState> {
  return { title, explain, interview, kind, state: { ...state, decisions: [...state.decisions], windowDecisions: [...state.windowDecisions] } };
}

export function tokenBucketSteps(params: TokenBucketParams): VizStep<TokenBucketState>[] {
  const steps: VizStep<TokenBucketState>[] = [];
  const times = [...params.requests].sort((a, b) => a - b);
  const state: TokenBucketState = { i: -1, tokens: params.capacity, lastTime: times[0] ?? 0, decisions: [], windowDecisions: [] };
  const windowLimit = params.refillPerSec;
  const windowCounts = new Map<number, number>();
  steps.push(frame(state, "setup", `Bucket holds ${params.capacity}, refills ${params.refillPerSec}/s`, `Starts full. Each request takes one token; refill is continuous. Compared against a fixed window of ${windowLimit} per second.`, "Name the two numbers and what each controls: 'capacity is the burst I allow, refill rate is the sustained rate'. That separation is why token bucket is the default: a fixed window has only one number and therefore no way to say burst separately from average."));
  for (let i = 0; i < times.length; i += 1) {
    state.i = i;
    const t = times[i];
    const refill = (t - state.lastTime) * params.refillPerSec;
    const before = state.tokens;
    state.tokens = Math.min(params.capacity, state.tokens + refill);
    state.lastTime = t;
    const allow = state.tokens >= 1;
    if (allow) state.tokens -= 1;
    state.decisions.push(allow ? "allow" : "deny");
    const bucket = Math.floor(t);
    const count = (windowCounts.get(bucket) ?? 0) + 1;
    windowCounts.set(bucket, count);
    state.windowDecisions.push(count <= windowLimit ? "allow" : "deny");
    steps.push(frame(state, allow ? "invariant" : "decision", `t=${t.toFixed(1)}s: ${allow ? "allow" : "deny"} (tokens ${state.tokens.toFixed(1)})`, `${refill > 0 ? `Refilled ${refill.toFixed(1)} since last request (${before.toFixed(1)} → ${Math.min(params.capacity, before + refill).toFixed(1)}). ` : ""}${allow ? "One token spent." : "Bucket empty; reject with 429 and a Retry-After."}`, allow ? "Say how you compute refill without a timer: 'store tokens and last-timestamp per key; on each request add elapsed × rate, cap at capacity, then try to take one'. Two numbers per key, O(1), no background job." : "Rejecting is a design decision, not a failure: 'return 429 with Retry-After so well-behaved clients back off; a queue instead of a reject turns a rate limiter into a latency problem'."));
  }
  const bucketDenied = state.decisions.filter((d) => d === "deny").length;
  const windowDenied = state.windowDecisions.filter((d) => d === "deny").length;
  steps.push(frame(state, "tradeoff", `Token bucket denied ${bucketDenied}; fixed window denied ${windowDenied}`, "The lower row shows the same requests under a fixed per-second window. Requests at 0.9s and 1.0s land in different windows, so a burst straddling the boundary passes at up to twice the limit.", "Compare out loud: 'fixed window is trivial but lets 2× the limit through at a boundary; sliding log is exact but O(n) memory per key; sliding window counter approximates; token bucket allows a controlled burst at O(1)'. Then the distributed part: 'counters live in Redis with atomic INCR or a Lua script; if Redis is down, fail open for availability or closed for safety, and say which'."));
  steps.push(frame(state, "result", `Allowed ${times.length - bucketDenied} of ${times.length}`, `Final tokens ${state.tokens.toFixed(1)}. The bucket admitted a burst of ${params.capacity} and then held the sustained rate at ${params.refillPerSec}/s.`, "Close with where it runs and how it fails: 'per API key at the gateway, counters in Redis with a Lua script for atomic refill-and-take; on Redis failure I fail open with local approximate limits, and I say that this is a deliberate availability-over-strictness choice'."));
  return steps;
}

export function TokenBucketView({ state, params }: { state: TokenBucketState; params: TokenBucketParams }) {
  const times = [...params.requests].sort((a, b) => a - b);
  const width = 500;
  const height = 170;
  const maxT = Math.max(1, ...times) + 0.3;
  const x = (t: number) => 40 + (t / maxT) * (width - 80);
  return (
    <div>
      <Frame width={width} height={height} label="Requests over time under a token bucket">
        <Label x={20} y={30}>
          bucket
        </Label>
        {Array.from({ length: params.capacity }, (_, k) => (
          <rect key={k} x={70 + k * 16} y={20} width={12} height={12} rx={2} fill={k < Math.floor(state.tokens) ? "color-mix(in srgb, var(--teal) 55%, transparent)" : "transparent"} stroke={VIZ_COLORS.line} />
        ))}
        <Label x={70 + params.capacity * 16 + 8} y={30} tone="ink" weight={600}>
          {state.tokens.toFixed(1)} tokens
        </Label>
        <line x1={40} y1={80} x2={width - 40} y2={80} stroke={VIZ_COLORS.line} />
        {Array.from({ length: Math.ceil(maxT) + 1 }, (_, s) => (
          <g key={s}>
            <line x1={x(s)} y1={74} x2={x(s)} y2={130} stroke={VIZ_COLORS.line} strokeDasharray="2 3" />
            <text x={x(s)} y={146} textAnchor="middle" fontSize={9} fill={VIZ_COLORS.muted}>
              {s}s
            </text>
          </g>
        ))}
        {times.map((t, i) => {
          const d = state.decisions[i];
          const w = state.windowDecisions[i];
          const pending = i > state.i;
          return (
            <g key={i} style={{ transition: "all 200ms" }} opacity={pending ? 0.3 : 1}>
              <circle cx={x(t)} cy={80} r={i === state.i ? 7 : 5} fill={d === "allow" ? VIZ_COLORS.teal : d === "deny" ? VIZ_COLORS.coral : VIZ_COLORS.line} />
              <circle cx={x(t)} cy={112} r={5} fill={w === "allow" ? VIZ_COLORS.teal : w === "deny" ? VIZ_COLORS.coral : VIZ_COLORS.line} />
            </g>
          );
        })}
        <Label x={20} y={84} size={9}>
          bucket
        </Label>
        <Label x={20} y={116} size={9}>
          window
        </Label>
        <Label x={width - 20} y={height - 8} anchor="end">
          capacity {params.capacity}, refill {params.refillPerSec}/s, window limit {params.refillPerSec}/s
        </Label>
      </Frame>
      <Legend items={[{ tone: "teal", label: "allowed" }, { tone: "coral", label: "denied" }]} />
    </div>
  );
}

export const tokenBucketViz: VizDefinition<TokenBucketParams, TokenBucketState> = {
  id: "token-bucket",
  title: "Token bucket vs fixed window",
  summary: "Burst and sustained rate as two separate numbers, and the boundary burst a fixed window lets through.",
  fields: [
    { key: "capacity", label: "Bucket capacity", kind: "number" },
    { key: "refillPerSec", label: "Refill per second", kind: "number" },
    { key: "requests", label: "Request times (s)", kind: "text", hint: "Comma-separated timestamps." },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({ capacity: asNumber(raw.capacity, DEFAULTS.capacity, 1, 10), refillPerSec: asNumber(raw.refillPerSec, DEFAULTS.refillPerSec, 0.5, 10), requests: asNumberList(raw.requests, DEFAULTS.requests).slice(0, 16).map((t) => Math.max(0, t)) }),
  steps: tokenBucketSteps,
  View: TokenBucketView,
  simulatorHref: "/system-design/simulator?sample=rate-limiter",
};
