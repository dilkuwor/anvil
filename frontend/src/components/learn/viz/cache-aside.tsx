import { ArrowDefs, Box, Edge, Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asChoice, asNumber, asStringList, type VizDefinition, type VizStep } from "./types";

/**
 * Cache-aside with LRU eviction and a choice of write policy. Every frame names the
 * question the interviewer asks next: what is cached, how it becomes correct after a
 * write, what happens when the hottest key expires.
 */

export type CacheAsideParams = { ops: string[]; capacity: number; writePolicy: "invalidate" | "write-through" };

export type CacheAsideState = {
  cache: string[]; // most-recent last
  hits: number;
  misses: number;
  op: { kind: "read" | "write"; key: string } | null;
  path: "hit" | "miss" | "fill" | "write-db" | "invalidate" | "write-cache" | "evict" | null;
  evicted: string | null;
  dbVersion: Record<string, number>;
  cacheVersion: Record<string, number>;
};

const DEFAULTS: CacheAsideParams = { ops: ["R:user1", "R:user1", "R:user2", "R:user3", "W:user1", "R:user1", "R:user2"], capacity: 2, writePolicy: "invalidate" };

function frame(state: CacheAsideState, kind: VizStep<CacheAsideState>["kind"], title: string, explain: string, interview: string): VizStep<CacheAsideState> {
  return { title, explain, interview, kind, state: { ...state, cache: [...state.cache], dbVersion: { ...state.dbVersion }, cacheVersion: { ...state.cacheVersion }, op: state.op ? { ...state.op } : null } };
}

function parseOp(raw: string): { kind: "read" | "write"; key: string } {
  const [prefix, rest] = raw.includes(":") ? raw.split(":", 2) : ["R", raw];
  const kind = prefix.trim().toUpperCase().startsWith("W") ? "write" : "read";
  return { kind, key: (rest ?? raw).trim() || "key" };
}

