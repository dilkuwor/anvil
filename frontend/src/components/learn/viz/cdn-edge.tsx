import { ArrowDefs, Box, Edge, Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asNumber, asStringList, type VizDefinition, type VizStep } from "./types";

/**
 * A CDN as a cache in front of the origin. Users in two regions ask for assets; each
 * region's edge node keeps its own copy for a TTL. The first request from a region pays
 * the trip to the origin, later ones are served from the edge, and a purge throws the
 * copies away. The reader steps; nothing moves on its own.
 *
 *   :::viz cdn-edge {"requests": ["EU:logo.png", "EU:logo.png", "US:logo.png", "EU:logo.png", "purge:logo.png", "EU:logo.png"], "ttl": 60}
 */

export type CdnEdgeParams = { requests: string[]; ttl: number; originMs: number; edgeMs: number };

export type CdnEntry = { asset: string; storedAt: number; expiresAt: number };

export type CdnRequest = { kind: "get"; region: string; asset: string } | { kind: "purge"; asset: string | null };

export type CdnEdgeState = {
  clock: number;
  regions: string[];
  edge: Record<string, CdnEntry[]>;
  request: CdnRequest | null;
  outcome: "hit" | "miss" | "expired" | "store" | "purge" | null;
  latencyMs: number | null;
  hits: number;
  misses: number;
  originFetches: number;
  purged: string[];
};

const DEFAULTS: CdnEdgeParams = {
  requests: ["EU:logo.png", "EU:logo.png", "US:logo.png", "EU:logo.png", "purge:logo.png", "EU:logo.png"],
  ttl: 60,
  originMs: 120,
  edgeMs: 15,
};

/** Seconds between two requests in the list; the clock is what makes the TTL matter. */
export const CDN_GAP_SECONDS = 10;
const MAX_REGIONS = 3;

function parseRequest(raw: string): CdnRequest | null {
  const [head, ...rest] = raw.split(":");
  const tail = rest.join(":").trim();
  const name = head.trim();
  if (!name) return null;
  if (name.toLowerCase() === "purge") return { kind: "purge", asset: tail || null };
  return { kind: "get", region: name.slice(0, 6), asset: (tail || "index.html").slice(0, 14) };
}

export function parseCdnRequests(list: string[]): CdnRequest[] {
  const requests: CdnRequest[] = [];
  const regions = new Set<string>();
  for (const raw of list) {
    const request = parseRequest(raw);
    if (!request) continue;
    if (request.kind === "get") {
      if (!regions.has(request.region) && regions.size >= MAX_REGIONS) continue;
      regions.add(request.region);
    }
    requests.push(request);
  }
  return requests;
}

function frame(state: CdnEdgeState, kind: VizStep<CdnEdgeState>["kind"], title: string, explain: string, interview: string): VizStep<CdnEdgeState> {
  const edge: Record<string, CdnEntry[]> = {};
  for (const region of Object.keys(state.edge)) edge[region] = state.edge[region].map((entry) => ({ ...entry }));
  return { title, explain, interview, kind, state: { ...state, regions: [...state.regions], edge, purged: [...state.purged], request: state.request ? { ...state.request } : null } };
}

