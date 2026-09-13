import { ArrowDefs, Box, Edge, Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asChoice, asNumber, type VizDefinition, type VizStep } from "./types";

/** Leader-follower replication: a write, replication lag, a stale read, then a failover. Sync vs async is the trade-off. */

export type ReplicationParams = { mode: "async" | "sync"; followers: number };
export type ReplicationState = { leader: number | null; followers: number[]; version: number; acked: boolean; activeFrom: "client" | "leader" | null; activeTo: number | "leader" | "client" | null; readResult: string | null; failed: boolean; promoted: number | null };

const DEFAULTS: ReplicationParams = { mode: "async", followers: 2 };

function frame(state: ReplicationState, kind: VizStep<ReplicationState>["kind"], title: string, explain: string, interview: string): VizStep<ReplicationState> {
  return { title, explain, interview, kind, state: { ...state, followers: [...state.followers] } };
}

export function replicationSteps(params: ReplicationParams): VizStep<ReplicationState>[] {
  const steps: VizStep<ReplicationState>[] = [];
  const sync = params.mode === "sync";
  const state: ReplicationState = { leader: 1, followers: Array(params.followers).fill(1), version: 1, acked: false, activeFrom: null, activeTo: null, readResult: null, failed: false, promoted: null };
  steps.push(frame(state, "setup", `One leader, ${params.followers} follower${params.followers === 1 ? "" : "s"}, ${sync ? "synchronous" : "asynchronous"}`, "All copies hold version 1. Writes go to the leader; reads can go anywhere.", "Frame it as what replication buys and costs: 'copies for read scaling and for surviving a machine loss, paid for with lag and a consistency question on every read'. Then say which mode you chose and why; that decision is the interview."));
  state.version = 2;
  state.leader = 2;
  state.activeFrom = "client";
  state.activeTo = "leader";
  steps.push(frame(state, "decision", "Client writes v2 to the leader", "The leader applies the write locally. Followers still hold v1.", "Only the leader accepts writes: 'single-leader keeps ordering simple; multi-leader buys write availability at the cost of conflict resolution'. Say that you are choosing single-leader unless the question is multi-region writes."));
  if (sync) {
    state.followers = state.followers.map(() => 2);
    state.activeFrom = "leader";
    state.activeTo = 0;
    steps.push(frame(state, "invariant", "Leader waits for follower acks", "The leader ships v2 and blocks until at least one follower confirms it is durable.", "Synchronous replication: 'the write is not acknowledged until a follower has it, so a leader crash cannot lose it'. The cost: 'write latency includes a network round trip, and a slow follower slows every write'. Most systems make one follower sync and the rest async."));
    state.acked = true;
    state.activeFrom = "leader";
    state.activeTo = "client";
    steps.push(frame(state, "invariant", "Ack to client: v2 is durable on two nodes", "Now the client hears success.", "RPO is zero here: 'no acknowledged write can be lost by a single failure'. Say RPO and RTO as numbers when you can; interviewers listen for the vocabulary."));
  } else {
    state.acked = true;
    state.activeFrom = "leader";
    state.activeTo = "client";
    steps.push(frame(state, "tradeoff", "Ack immediately; replicate in the background", "The client hears success as soon as the leader has the write. Followers are still on v1.", "Asynchronous replication: 'low write latency and the leader never waits on a slow follower'. The cost you must name: 'there is a window where an acknowledged write exists on one machine only'."));
    state.activeFrom = "client";
    state.activeTo = 0;
    state.readResult = "v1 (stale)";
    steps.push(frame(state, "tradeoff", "Client reads from a follower: gets v1", "The read hits a follower that has not received v2 yet. The user just wrote something and cannot see it.", "This is read-your-own-writes: 'route a user's reads to the leader for a short window after their write, or pin by session, or compare a version token'. Say which one you pick and what it costs. And say what you monitor: 'replication lag in seconds; when it grows I stop routing reads to that follower'."));
    state.readResult = null;
  }
  state.failed = true;
  state.leader = null;
  state.activeFrom = null;
  state.activeTo = null;
  steps.push(frame(state, "decision", "Leader dies", `The leader is gone. Followers hold: ${state.followers.map((v, i) => `F${i + 1}=v${v}`).join(", ")}.`, "Failover has three parts: 'detect (heartbeat timeout), elect (the most up-to-date follower), redirect (clients and the other followers to the new leader)'. Say each, and say that detection timeouts are a trade-off between false alarms and downtime."));
  const best = state.followers.indexOf(Math.max(...state.followers));
  state.promoted = best;
  state.leader = state.followers[best];
  const lost = state.followers[best] < state.version;
  steps.push(frame(state, lost ? "tradeoff" : "result", `Promote follower ${best + 1} (v${state.followers[best]})`, lost ? `The most up-to-date follower only has v${state.followers[best]}. The acknowledged v2 is gone.` : `Follower ${best + 1} has v2, so nothing acknowledged was lost.`, lost ? "This is the async trade-off made concrete: 'an acknowledged write was lost because it had not replicated when the leader died'. Say who can accept that (analytics, caches) and who cannot (payments), and that for the latter you use sync replication or a quorum." : "Because a follower had the write before the ack, promotion loses nothing. Then name the remaining risk: 'split brain: the old leader comes back and thinks it is still leader; fence it with an epoch number'."));
  if (lost) {
    steps.push(frame(state, "result", `New leader at v${state.leader}; one acknowledged write lost`, "The system is available again with a smaller history. The client that got 'ok' for v2 will find it missing.", "State the outcome as RPO: 'asynchronous replication has a non-zero recovery point objective equal to the replication lag at the moment of failure'. Then say how you would shrink it: 'one synchronous follower, or a quorum write, and alert on lag'."));
  }
  return steps;
}

