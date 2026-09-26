import { ArrowDefs, Box, Edge, Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asChoice, asNumber, type VizDefinition, type VizStep } from "./types";

/**
 * Active-passive multi-region failover: writes to the primary replicate to a secondary,
 * the primary region dies, health checks fail, the traffic manager flips (TTL-bound),
 * the secondary is promoted, and the reader sees what was lost (async) or what every
 * write cost (sync). Ends with RPO and RTO in plain words. The reader steps; nothing moves.
 */

export type FailoverMode = "async" | "sync";
export type FailoverTrigger = "auto" | "manual";
export type RegionFailoverParams = { mode: FailoverMode; lagSeconds: number; failover: FailoverTrigger };

export type BoxTone = "idle" | "active" | "hot" | "ok";
export type EdgeTone = "idle" | "active" | "hot" | "ok";

export type RegionBox = { title: string; role: string; up: boolean; tone: BoxTone; appNote: string; dbNote: string };
export type RegionFailoverState = {
  users: { note: string; tone: BoxTone };
  manager: { target: "primary" | "secondary"; note: string; tone: BoxTone };
  primary: RegionBox;
  secondary: RegionBox;
  edges: { users: EdgeTone; toPrimary: EdgeTone; toSecondary: EdgeTone; replication: EdgeTone };
  lostSeconds: number;
  footer: string;
};

const DEFAULTS: RegionFailoverParams = { mode: "async", lagSeconds: 5, failover: "auto" };
const TTL_SECONDS = 60;
const DETECT_SECONDS = 30;

function frame(state: RegionFailoverState, kind: VizStep<RegionFailoverState>["kind"], title: string, explain: string, interview: string): VizStep<RegionFailoverState> {
  return {
    title,
    explain,
    interview,
    kind,
    state: { ...state, users: { ...state.users }, manager: { ...state.manager }, primary: { ...state.primary }, secondary: { ...state.secondary }, edges: { ...state.edges } },
  };
}

function seconds(n: number): string {
  return `${n} second${n === 1 ? "" : "s"}`;
}