export function cacheAsideSteps(params: CacheAsideParams): VizStep<CacheAsideState>[] {
  const steps: VizStep<CacheAsideState>[] = [];
  const state: CacheAsideState = { cache: [], hits: 0, misses: 0, op: null, path: null, evicted: null, dbVersion: {}, cacheVersion: {} };
  const touch = (key: string) => {
    state.cache = [...state.cache.filter((item) => item !== key), key];
  };

  steps.push(
    frame(
      state,
      "setup",
      "Cache-aside: the app owns the cache",
      `Capacity ${params.capacity}, LRU eviction, writes ${params.writePolicy === "invalidate" ? "invalidate" : "write through"}. The cache starts empty.`,
      "Open with the bet you are making: 'the same keys will be read again soon, so I keep a copy in memory and accept that it can be stale for a bounded time'. Then name the granularity you cache at, because 'we cache the user' is not an answer; 'we cache the rendered profile by user id' is.",
    ),
  );

  for (const raw of params.ops) {
    const op = parseOp(raw);
    state.op = op;
    state.evicted = null;
    if (op.kind === "read") {
      if (state.cache.includes(op.key)) {
        state.hits += 1;
        state.path = "hit";
        touch(op.key);
        const stale = (state.cacheVersion[op.key] ?? 0) !== (state.dbVersion[op.key] ?? 0);
        steps.push(
          frame(state, stale ? "tradeoff" : "invariant", `Read ${op.key}: hit${stale ? " (stale!)" : ""}`, `${op.key} is in the cache; serve it in about 1ms and never touch the database. ${op.key} becomes most-recently used.`, stale ? `This hit returned version ${state.cacheVersion[op.key]} but the database has version ${state.dbVersion[op.key]}. That is the cost of write-through-less caching without invalidation: correctness for latency. Say who can tolerate it and for how long (the TTL).` : `Say the running hit ratio: ${state.hits}/${state.hits + state.misses}. The interviewer wants to hear that the database is sized for the misses, not the reads, and what happens to it if this ratio drops to zero.`),
        );
      } else {
        state.misses += 1;
        state.path = "miss";
        steps.push(frame(state, "decision", `Read ${op.key}: miss`, `${op.key} is not cached. The application reads it from the database (tens of milliseconds) and then fills the cache itself.`, "Cache-aside means the application, not the cache, does the fill. Say the trade-off: 'a miss costs a cache lookup plus a database read, and two concurrent misses on the same key both hit the database', which sets up the stampede question."));
        state.dbVersion[op.key] = state.dbVersion[op.key] ?? 1;
        if (state.cache.length >= params.capacity && !state.cache.includes(op.key)) {
          const victim = state.cache[0];
          state.cache = state.cache.slice(1);
          delete state.cacheVersion[victim];
          state.evicted = victim;
          state.path = "evict";
          steps.push(frame(state, "decision", `Evict ${victim} (least recently used)`, `Cache is full (${params.capacity}). ${victim} was used least recently, so it is dropped to make room.`, "Name the policy and why: 'LRU, because access is temporally local; LFU if a few keys stay hot forever; TTL when correctness matters more than hit ratio'. Also say what LRU costs: a doubly linked list plus a hash map for O(1) updates."));
        }
        touch(op.key);
        state.cacheVersion[op.key] = state.dbVersion[op.key];
        state.path = "fill";
        steps.push(frame(state, "invariant", `Fill ${op.key}`, `Store ${op.key} (version ${state.dbVersion[op.key]}) in the cache with a TTL. Next read is a hit.`, "State the freshness invariant you are choosing: 'a cached value is at most TTL seconds older than the database, unless a write invalidates it sooner'. That sentence is what the interviewer is grading."));
      }
      continue;
    }
    // write
    state.dbVersion[op.key] = (state.dbVersion[op.key] ?? 0) + 1;
    state.path = "write-db";
    steps.push(frame(state, "decision", `Write ${op.key}: update the database`, `The application writes ${op.key} to the database first; it is now version ${state.dbVersion[op.key]}.`, "Order matters. Say it: 'I write the database first, because if the cache update succeeds and the database write fails, I have served a phantom value'."));
    if (state.cache.includes(op.key)) {
      if (params.writePolicy === "invalidate") {
        state.cache = state.cache.filter((item) => item !== op.key);
        delete state.cacheVersion[op.key];
        state.path = "invalidate";
        steps.push(frame(state, "tradeoff", `Invalidate ${op.key}`, `Delete ${op.key} from the cache. The next read misses and refills with the new version.`, "Invalidate, not update: 'deleting is idempotent and cheap; updating the cache on write races with a concurrent read that is filling the old value'. The cost is one extra miss per write, which is fine when reads dominate."));
      } else {
        state.cacheVersion[op.key] = state.dbVersion[op.key];
        touch(op.key);
        state.path = "write-cache";
        steps.push(frame(state, "tradeoff", `Write ${op.key} through to the cache`, `Update the cached copy to version ${state.dbVersion[op.key]} as part of the write.`, "Write-through keeps the next read hot at the price of write latency and a race: 'two writers can update the cache in the opposite order from the database'. I would use it for read-after-write on the same user, with versioned values to detect the race."));
      }
    } else {
      state.path = "write-db";
      steps.push(frame(state, "invariant", `${op.key} was not cached`, `Nothing to invalidate. The cache stays consistent by construction.`, "Say why you do not fill on write: 'writes that are never read again would pollute the cache; let the first read pay for the fill'."));
    }
  }

  state.op = null;
  state.path = null;
  const total = state.hits + state.misses;
  steps.push(
    frame(
      state,
      "result",
      `Hit ratio ${total ? Math.round((state.hits / total) * 100) : 0}%`,
      `${state.hits} hits, ${state.misses} misses over ${total} reads with capacity ${params.capacity}.`,
      "Finish with the three failure questions before they are asked: 'if the cache dies, the database takes 100% of reads, so it must survive that or I need a warm standby; if a hot key expires, thousands of misses stampede, so I use a lock or early refresh; and the TTL is my correctness budget'.",
    ),
  );
  return steps;
}