export function ReplicationView({ state, params }: { state: ReplicationState; params: ReplicationParams }) {
  const width = 480;
  const height = 210;
  const client: [number, number] = [70, 105];
  const leader: [number, number] = [230, 60];
  const followerPos = (i: number): [number, number] => [230 + i * 0 + 150, 40 + i * (params.followers > 1 ? 110 / (params.followers - 1) : 0) + (params.followers === 1 ? 65 : 0)];
  const tone = (from: ReplicationState["activeFrom"], to: ReplicationState["activeTo"]) => (state.activeFrom === from && state.activeTo === to ? "active" : "idle");
  return (
    <div>
      <Frame width={width} height={height} label="Leader-follower replication">
        <ArrowDefs />
        <Edge from={[client[0] + 40, client[1] - 8]} to={[leader[0] - 42, leader[1] + 10]} tone={tone("client", "leader")} />
        <Edge from={[leader[0] - 42, leader[1] + 26]} to={[client[0] + 40, client[1] + 8]} tone={tone("leader", "client")} />
        {state.followers.map((_, i) => (
          <Edge key={`lf-${i}`} from={[leader[0] + 42, leader[1] + 18]} to={[followerPos(i)[0] - 42, followerPos(i)[1] + 18]} tone={state.activeFrom === "leader" && state.activeTo === i ? "active" : "idle"} dashed={params.mode === "async"} />
        ))}
        <Edge from={[client[0] + 40, client[1] + 20]} to={[followerPos(0)[0] - 42, followerPos(0)[1] + 30]} tone={state.activeFrom === "client" && state.activeTo === 0 ? "hot" : "idle"} dashed />
        <Box x={client[0] - 40} y={client[1] - 25} width={80} height={50} title="Client">
          <text x={client[0]} y={client[1] + 15} textAnchor="middle" fontSize={10} fill={state.readResult ? VIZ_COLORS.coral : VIZ_COLORS.muted}>
            {state.readResult ?? (state.acked ? "write ok" : "")}
          </text>
        </Box>
        <Box x={leader[0] - 42} y={leader[1] - 10} width={84} height={50} title={state.failed ? "Leader ✕" : "Leader"} tone={state.failed ? "hot" : state.activeTo === "leader" ? "active" : "idle"}>
          <text x={leader[0]} y={leader[1] + 30} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, monospace">
            {state.failed ? "down" : `v${state.leader}`}
          </text>
        </Box>
        {state.followers.map((v, i) => {
          const [x, y] = followerPos(i);
          return (
            <Box key={i} x={x - 42} y={y - 10} width={84} height={50} title={state.promoted === i ? "New leader" : `Follower ${i + 1}`} tone={state.promoted === i ? "ok" : v < state.version && state.acked ? "hot" : "idle"}>
              <text x={x} y={y + 30} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, monospace">
                v{v}
              </text>
            </Box>
          );
        })}
        <Label x={20} y={height - 10}>
          {params.mode === "sync" ? "solid = sync replication" : "dashed = async replication"}
        </Label>
      </Frame>
      <Legend items={[{ tone: "accent", label: "active message" }, { tone: "coral", label: "stale / failed" }, { tone: "teal", label: "promoted" }]} />
    </div>
  );
}

export const replicationViz: VizDefinition<ReplicationParams, ReplicationState> = {
  id: "replication",
  title: "Replication, lag, and failover",
  summary: "One write, one stale read, one dead leader. Switch to sync to see what changes and what it costs.",
  fields: [
    {
      key: "mode",
      label: "Replication",
      kind: "select",
      options: [
        { value: "async", label: "Asynchronous" },
        { value: "sync", label: "Synchronous (one follower)" },
      ],
    },
    { key: "followers", label: "Followers", kind: "number" },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({ mode: asChoice(raw.mode, ["async", "sync"] as const, DEFAULTS.mode), followers: asNumber(raw.followers, DEFAULTS.followers, 1, 3) }),
  steps: replicationSteps,
  View: ReplicationView,
  simulatorHref: "/system-design/simulator?sample=twitter-feed",
};