export function regionFailoverSteps(params: RegionFailoverParams): VizStep<RegionFailoverState>[] {
  const steps: VizStep<RegionFailoverState>[] = [];
  const sync = params.mode === "sync";
  const auto = params.failover === "auto";
  const lag = params.lagSeconds;
  const state: RegionFailoverState = {
    users: { note: "sending requests", tone: "idle" },
    manager: { target: "primary", note: "→ Region A", tone: "idle" },
    primary: { title: "Region A", role: "primary", up: true, tone: "idle", appNote: "reads + writes", dbNote: "accepts writes" },
    secondary: { title: "Region B", role: "secondary", up: true, tone: "idle", appNote: "standby", dbNote: sync ? "replica · in step" : "replica" },
    edges: { users: "idle", toPrimary: "idle", toSecondary: "idle", replication: "idle" },
    lostSeconds: 0,
    footer: sync ? "Synchronous replication: primary waits for B before it says ok" : `Asynchronous replication: B is about ${seconds(lag)} behind`,
  };
  steps.push(
    frame(
      state,
      "setup",
      `Two regions, one takes writes (${sync ? "sync" : "async"} replication)`,
      "Users reach the traffic manager, which sends everyone to Region A. Region A's database replicates every write to Region B, which sits ready as a standby.",
      "Start by saying what the second region is for: 'this one is for surviving a region loss, not for latency'. Then name the topology out loud: active-passive, a single write region, a replica waiting in the other.",
    ),
  );

  state.users.tone = "active";
  state.manager.tone = "active";
  state.primary.tone = "active";
  state.edges = { users: "active", toPrimary: "active", toSecondary: "idle", replication: "active" };
  if (sync) {
    state.primary.dbNote = "write ok after B confirms";
    state.secondary.dbNote = "has every acked write";
    steps.push(
      frame(
        state,
        "invariant",
        "A write waits for Region B before it is acknowledged",
        "The primary sends each write across to Region B and only says 'saved' once B has it. Every write pays a cross-region round trip, about 60 to 200 ms.",
        "'Synchronous cross-region replication means an RPO of zero, paid for with a full round trip on every write.' Say the number: 60 to 200 milliseconds added to each write, every day, for a failure that is rare.",
      ),
    );
  } else {
    state.primary.dbNote = "write ok at once";
    state.secondary.dbNote = `${seconds(lag)} behind`;
    steps.push(
      frame(
        state,
        "tradeoff",
        "A write is acknowledged at once, then replicated",
        `The user hears 'saved' as soon as Region A has the write. Region B receives it about ${seconds(lag)} later, so it is always a little behind.`,
        `'Asynchronous replication keeps writes fast, and the standby is behind by the replication lag, here about ${seconds(lag)}. That lag is exactly the data we lose on an unplanned failover.' Say you alert on lag growing.`,
      ),
    );
  }

  state.primary = { ...state.primary, title: "Region A ✕", role: "down", up: false, tone: "hot", appNote: "unreachable", dbNote: "unreachable" };
  state.users = { note: "getting errors", tone: "hot" };
  state.manager = { target: "primary", note: "→ Region A (still)", tone: "idle" };
  state.edges = { users: "hot", toPrimary: "hot", toSecondary: "idle", replication: "idle" };
  state.lostSeconds = sync ? 0 : lag;
  state.secondary.dbNote = sync ? "has every acked write" : `missing last ${seconds(lag)}`;
  state.footer = "Region A is gone; the traffic manager has not noticed yet";
  steps.push(
    frame(
      state,
      "decision",
      "The primary region fails",
      "Power, network, or a bad deploy takes all of Region A out. Users are still being sent there and get errors. The traffic manager has not noticed yet.",
      "'Detection comes first: health checks fail from several vantage points before we call the region dead.' Say the hard part is the decision itself: failing over during a partial degradation can be worse than staying put.",
    ),
  );

  state.manager = {
    target: "secondary",
    note: auto ? `→ Region B · flipped after ${DETECT_SECONDS}s` : "→ Region B · flipped by on-call",
    tone: "active",
  };
  state.users = { note: `some cached → A for ${TTL_SECONDS}s`, tone: "hot" };
  state.edges = { users: "active", toPrimary: "hot", toSecondary: "active", replication: "idle" };
  state.footer = auto ? `Auto flip after ${DETECT_SECONDS}s of failed checks; DNS TTL ${TTL_SECONDS}s still applies` : `Manual flip once a person decides; DNS TTL ${TTL_SECONDS}s still applies`;
  steps.push(
    frame(
      state,
      "tradeoff",
      auto ? "Health checks fail; the traffic manager flips on its own" : "Health checks fail; on-call flips the traffic manager",
      auto
        ? `After about ${DETECT_SECONDS} seconds of failed health checks the traffic manager points at Region B by itself. Clients that cached the old DNS answer keep hitting the dead region until the ${TTL_SECONDS}-second TTL runs out.`
        : `Health checks fail and page the on-call engineer. A person decides, then flips the traffic manager. Clients that cached the old DNS answer keep hitting the dead region until the ${TTL_SECONDS}-second TTL runs out.`,
      `'DNS steering is TTL-bound: keep the TTL short, about ${TTL_SECONDS} seconds, and accept that some clients ignore it. Anycast or a global load balancer fails over faster.' Then say who makes the decision, a machine or a person, and why you chose that.`,
    ),
  );

  state.secondary = { ...state.secondary, title: "Region B", role: "new primary", tone: "ok", appNote: "reads + writes", dbNote: sync ? "promoted · nothing missing" : `promoted · last ${seconds(lag)} missing` };
  state.edges = { users: "active", toPrimary: "idle", toSecondary: "active", replication: "idle" };
  state.footer = "Region B takes writes; Region A is fenced out";
  steps.push(
    frame(
      state,
      "decision",
      "Promote the secondary",
      "Region B's database is promoted: it stops following and starts accepting writes. The app in Region B now serves reads and writes.",
      "'Promote means the replica stops following and starts taking writes. Fence the old primary so it cannot come back and take writes too.' Say split-brain out loud; the interviewer is listening for that word.",
    ),
  );

  if (sync) {
    steps.push(
      frame(
        state,
        "invariant",
        "Nothing is lost, but every write was slower",
        "Every acknowledged write was already in Region B, so the promoted database has all of them. The price was paid earlier: each write waited for the cross-region round trip.",
        "'RPO is zero because no write was acknowledged before Region B had it. The cost is write latency every day, to pay for a failure that happens rarely.' Say who needs that: money movement, not a feed.",
      ),
    );
  } else {
    state.secondary.tone = "hot";
    state.footer = `Lost: about ${seconds(lag)} of acknowledged writes`;
    steps.push(
      frame(
        state,
        "tradeoff",
        `The lag window is lost: about ${seconds(lag)} of writes`,
        `Writes acknowledged in the last ${seconds(lag)} before the failure never reached Region B. Users who saw 'saved' will find those changes missing.`,
        `'RPO equals the replication lag: about ${seconds(lag)} of acknowledged writes are gone.' Say who can accept that and who cannot, and that shrinking it means synchronous replication or a quorum, at a latency cost.`,
      ),
    );
    state.secondary.tone = "ok";
  }

  state.users = { note: "reconnected", tone: "ok" };
  state.manager = { target: "secondary", note: "→ Region B", tone: "ok" };
  state.edges = { users: "ok", toPrimary: "idle", toSecondary: "ok", replication: "idle" };
  state.footer = "Service is back; the clock from failure to here is the RTO";
  steps.push(
    frame(
      state,
      "decision",
      "Users reconnect to the new primary",
      "DNS caches expire and clients retry. Traffic now flows to Region B. Service is back.",
      "'RTO is the time from failure to this point: detection, decision, promotion, and DNS propagation added together.' Say which piece took longest; the TTL and the human decision are usually the slow parts.",
    ),
  );

  const rpo = sync ? "zero: no acknowledged write was lost" : `about ${seconds(lag)} of writes, the replication lag at the moment of failure`;
  const rto = auto ? `a few minutes: ${DETECT_SECONDS}s of failed checks, the promotion, and up to ${TTL_SECONDS}s of DNS TTL` : `ten minutes or more: a person had to be paged and decide, then the promotion and up to ${TTL_SECONDS}s of DNS TTL`;
  state.footer = `RPO ${sync ? "0" : `~${lag}s`} · RTO ${auto ? "minutes" : "tens of minutes"}`;
  steps.push(
    frame(
      state,
      "result",
      "RPO and RTO in plain words",
      `Data lost (RPO): ${rpo}. Time down (RTO): ${rto}.`,
      `Close with both numbers and the failback: 'RPO is ${sync ? "zero" : `about ${seconds(lag)}`}, RTO is ${auto ? "a few minutes" : "tens of minutes"}. When Region A returns it may hold writes Region B never saw; we reconcile or discard them on purpose. And an untested failover does not work, so we run game days.'`,
    ),
  );
  return steps;
}