export function CacheAsideView({ state, params }: { state: CacheAsideState; params: CacheAsideParams }) {
  const width = 480;
  const height = 210;
  const app: [number, number] = [90, 105];
  const cache: [number, number] = [250, 60];
  const db: [number, number] = [250, 150];
  const readPath = state.path === "hit" || state.path === "miss" || state.path === "fill";
  const cacheTone = state.path === "hit" ? "ok" : state.path === "miss" ? "hot" : state.path === "fill" || state.path === "write-cache" || state.path === "invalidate" || state.path === "evict" ? "active" : "idle";
  const dbTone = state.path === "miss" || state.path === "write-db" ? "active" : "idle";
  return (
    <div>
      <Frame width={width} height={height} label="Cache-aside request flow">
        <ArrowDefs />
        <Edge from={[app[0] + 45, app[1] - 10]} to={[cache[0] - 10, cache[1] + 20]} tone={readPath || state.path === "invalidate" || state.path === "write-cache" ? (state.path === "miss" ? "hot" : state.path === "hit" ? "ok" : "active") : "idle"} />
        <Edge from={[app[0] + 45, app[1] + 10]} to={[db[0] - 10, db[1] + 20]} tone={state.path === "miss" || state.path === "write-db" ? "active" : "idle"} dashed={state.path !== "miss" && state.path !== "write-db"} />
        <Box x={app[0] - 45} y={app[1] - 30} width={90} height={60} title="App" tone={state.op ? "active" : "idle"}>
          <text x={app[0]} y={app[1] + 12} textAnchor="middle" fontSize={11} fill={VIZ_COLORS.muted} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
            {state.op ? `${state.op.kind === "read" ? "GET" : "SET"} ${state.op.key}` : "idle"}
          </text>
        </Box>
        <Box x={cache[0] - 10} y={cache[1] - 20} width={220} height={60} title={`Cache · LRU · cap ${params.capacity}`} tone={cacheTone}>
          {state.cache.length ? (
            state.cache.map((key, index) => (
              <g key={key}>
                <rect x={cache[0] + index * 64} y={cache[1] + 6} width={58} height={24} rx={6} fill={state.op?.key === key && state.path === "hit" ? "color-mix(in srgb, var(--teal) 35%, transparent)" : "color-mix(in srgb, var(--accent) 14%, transparent)"} stroke={VIZ_COLORS.line} />
                <text x={cache[0] + index * 64 + 29} y={cache[1] + 22} textAnchor="middle" fontSize={11} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                  {key}
                  {state.cacheVersion[key] !== undefined ? ` v${state.cacheVersion[key]}` : ""}
                </text>
              </g>
            ))
          ) : (
            <text x={cache[0]} y={cache[1] + 22} fontSize={11} fill={VIZ_COLORS.muted}>
              empty
            </text>
          )}
          {state.evicted ? (
            <text x={cache[0] + 200} y={cache[1] + 22} textAnchor="end" fontSize={10} fill={VIZ_COLORS.coral}>
              evicted {state.evicted}
            </text>
          ) : null}
        </Box>
        <Box x={db[0] - 10} y={db[1] - 20} width={220} height={60} title="Database" tone={dbTone}>
          <text x={db[0]} y={db[1] + 22} fontSize={11} fill={VIZ_COLORS.muted} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
            {Object.keys(state.dbVersion).length ? Object.entries(state.dbVersion).map(([key, version]) => `${key} v${version}`).join("  ") : "source of truth"}
          </text>
        </Box>
        <Label x={20} y={height - 12} tone="ink" weight={600}>
          hits {state.hits} · misses {state.misses}
        </Label>
        <Label x={width - 20} y={height - 12} anchor="end">
          {params.writePolicy === "invalidate" ? "writes invalidate" : "writes go through"}
        </Label>
      </Frame>
      <Legend items={[{ tone: "teal", label: "hit" }, { tone: "coral", label: "miss" }, { tone: "accent", label: "fill / write" }]} />
    </div>
  );
}

export const cacheAsideViz: VizDefinition<CacheAsideParams, CacheAsideState> = {
  id: "cache-aside",
  title: "Cache-aside with LRU eviction",
  summary: "Reads fill the cache, writes make it correct again. Each step is one of the follow-up questions you will get.",
  fields: [
    { key: "ops", label: "Operations", kind: "text", hint: "R:key reads, W:key writes. Comma-separated." },
    { key: "capacity", label: "Capacity", kind: "number" },
    {
      key: "writePolicy",
      label: "On write",
      kind: "select",
      options: [
        { value: "invalidate", label: "Invalidate the cached key" },
        { value: "write-through", label: "Write through to the cache" },
      ],
    },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({
    ops: asStringList(raw.ops, DEFAULTS.ops).slice(0, 16),
    capacity: asNumber(raw.capacity, DEFAULTS.capacity, 1, 6),
    writePolicy: asChoice(raw.writePolicy, ["invalidate", "write-through"] as const, DEFAULTS.writePolicy),
  }),
  steps: cacheAsideSteps,
  View: CacheAsideView,
  simulatorHref: "/system-design/simulator?sample=url-shortener",
};