export function cdnEdgeSteps(params: CdnEdgeParams): VizStep<CdnEdgeState>[] {
  const requests = parseCdnRequests(params.requests);
  const regions = [...new Set(requests.flatMap((request) => (request.kind === "get" ? [request.region] : [])))];
  const state: CdnEdgeState = {
    clock: 0,
    regions,
    edge: Object.fromEntries(regions.map((region) => [region, [] as CdnEntry[]])),
    request: null,
    outcome: null,
    latencyMs: null,
    hits: 0,
    misses: 0,
    originFetches: 0,
    purged: [],
  };
  const steps: VizStep<CdnEdgeState>[] = [];
  const seenRegions = new Set<string>();

  steps.push(
    frame(
      state,
      "setup",
      "Edge nodes in front of the origin",
      `Users in ${regions.length ? regions.join(" and ") : "each region"} talk to the nearest edge node. Every edge cache starts empty. A copy lives at the edge for ${params.ttl} s.`,
      "Open with both reasons a CDN exists: latency, because the edge is a few milliseconds away while the origin is a long round trip; and offload, because the origin should see only the misses. Say the number you will watch: the share of requests that never reach the origin.",
    ),
  );

  requests.forEach((request, index) => {
    state.clock = index * CDN_GAP_SECONDS;
    state.request = request;
    state.purged = [];
    state.latencyMs = null;

    if (request.kind === "purge") {
      const removedFrom: string[] = [];
      for (const region of state.regions) {
        const before = state.edge[region].length;
        state.edge[region] = request.asset ? state.edge[region].filter((entry) => entry.asset !== request.asset) : [];
        if (state.edge[region].length !== before) removedFrom.push(region);
      }
      state.purged = removedFrom;
      state.outcome = "purge";
      steps.push(
        frame(
          state,
          "decision",
          request.asset ? `Purge ${request.asset}` : "Purge everything",
          `${request.asset ?? "The content"} changed at the origin. The purge tells every edge node to drop its copy${removedFrom.length ? ` (${removedFrom.join(", ")} had one)` : ""}. The next request in each region will miss again.`,
          "Say that a purge is the expensive way to invalidate: it has to reach every edge node, which takes seconds to minutes, and each region then pays a fresh miss. Then give the cheaper way: put a content hash in the file name and never purge, because a new file is a new URL.",
        ),
      );
      return;
    }

    const cache = state.edge[request.region];
    const entry = cache.find((item) => item.asset === request.asset);
    const firstFromRegion = !seenRegions.has(request.region);
    seenRegions.add(request.region);

    if (entry && entry.expiresAt > state.clock) {
      state.hits += 1;
      state.outcome = "hit";
      state.latencyMs = params.edgeMs;
      steps.push(
        frame(
          state,
          "invariant",
          `${request.region} asks for ${request.asset}: hit`,
          `The ${request.region} edge still has ${request.asset} (${entry.expiresAt - state.clock} s left). It answers in about ${params.edgeMs} ms and the origin is not touched.`,
          `Say the running numbers: ${state.hits} of ${state.hits + state.misses} requests served at the edge, origin fetched ${state.originFetches} time${state.originFetches === 1 ? "" : "s"}. Then say what the hit buys: about ${params.edgeMs} ms instead of ${params.originMs} ms, and one less request the origin has to be sized for.`,
        ),
      );
      return;
    }

    state.misses += 1;
    state.originFetches += 1;
    state.latencyMs = params.originMs + params.edgeMs;
    if (entry) {
      state.edge[request.region] = cache.filter((item) => item !== entry);
      state.outcome = "expired";
      steps.push(
        frame(
          state,
          "tradeoff",
          `${request.region} asks for ${request.asset}: expired`,
          `The copy at the ${request.region} edge is older than the TTL of ${params.ttl} s, so the edge treats it as gone and fetches from the origin again. About ${params.originMs + params.edgeMs} ms.`,
          "Say that the TTL is the staleness you are willing to accept: a long TTL means more hits and slower change, a short one means fresher content and more origin traffic. Then name the middle path: stale-while-revalidate, which serves the old copy now and refreshes in the background.",
        ),
      );
    } else {
      state.outcome = "miss";
      const otherRegionHas = state.regions.some((region) => region !== request.region && state.edge[region].some((item) => item.asset === request.asset));
      if (otherRegionHas) {
        steps.push(
          frame(
            state,
            "tradeoff",
            `${request.region} asks for ${request.asset}: miss`,
            `Another region has ${request.asset}, but each edge node keeps its own cache. ${request.region} has never seen it, so it goes to the origin: about ${params.originMs + params.edgeMs} ms.`,
            "Say that every region pays its own first miss, so a popular file is fetched from the origin once per edge node. Then name the fix from the lesson: a shield tier between the edges and the origin, so a cold object is fetched from the origin once, not once per PoP.",
          ),
        );
      } else {
        steps.push(
          frame(
            state,
            "decision",
            `${request.region} asks for ${request.asset}: miss`,
            `The ${request.region} edge does not have ${request.asset}${firstFromRegion ? " yet" : ""}. It asks the origin, which is far away: about ${params.originMs} ms on top of the ${params.edgeMs} ms hop to the edge.`,
            "Say that this is pull: the first user in each region pays the miss and the edge fills itself. Then say when you would push instead: a predictable launch, like a game patch, where you do not want a million first-misses at once.",
          ),
        );
      }
    }

    state.edge[request.region] = [...state.edge[request.region], { asset: request.asset, storedAt: state.clock, expiresAt: state.clock + params.ttl }];
    state.outcome = "store";
    state.latencyMs = null;
    steps.push(
      frame(
        state,
        "invariant",
        `${request.region} edge stores ${request.asset}`,
        `The origin answered with Cache-Control, so the ${request.region} edge keeps the copy for ${params.ttl} s. The next request from ${request.region} will be a hit.`,
        "Say who decides the TTL: the origin, through Cache-Control headers. Mention s-maxage for a separate, longer TTL at the edge than in the browser, and immutable for fingerprinted assets that never need to change.",
      ),
    );
  });

  const total = state.hits + state.misses;
  const ratio = total ? Math.round((state.hits / total) * 100) : 0;
  state.request = null;
  state.outcome = null;
  state.latencyMs = null;
  state.purged = [];
  steps.push(
    frame(
      state,
      "result",
      `Edge hit ratio ${ratio}%, origin saw ${state.originFetches} of ${total}`,
      `${state.hits} hits and ${state.misses} misses over ${total} requests. The origin handled ${state.originFetches} fetch${state.originFetches === 1 ? "" : "es"}; the edge absorbed the rest.`,
      `Close with the offload ratio: the origin saw ${state.originFetches} of ${total} requests, so it is sized for ${total ? Math.round((state.originFetches / total) * 100) : 0}% of the traffic, not all of it. Then say what happens when the origin goes down: with stale-if-error the edge keeps serving old copies, which turns the CDN into an availability tool, not only a latency one.`,
    ),
  );
  return steps;
}