const WIDTH = 480;
const HEIGHT = 262;
const USERS = { x: 175, y: 10, w: 130, h: 38 };
const MANAGER = { x: 150, y: 64, w: 180, h: 44 };
const REGION_Y = 132;
const REGION_W = 214;
const REGION_H = 100;
const REGION_X = { primary: 14, secondary: 252 };
const INNER_W = 92;
const INNER_H = 34;

function RegionPanel({ x, region, mode }: { x: number; region: RegionBox; mode: FailoverMode }) {
  const y = REGION_Y;
  const noteColor = region.tone === "hot" ? VIZ_COLORS.coral : region.tone === "ok" ? VIZ_COLORS.teal : VIZ_COLORS.muted;
  return (
    <Box x={x} y={y} width={REGION_W} height={REGION_H} title={`${region.title} · ${region.role}`} tone={region.tone}>
      <Box x={x + 10} y={y + 26} width={INNER_W} height={INNER_H} title="App" tone={region.up ? "idle" : "hot"}>
        <text x={x + 20} y={y + 26 + 29} fontSize={9} fill={noteColor}>
          {region.appNote}
        </text>
      </Box>
      <Box x={x + REGION_W - INNER_W - 10} y={y + 26} width={INNER_W} height={INNER_H} title="Database" tone={region.up ? "idle" : "hot"}>
        <text x={x + REGION_W - INNER_W} y={y + 26 + 29} fontSize={9} fill={noteColor}>
          {mode === "sync" ? "sync" : "async"}
        </text>
      </Box>
      <text x={x + 10} y={y + REGION_H - 10} fontSize={10} fontWeight={600} fill={noteColor}>
        {region.dbNote}
      </text>
    </Box>
  );
}

