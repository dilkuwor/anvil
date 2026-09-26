import { ArrowDefs, Box, Edge, Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asNumber, type VizDefinition, type VizStep } from "./types";

/**
 * DNS resolution as a chain of caches. The query walks browser → OS → recursive
 * resolver, and only on a cold resolver does it go on to root → TLD → authoritative.
 * The answer comes back with a TTL and is cached at every hop; a second lookup inside
 * the TTL costs nothing. Matches the "sd-dns" lesson: a cache you can write to but
 * cannot invalidate, and the TTL is the only lever.
 */

export type DnsHop = "browser" | "os" | "resolver" | "root" | "tld" | "auth";
export type DnsHopStatus = "idle" | "miss" | "asking" | "answered" | "cached";
export type DnsEdge = { from: DnsHop; to: DnsHop; text: string; kind: "ask" | "answer" };

export type DnsResolutionParams = { hostname: string; warm: boolean; ttl: number };

export type DnsResolutionState = {
  status: Record<DnsHop, DnsHopStatus>;
  edges: DnsEdge[];
  clientTrips: number;
  resolverTrips: number;
  lookup: 1 | 2;
  answer: string | null;
  ttlLeft: number | null;
};

const DEFAULTS: DnsResolutionParams = { hostname: "api.example.com", warm: false, ttl: 300 };

/** The address every example resolves to (documentation range, never a real host). */
export const DNS_ANSWER = "203.0.113.10";

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (["true", "yes", "1", "warm"].includes(text)) return true;
    if (["false", "no", "0", "cold"].includes(text)) return false;
  }
  if (typeof value === "number") return value !== 0;
  return fallback;
}

function asHostname(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const text = value.trim().toLowerCase().replace(/\.$/, "");
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(text) || text.length > 48) return fallback;
  return text;
}

/** "api.example.com" → { tld: "com", zone: "example.com" }. */
export function splitHostname(hostname: string): { tld: string; zone: string } {
  const labels = hostname.split(".");
  return { tld: labels[labels.length - 1], zone: labels.slice(-2).join(".") };
}

function frame(state: DnsResolutionState, kind: VizStep<DnsResolutionState>["kind"], title: string, explain: string, interview: string): VizStep<DnsResolutionState> {
  return { title, explain, interview, kind, state: { ...state, status: { ...state.status }, edges: state.edges.map((edge) => ({ ...edge })) } };
}