const WIDTH = 520;
const USER_X = 16;
const EDGE_X = 176;
const ORIGIN_X = 396;
const BOX_W = 108;
const EDGE_W = 176;
const BOX_H = 58;
const ROW_H = 72;
const TOP = 16;

export function CdnEdgeView({ state, params }: { state: CdnEdgeState; params: CdnEdgeParams }) {
  const regions = state.regions.length ? state.regions : ["EU", "US"];
  const height = TOP + Math.max(regions.length, 1) * ROW_H + 26;
  const originY = TOP + ((regions.length - 1) * ROW_H) / 2;
  const active = state.request?.kind === "get" ? state.request.region : null;
  const toOrigin = state.outcome === "miss" || state.outcome === "expired";
  const originTone = toOrigin ? "hot" : state.outcome === "purge" ? "active" : "idle";
  const legendItems = [
    { tone: "teal" as const, label: "served at the edge" },
    { tone: "coral" as const, label: "went to the origin" },
    { tone: "accent" as const, label: "stored / purged" },
  ];

  return (
    <div>
      <Frame width={WIDTH} height={height} label="Users, edge nodes, and the origin">
        <ArrowDefs />
        {regions.map((region, index) => {
          const y = TOP + index * ROW_H;
          const isActive = active === region;
          const userTone = isActive ? (state.outcome === "hit" ? "ok" : toOrigin ? "hot" : "active") : "idle";
          const edgeTone = isActive ? (state.outcome === "hit" ? "ok" : toOrigin ? "hot" : "active") : state.outcome === "purge" && state.purged.includes(region) ? "active" : "idle";
          const userEdgeTone = isActive ? (state.outcome === "hit" ? "ok" : toOrigin ? "hot" : "active") : "idle";
          const edgeOriginTone = isActive && toOrigin ? "hot" : state.outcome === "purge" && state.purged.includes(region) ? "active" : "idle";
          const entries = state.edge[region] ?? [];
          return (
            <g key={region}>
              <Edge from={[USER_X + BOX_W, y + BOX_H / 2]} to={[EDGE_X, y + BOX_H / 2]} tone={userEdgeTone} />
              <Edge from={[EDGE_X + EDGE_W, y + BOX_H / 2]} to={[ORIGIN_X, originY + BOX_H / 2]} tone={edgeOriginTone} dashed={edgeOriginTone === "idle"} />
              <Box x={USER_X} y={y} width={BOX_W} height={BOX_H} title={`${region} users`} tone={userTone}>
                <text x={USER_X + 10} y={y + 36} fontSize={10} fill={VIZ_COLORS.muted}>
                  {isActive && state.request?.kind === "get" ? `GET ${state.request.asset}` : "idle"}
                </text>
                <text x={USER_X + 10} y={y + 50} fontSize={10} fontWeight={600} fill={isActive && state.latencyMs !== null ? (state.outcome === "hit" ? VIZ_COLORS.teal : VIZ_COLORS.coral) : VIZ_COLORS.muted}>
                  {isActive && state.latencyMs !== null ? `${state.latencyMs} ms` : ""}
                </text>
              </Box>
              <Box x={EDGE_X} y={y} width={EDGE_W} height={BOX_H} title={`${region} edge`} tone={edgeTone}>
                {entries.length ? (
                  entries.slice(0, 2).map((entry, row) => {
                    const left = Math.max(0, entry.expiresAt - state.clock);
                    const highlighted = isActive && state.request?.kind === "get" && state.request.asset === entry.asset;
                    return (
                      <text key={entry.asset} x={EDGE_X + 10} y={y + 36 + row * 13} fontSize={10} fontWeight={highlighted ? 600 : 500} fill={highlighted ? (state.outcome === "hit" ? VIZ_COLORS.teal : VIZ_COLORS.accent) : VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                        {entry.asset} · {left} s left
                      </text>
                    );
                  })
                ) : (
                  <text x={EDGE_X + 10} y={y + 36} fontSize={10} fill={state.outcome === "purge" && state.purged.includes(region) ? VIZ_COLORS.accent : VIZ_COLORS.muted}>
                    {state.outcome === "purge" && state.purged.includes(region) ? "purged" : "empty"}
                  </text>
                )}
              </Box>
            </g>
          );
        })}
        <Box x={ORIGIN_X} y={originY} width={BOX_W} height={BOX_H} title="Origin" tone={originTone}>
          <text x={ORIGIN_X + 10} y={originY + 36} fontSize={10} fill={VIZ_COLORS.muted}>
            {toOrigin ? `+${params.originMs} ms` : "far away"}
          </text>
          <text x={ORIGIN_X + 10} y={originY + 50} fontSize={10} fill={VIZ_COLORS.muted}>
            fetched {state.originFetches}×
          </text>
        </Box>
        <Label x={USER_X} y={height - 8} tone="ink" weight={600}>
          hits {state.hits} · misses {state.misses}
        </Label>
        <Label x={WIDTH - 16} y={height - 8} anchor="end">
          t = {state.clock} s · TTL {params.ttl} s · edge {params.edgeMs} ms vs origin {params.originMs} ms
        </Label>
      </Frame>
      <Legend items={legendItems} />
    </div>
  );
}

export const cdnEdgeViz: VizDefinition<CdnEdgeParams, CdnEdgeState> = {
  id: "cdn-edge",
  title: "CDN: a cache at the edge",
  summary: "The first request from a region goes all the way to the origin; later ones stop at the edge. A purge starts the region over.",
  fields: [
    { key: "requests", label: "Requests", kind: "text", hint: "region:asset per request, e.g. EU:logo.png. purge:asset drops it from every edge. Comma-separated." },
    { key: "ttl", label: "Edge TTL (seconds)", kind: "number", hint: `Requests arrive ${CDN_GAP_SECONDS} s apart.` },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({
    requests: asStringList(raw.requests, DEFAULTS.requests).slice(0, 12),
    ttl: asNumber(raw.ttl, DEFAULTS.ttl, 1, 3600),
    originMs: asNumber(raw.originMs, DEFAULTS.originMs, 1, 5000),
    edgeMs: asNumber(raw.edgeMs, DEFAULTS.edgeMs, 1, 5000),
  }),
  steps: cdnEdgeSteps,
  View: CdnEdgeView,
};