export function RegionFailoverView({ state, params }: { state: RegionFailoverState; params: RegionFailoverParams }) {
  const usersBottom: [number, number] = [USERS.x + USERS.w / 2, USERS.y + USERS.h];
  const managerTop: [number, number] = [MANAGER.x + MANAGER.w / 2, MANAGER.y];
  const managerBottomLeft: [number, number] = [MANAGER.x + 30, MANAGER.y + MANAGER.h];
  const managerBottomRight: [number, number] = [MANAGER.x + MANAGER.w - 30, MANAGER.y + MANAGER.h];
  const primaryAppTop: [number, number] = [REGION_X.primary + 10 + INNER_W / 2, REGION_Y + 26];
  const secondaryAppTop: [number, number] = [REGION_X.secondary + 10 + INNER_W / 2, REGION_Y + 26];
  const primaryDbRight: [number, number] = [REGION_X.primary + REGION_W - 10, REGION_Y + 26 + INNER_H / 2];
  const secondaryDbLeft: [number, number] = [REGION_X.secondary + REGION_W - INNER_W - 10, REGION_Y + 26 + INNER_H / 2];
  const managerColor = state.manager.tone === "hot" ? VIZ_COLORS.coral : state.manager.tone === "ok" ? VIZ_COLORS.teal : state.manager.tone === "active" ? VIZ_COLORS.accent : VIZ_COLORS.muted;
  const usersColor = state.users.tone === "hot" ? VIZ_COLORS.coral : state.users.tone === "ok" ? VIZ_COLORS.teal : VIZ_COLORS.muted;

  return (
    <div>
      <Frame width={WIDTH} height={HEIGHT} label="Multi-region failover">
        <ArrowDefs />
        <Edge from={usersBottom} to={managerTop} tone={state.edges.users} />
        <Edge from={managerBottomLeft} to={primaryAppTop} tone={state.edges.toPrimary} dashed={state.manager.target !== "primary"} />
        <Edge from={managerBottomRight} to={secondaryAppTop} tone={state.edges.toSecondary} dashed={state.manager.target !== "secondary"} />
        <Edge from={primaryDbRight} to={secondaryDbLeft} tone={state.edges.replication} dashed={params.mode === "async"} />
        <Box x={USERS.x} y={USERS.y} width={USERS.w} height={USERS.h} title="Users" tone={state.users.tone}>
          <text x={USERS.x + 10} y={USERS.y + 31} fontSize={9.5} fill={usersColor}>
            {state.users.note}
          </text>
        </Box>
        <Box x={MANAGER.x} y={MANAGER.y} width={MANAGER.w} height={MANAGER.h} title="Traffic manager (DNS)" tone={state.manager.tone}>
          <text x={MANAGER.x + 10} y={MANAGER.y + 34} fontSize={9.5} fontWeight={600} fill={managerColor}>
            {state.manager.note}
          </text>
        </Box>
        <RegionPanel x={REGION_X.primary} region={state.primary} mode={params.mode} />
        <RegionPanel x={REGION_X.secondary} region={state.secondary} mode={params.mode} />
        <Label x={14} y={HEIGHT - 10} tone="ink" weight={600}>
          {state.footer}
        </Label>
      </Frame>
      <Legend items={[{ tone: "accent", label: "traffic on this step" }, { tone: "coral", label: "failed / lost" }, { tone: "teal", label: "promoted / recovered" }]} />
    </div>
  );
}

export const regionFailoverViz: VizDefinition<RegionFailoverParams, RegionFailoverState> = {
  id: "region-failover",
  title: "Region failover: RPO and RTO",
  summary: "One write region, one standby. The primary dies; step through the flip and see what was lost and how long it took.",
  fields: [
    {
      key: "mode",
      label: "Cross-region replication",
      kind: "select",
      options: [
        { value: "async", label: "Asynchronous (fast writes, lag)" },
        { value: "sync", label: "Synchronous (zero loss, slow writes)" },
      ],
    },
    { key: "lagSeconds", label: "Replication lag (seconds)", kind: "number", hint: "Only matters for asynchronous replication." },
    {
      key: "failover",
      label: "Failover decision",
      kind: "select",
      options: [
        { value: "auto", label: "Automatic (health checks)" },
        { value: "manual", label: "Manual (on-call decides)" },
      ],
    },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({
    mode: asChoice(raw.mode, ["async", "sync"] as const, DEFAULTS.mode),
    lagSeconds: Math.round(asNumber(raw.lagSeconds, DEFAULTS.lagSeconds, 1, 600)),
    failover: asChoice(raw.failover, ["auto", "manual"] as const, DEFAULTS.failover),
  }),
  steps: regionFailoverSteps,
  View: RegionFailoverView,
};