export function dnsResolutionSteps(params: DnsResolutionParams): VizStep<DnsResolutionState>[] {
  const { hostname, warm, ttl } = params;
  const { tld, zone } = splitHostname(hostname);
  const steps: VizStep<DnsResolutionState>[] = [];
  const state: DnsResolutionState = {
    status: { browser: "idle", os: "idle", resolver: "idle", root: "idle", tld: "idle", auth: "idle" },
    edges: [],
    clientTrips: 0,
    resolverTrips: 0,
    lookup: 1,
    answer: null,
    ttlLeft: null,
  };
  // How long ago a warm resolver fetched the record, and how much later the second lookup happens.
  const warmAge = Math.floor(ttl / 3);
  const later = Math.min(10, Math.max(1, Math.floor(ttl / 2)));
  const ask = `who has ${hostname}?`;

  steps.push(
    frame(
      state,
      "setup",
      `Find ${hostname}`,
      `The browser needs an IP address before it can open a connection. It walks a chain of caches, and only at the end asks the server you control.`,
      "Before a client can talk to my system it has to find it. DNS is a hierarchy of caches: browser, OS, recursive resolver, then root, TLD and authoritative. I only control the last one, and the TTL it sets.",
    ),
  );

  state.status.browser = "miss";
  steps.push(
    frame(
      state,
      "decision",
      "Browser cache: miss",
      "The browser checks its own small cache first. Nothing there for this name, so it asks the operating system.",
      "The first two hops are caches on the user's machine. On a hit they answer with no network at all, which is why a repeat visit feels instant. On a miss the cost only starts now.",
    ),
  );

  state.status.os = "miss";
  state.status.resolver = "asking";
  state.edges = [{ from: "os", to: "resolver", text: ask, kind: "ask" }];
  state.clientTrips = 1;
  steps.push(
    frame(
      state,
      "decision",
      "OS cache: miss, ask the resolver",
      "The OS cache is empty too. It sends the question to the recursive resolver, usually run by the ISP or a public one like 8.8.8.8. That is the client's one network round trip.",
      "The recursive resolver does the real work on the client's behalf. From the client's point of view a lookup is one round trip to the resolver, however many hops the resolver then makes upstream.",
    ),
  );

  if (warm) {
    state.status.resolver = "cached";
    state.answer = DNS_ANSWER;
    state.ttlLeft = ttl - warmAge;
    state.edges = [{ from: "resolver", to: "os", text: `${DNS_ANSWER}, ${state.ttlLeft} s left`, kind: "answer" }];
    steps.push(
      frame(
        state,
        "invariant",
        "Resolver cache: hit",
        `The resolver answered this name ${warmAge} s ago for someone else and still has it. It replies at once with the IP and the ${state.ttlLeft} s left on its copy of the TTL.`,
        "A warm resolver is shared by thousands of users, so most lookups never reach my servers. Good for load, bad for failover: the resolver keeps serving the old answer until its copy of the TTL runs out.",
      ),
    );
  } else {
    state.status.resolver = "miss";
    state.status.root = "asking";
    state.edges = [{ from: "resolver", to: "root", text: ask, kind: "ask" }];
    state.resolverTrips = 1;
    steps.push(
      frame(
        state,
        "decision",
        "Resolver cache: miss, ask a root server",
        `The resolver has no answer either. It starts at the top: a root server. The root does not know the IP, but it knows who runs .${tld}.`,
        "The root and TLD servers only give referrals. They never hold my record, so they are almost never why a lookup is slow; resolvers cache their answers for days.",
      ),
    );

    state.status.root = "answered";
    state.status.tld = "asking";
    state.edges = [{ from: "resolver", to: "tld", text: `ask .${tld}`, kind: "ask" }];
    state.resolverTrips = 2;
    steps.push(
      frame(
        state,
        "decision",
        `Root: referral to .${tld}`,
        `The root said "ask the .${tld} servers". The resolver asks a .${tld} TLD server, which knows which nameservers hold ${zone}.`,
        "Each referral is one more round trip for the resolver. On a fully cold path that is root, TLD and authoritative: three trips, on top of the client's own one.",
      ),
    );

    state.status.tld = "answered";
    state.status.auth = "asking";
    state.edges = [{ from: "resolver", to: "auth", text: ask, kind: "ask" }];
    state.resolverTrips = 3;
    steps.push(
      frame(
        state,
        "decision",
        `TLD: referral to ${zone}`,
        `The .${tld} server points at the authoritative nameservers for ${zone}. Those are the servers you control. The resolver asks them directly.`,
        "The authoritative server is the only part of this chain I own. Its answer, and the TTL on that answer, is the only thing I get to decide.",
      ),
    );

    state.status.auth = "answered";
    state.answer = DNS_ANSWER;
    state.ttlLeft = ttl;
    state.edges = [{ from: "auth", to: "resolver", text: `${DNS_ANSWER}, TTL ${ttl} s`, kind: "answer" }];
    steps.push(
      frame(
        state,
        "invariant",
        `Answer: ${DNS_ANSWER}, TTL ${ttl} s`,
        `The authoritative server returns an A record with the IP and a TTL of ${ttl} seconds. The TTL is a promise: anyone may cache this answer for that long.`,
        "The TTL is the core trade-off. Low, 30 to 60 seconds, means fast failover but more query volume and a hard dependency on my DNS provider. High, hours, is cheap and resilient but a failover takes hours to drain.",
      ),
    );
  }

  state.status.resolver = "cached";
  state.status.os = "cached";
  state.status.browser = "cached";
  state.edges = [
    { from: "resolver", to: "os", text: `${DNS_ANSWER}, ${state.ttlLeft} s`, kind: "answer" },
    { from: "os", to: "browser", text: `${DNS_ANSWER}, ${state.ttlLeft} s`, kind: "answer" },
  ];
  steps.push(
    frame(
      state,
      "invariant",
      "Cached at every hop on the way back",
      `The answer flows back. The resolver, the OS and the browser each keep a copy with the TTL. The client can now connect to ${DNS_ANSWER}.`,
      "Every cache on the path now holds my answer. I can write a new record any time, but I cannot reach into those caches to remove the old one. They expire on their own schedule.",
    ),
  );

  state.edges = [];
  steps.push(
    frame(
      state,
      "tradeoff",
      "You can write, you cannot invalidate",
      `Suppose the region behind ${DNS_ANSWER} fails now. You change the record, but every cache keeps the old IP until its TTL runs out, up to ${state.ttlLeft} s. Some clients ignore the TTL and keep it longer.`,
      `DNS failover takes about one TTL. With a ${ttl}-second TTL most traffic moves within ${ttl} seconds and stragglers take longer. If I need seconds, I need anycast or a proxy layer in front.`,
    ),
  );

  state.lookup = 2;
  state.clientTrips = 0;
  state.resolverTrips = 0;
  state.ttlLeft = Math.max(0, (state.ttlLeft ?? ttl) - later);
  steps.push(
    frame(
      state,
      "invariant",
      "Second lookup: browser cache hit, 0 round trips",
      `${later} s later the page asks for the same name. The browser cache still has it with ${state.ttlLeft} s left, so no network hop happens at all.`,
      "Repeat lookups inside the TTL cost nothing, which is why DNS is the cheapest global cache there is. The price is that a stale answer is served exactly as fast as a fresh one.",
    ),
  );

  const coldTrips = warm ? 1 : 4;
  steps.push(
    frame(
      state,
      "result",
      warm ? "Warm resolver: 1 round trip. Repeat: 0." : "Cold lookup: 4 round trips. Repeat: 0.",
      warm
        ? `The first lookup cost 1 round trip because the resolver already had the answer. Inside the TTL the browser answers for free. The TTL you set is the only lever you hold.`
        : `The first lookup cost 4 round trips: 1 for the client, 3 for the resolver. Inside the TTL the browser answers for free. The TTL you set is the only lever you hold.`,
      `Summary: DNS is a cache hierarchy I can write to but cannot invalidate. A cold lookup here was ${coldTrips} round trip${coldTrips === 1 ? "" : "s"}, a repeat was zero. I lower the TTL a day before a planned move, and I never rely on DNS alone for fast failover.`,
    ),
  );

  return steps;
}

const HOPS: { id: DnsHop; label: string; col: number; row: number }[] = [
  { id: "browser", label: "Browser cache", col: 0, row: 1 },
  { id: "os", label: "OS cache", col: 1, row: 1 },
  { id: "resolver", label: "Resolver", col: 2, row: 1 },
  { id: "root", label: "Root", col: 3, row: 0 },
  { id: "tld", label: "TLD", col: 3, row: 1 },
  { id: "auth", label: "Authoritative", col: 3, row: 2 },
];

const PAD = 16;
const BOX_W = 128;
const BOX_H = 52;
const COL_GAP = 44;
const ROW_GAP = 14;
const WIDTH = PAD * 2 + 4 * BOX_W + 3 * COL_GAP;
const HEIGHT = PAD * 2 + 3 * BOX_H + 2 * ROW_GAP + 28;

function position(hop: DnsHop): { x: number; y: number } {
  const spec = HOPS.find((item) => item.id === hop)!;
  return { x: PAD + spec.col * (BOX_W + COL_GAP), y: PAD + spec.row * (BOX_H + ROW_GAP) };
}

function boxTone(status: DnsHopStatus): "idle" | "active" | "hot" | "ok" {
  if (status === "miss") return "hot";
  if (status === "asking") return "active";
  if (status === "answered" || status === "cached") return "ok";
  return "idle";
}

function hopNote(hop: DnsHop, status: DnsHopStatus, state: DnsResolutionState, params: DnsResolutionParams): string {
  const { tld, zone } = splitHostname(params.hostname);
  const short = (text: string) => (text.length > 16 ? `${text.slice(0, 15)}…` : text);
  if (hop === "root") return status === "idle" ? "knows the TLDs" : `→ .${tld} servers`;
  if (hop === "tld") return status === "idle" ? `.${tld} zone` : `→ ${short(zone)} NS`;
  if (hop === "auth") return status === "idle" ? `${short(zone)} · yours` : `A ${DNS_ANSWER} · ${params.ttl} s`;
  if (status === "miss") return "miss";
  if (status === "asking") return "asking…";
  if (status === "cached" && state.answer) return `${state.answer} · ${state.ttlLeft ?? params.ttl} s`;
  return "empty";
}

const PAIRS: [DnsHop, DnsHop][] = [
  ["browser", "os"],
  ["os", "resolver"],
  ["resolver", "root"],
  ["resolver", "tld"],
  ["resolver", "auth"],
];

function anchors(from: DnsHop, to: DnsHop): [[number, number], [number, number]] {
  const a = position(from);
  const b = position(to);
  const leftToRight = a.x <= b.x;
  return [
    [leftToRight ? a.x + BOX_W : a.x, a.y + BOX_H / 2],
    [leftToRight ? b.x : b.x + BOX_W, b.y + BOX_H / 2],
  ];
}

export function DnsResolutionView({ state, params }: { state: DnsResolutionState; params: DnsResolutionParams }) {
  const active = new Map(state.edges.map((edge) => [`${edge.from}>${edge.to}`, edge] as const));
  return (
    <div className="space-y-2">
      <Frame width={WIDTH} height={HEIGHT} label={`DNS resolution of ${params.hostname}`}>
        <ArrowDefs />
        {PAIRS.map(([a, b]) => {
          const edge = active.get(`${a}>${b}`) ?? active.get(`${b}>${a}`);
          const [from, to] = edge ? anchors(edge.from, edge.to) : anchors(a, b);
          const mid: [number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
          return (
            <g key={`${a}>${b}`}>
              <Edge from={from} to={to} tone={edge ? (edge.kind === "ask" ? "active" : "ok") : "idle"} />
              {edge ? (
                <text x={mid[0]} y={mid[1] - 6} textAnchor="middle" fontSize={9.5} fontWeight={600} fill={edge.kind === "ask" ? VIZ_COLORS.accent : VIZ_COLORS.teal}>
                  {edge.text}
                </text>
              ) : null}
            </g>
          );
        })}
        {HOPS.map((hop) => {
          const pos = position(hop.id);
          const status = state.status[hop.id];
          return (
            <Box key={hop.id} x={pos.x} y={pos.y} width={BOX_W} height={BOX_H} title={hop.label} tone={boxTone(status)}>
              <text x={pos.x + 10} y={pos.y + 36} fontSize={10} fill={status === "miss" ? VIZ_COLORS.coral : status === "cached" ? VIZ_COLORS.teal : VIZ_COLORS.muted} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                {hopNote(hop.id, status, state, params)}
              </text>
            </Box>
          );
        })}
        <Label x={PAD} y={HEIGHT - 8} tone="ink" weight={600}>
          lookup {state.lookup} · round trips {state.clientTrips + state.resolverTrips} (client {state.clientTrips}, resolver {state.resolverTrips})
        </Label>
        <Label x={WIDTH - PAD} y={HEIGHT - 8} anchor="end">
          {state.answer ? `${params.hostname} → ${state.answer} · TTL ${params.ttl} s` : `TTL ${params.ttl} s · resolver ${params.warm ? "warm" : "cold"}`}
        </Label>
      </Frame>
      <Legend items={[{ tone: "accent", label: "query in flight" }, { tone: "coral", label: "cache miss" }, { tone: "teal", label: "answer / cached" }]} />
    </div>
  );
}

export const dnsResolutionViz: VizDefinition<DnsResolutionParams, DnsResolutionState> = {
  id: "dns-resolution",
  title: "DNS: a chain of caches with a TTL",
  summary: "One lookup walks browser, OS, resolver, root, TLD and authoritative. The answer is cached at every hop, and only the TTL brings it back.",
  fields: [
    { key: "hostname", label: "Hostname", kind: "text", hint: "e.g. api.example.com" },
    {
      key: "warm",
      label: "Resolver cache",
      kind: "select",
      options: [
        { value: "false", label: "Cold: nobody asked recently" },
        { value: "true", label: "Warm: another user asked recently" },
      ],
    },
    { key: "ttl", label: "TTL (seconds)", kind: "number", hint: "How long the answer may be cached." },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({
    hostname: asHostname(raw.hostname, DEFAULTS.hostname),
    warm: asBool(raw.warm, DEFAULTS.warm),
    ttl: Math.round(asNumber(raw.ttl, DEFAULTS.ttl, 1, 86400)),
  }),
  steps: dnsResolutionSteps,
  View: DnsResolutionView,
};
