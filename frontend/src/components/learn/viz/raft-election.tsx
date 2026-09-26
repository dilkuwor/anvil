import { ArrowDefs, Box, Edge, Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asChoice, asNumber, type VizDefinition, type VizStep } from "./types";

/**
 * Raft leader election on a ring of nodes: heartbeats, a leader failure, one follower's
 * timeout, votes, a majority, and the old leader coming back with a stale term.
 *
 *   :::viz raft-election {"nodes": 5, "first": 3, "failure": "partition"}
 */

export type RaftFailure = "crash" | "partition";
export type RaftParams = { nodes: number; first: number; failure: RaftFailure };

export type RaftRole = "leader" | "follower" | "candidate" | "down";
export type RaftNode = { id: number; role: RaftRole; term: number; votedFor: number | null; cutOff: boolean };
export type RaftMessage = { from: number; to: number; kind: "heartbeat" | "requestVote" | "vote" | "stale" | "lost" };

export type RaftState = {
  nodes: RaftNode[];
  messages: RaftMessage[];
  term: number;
  majority: number;
  votes: number;
  leader: number | null;
  candidate: number | null;
  phase: "steady" | "failed" | "timeout" | "request" | "elected" | "heartbeat" | "return" | "result";
};

const DEFAULTS: RaftParams = { nodes: 5, first: 3, failure: "crash" };
const OLD_LEADER = 1;

function frame(state: RaftState, kind: VizStep<RaftState>["kind"], title: string, explain: string, interview: string): VizStep<RaftState> {
  return { title, explain, interview, kind, state: { ...state, nodes: state.nodes.map((node) => ({ ...node })), messages: [...state.messages] } };
}

export function raftElectionSteps(params: RaftParams): VizStep<RaftState>[] {
  const n = params.nodes;
  const first = params.first === OLD_LEADER || params.first < 1 || params.first > n ? 2 : params.first;
  const partition = params.failure === "partition";
  const majority = Math.floor(n / 2) + 1;
  const steps: VizStep<RaftState>[] = [];
  const state: RaftState = {
    nodes: Array.from({ length: n }, (_, index) => ({ id: index + 1, role: index + 1 === OLD_LEADER ? "leader" : "follower", term: 1, votedFor: null, cutOff: false })),
    messages: [],
    term: 1,
    majority,
    votes: 0,
    leader: OLD_LEADER,
    candidate: null,
    phase: "steady",
  };
  const others = (id: number) => state.nodes.filter((node) => node.id !== id).map((node) => node.id);

  state.messages = others(OLD_LEADER).map((to) => ({ from: OLD_LEADER, to, kind: "heartbeat" as const }));
  steps.push(
    frame(
      state,
      "setup",
      `Term 1: node ${OLD_LEADER} leads, ${n} nodes, majority is ${majority}`,
      `Node ${OLD_LEADER} is the leader for term 1. It sends a heartbeat to every follower on a short timer. Each heartbeat resets that follower's election timer, so nobody stands for election while the leader is alive.`,
      `Name the three roles and the rule that keeps the picture still: 'followers stay followers as long as heartbeats keep arriving; the heartbeat is the leader's proof of life, and with ${n} nodes a majority is ${majority}'.`,
    ),
  );

  state.phase = "failed";
  const old = state.nodes[OLD_LEADER - 1];
  if (partition) {
    old.cutOff = true;
    state.messages = others(OLD_LEADER).map((to) => ({ from: OLD_LEADER, to, kind: "lost" as const }));
  } else {
    old.role = "down";
    state.messages = [];
  }
  state.leader = null;
  steps.push(
    frame(
      state,
      "invariant",
      partition ? `Node ${OLD_LEADER} is cut off from the others` : `Node ${OLD_LEADER} crashes`,
      partition
        ? `A network partition isolates node ${OLD_LEADER}. It still thinks it is the leader and keeps sending heartbeats, but none of them arrive. The other ${n - 1} nodes hear nothing, and their election timers keep counting down.`
        : `Node ${OLD_LEADER} stops. No heartbeats go out. The other ${n - 1} nodes hear nothing, and their election timers keep counting down.`,
      partition
        ? "Say what the cut-off leader can and cannot do: 'it may still accept writes, but it cannot commit any of them, because a commit needs a majority and it is alone; that is why a client waits for the commit, not the accept'."
        : "Say what the silence means to a follower: 'it cannot tell a crash from a slow network, so it waits out a randomised timeout; the timeout is the failover gap and I should be able to say how long it is'.",
    ),
  );

  state.phase = "timeout";
  state.term = 2;
  const cand = state.nodes[first - 1];
  cand.role = "candidate";
  cand.term = 2;
  cand.votedFor = first;
  state.candidate = first;
  state.votes = 1;
  state.messages = [];
  steps.push(
    frame(
      state,
      "decision",
      `Node ${first}'s timer fires first: candidate for term 2`,
      `Timeouts are randomised, so one node runs out first. Node ${first} moves to term 2, becomes a candidate, and casts its own vote for itself. That is 1 vote of the ${majority} it needs.`,
      "Explain why the timeouts are random: 'if every follower timed out at once they would all stand and split the vote; randomised timeouts make one node go first, so most elections finish in one round'.",
    ),
  );

  state.phase = "request";
  const voters = state.nodes.filter((node) => node.id !== first && node.role !== "down" && !node.cutOff).map((node) => node.id);
  state.messages = others(first).map((to) => ({ from: first, to, kind: "requestVote" as const }));
  steps.push(
    frame(
      state,
      "decision",
      `Node ${first} asks every node for a vote in term 2`,
      `The candidate sends a vote request carrying term 2 to all other nodes. ${partition ? `The request to node ${OLD_LEADER} is lost in the partition.` : `Node ${OLD_LEADER} is down and never answers.`} Each node that hears the request can grant at most one vote in this term.`,
      "State the voting rule: 'one vote per node per term, granted to the first candidate it hears from whose log is at least as complete as its own; a node that already voted in this term says no'.",
    ),
  );

  state.phase = "elected";
  for (const id of voters) {
    const node = state.nodes[id - 1];
    node.term = 2;
    node.votedFor = first;
  }
  state.votes = 1 + voters.length;
  state.messages = voters.map((from) => ({ from, to: first, kind: "vote" as const }));
  cand.role = "leader";
  state.leader = first;
  steps.push(
    frame(
      state,
      "invariant",
      `${state.votes} of ${n} votes, majority is ${majority}: node ${first} is leader for term 2`,
      `Nodes ${voters.join(", ")} grant their votes and move to term 2. With ${state.votes} votes, node ${first} has more than half of the cluster and becomes leader for term 2. It starts sending heartbeats at once.`,
      `Say why a majority is the whole point: 'two leaders in the same term would each need ${majority} of ${n} votes, and each node votes once per term, so that is impossible; the majority rule is what prevents split brain'.`,
    ),
  );

  state.phase = "heartbeat";
  state.messages = others(first).map((to) => ({ from: first, to, kind: to === OLD_LEADER ? ("lost" as const) : ("heartbeat" as const) }));
  state.candidate = null;
  steps.push(
    frame(
      state,
      "invariant",
      `Node ${first} sends heartbeats for term 2`,
      `The new leader's heartbeats reset every follower's timer, so nobody else stands. Writes now go to node ${first}, and each one is committed once ${majority} nodes have it.`,
      partition
        ? `Point at the minority: 'node ${OLD_LEADER} on its own can never reach ${majority} votes or ${majority} acks, so the cut-off side makes no progress and cannot diverge; that is the CP side of the trade'.`
        : "Quantify the gap you just watched: 'no leader existed from the crash until this heartbeat, roughly one election timeout plus one round trip; that is the window where singleton work does not run'.",
    ),
  );

  state.phase = "return";
  old.cutOff = false;
  old.role = partition ? "leader" : "follower";
  old.term = 1;
  state.messages = partition ? [{ from: OLD_LEADER, to: first, kind: "stale" }, { from: first, to: OLD_LEADER, kind: "heartbeat" }] : [{ from: first, to: OLD_LEADER, kind: "heartbeat" }];
  steps.push(
    frame(
      state,
      partition ? "tradeoff" : "invariant",
      `Node ${OLD_LEADER} returns still in term 1`,
      partition
        ? `The partition heals. Node ${OLD_LEADER} still calls itself leader of term 1 and sends a heartbeat. Node ${first} answers with term 2. For a moment two nodes believed they were leader, but only one of them could ever commit.`
        : `Node ${OLD_LEADER} restarts as a follower and remembers only term 1. The first heartbeat it receives carries term 2, which is higher than anything it knows.`,
      partition
        ? "Name the rule and the risk together: 'a higher term always wins, so the stale leader steps down as soon as it hears term 2; the risk is a client that trusted an uncommitted write on the old side, and that is what commit acknowledgements protect against'."
        : "Say the rule as a rule: 'any node that sees a higher term than its own immediately becomes a follower in that term; the term number is what makes the newest election win'.",
    ),
  );

  state.phase = "result";
  old.role = "follower";
  old.term = 2;
  old.votedFor = null;
  state.messages = others(first).map((to) => ({ from: first, to, kind: "heartbeat" as const }));
  steps.push(
    frame(
      state,
      "result",
      `Node ${OLD_LEADER} steps down; one leader in term 2`,
      `Node ${OLD_LEADER} becomes a follower in term 2 and follows node ${first}. The cluster is back to one leader with a majority behind it.`,
      `Close with the three rules in one breath: 'one vote per node per term, a majority of ${majority} wins, and a higher term always wins; that is what etcd and ZooKeeper give me, and why a minority partition cannot elect anyone'.`,
    ),
  );

  return steps;
}

const WIDTH = 480;
const HEIGHT = 300;
const BOX_W = 92;
const BOX_H = 46;
const RADIUS = 104;
const CENTRE: [number, number] = [WIDTH / 2, HEIGHT / 2 - 2];

function place(index: number, count: number): [number, number] {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
  return [CENTRE[0] + RADIUS * Math.cos(angle), CENTRE[1] + RADIUS * Math.sin(angle)];
}

function shorten(a: [number, number], b: [number, number], by: number): [[number, number], [number, number]] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  return [
    [a[0] + ux * by, a[1] + uy * by],
    [b[0] - ux * by, b[1] - uy * by],
  ];
}

const ROLE_LABEL: Record<RaftRole, string> = { leader: "leader", follower: "follower", candidate: "candidate", down: "down" };

export function RaftView({ state, params }: { state: RaftState; params: RaftParams }) {
  const count = state.nodes.length;
  const centres = state.nodes.map((_, index) => place(index, count));
  const leaderCount = state.nodes.filter((node) => node.role === "leader").length;

  return (
    <div className="space-y-2">
      <Frame width={WIDTH} height={HEIGHT} label={`Raft election with ${params.nodes} nodes`}>
        <ArrowDefs />
        {state.messages.map((message, index) => {
          const [from, to] = shorten(centres[message.from - 1], centres[message.to - 1], 52);
          const tone = message.kind === "heartbeat" ? "ok" : message.kind === "stale" || message.kind === "lost" ? "hot" : "active";
          const dashed = message.kind === "vote" || message.kind === "lost";
          return <Edge key={`${message.kind}-${message.from}-${message.to}-${index}`} from={from} to={to} tone={tone} dashed={dashed} />;
        })}
        {state.nodes.map((node, index) => {
          const [cx, cy] = centres[index];
          const x = cx - BOX_W / 2;
          const y = cy - BOX_H / 2;
          const tone = node.role === "leader" ? "ok" : node.role === "candidate" ? "active" : node.role === "down" || node.cutOff ? "hot" : "idle";
          return (
            <Box key={node.id} x={x} y={y} width={BOX_W} height={BOX_H} title={`Node ${node.id}`} tone={tone}>
              <text x={x + 10} y={y + 32} fontSize={10} fill={node.role === "down" || node.cutOff ? VIZ_COLORS.coral : VIZ_COLORS.muted}>
                {node.cutOff ? "cut off" : ROLE_LABEL[node.role]}
                {node.votedFor !== null && node.role !== "down" ? ` · voted ${node.votedFor}` : ""}
              </text>
              <text x={x + BOX_W - 8} y={y + 17} textAnchor="end" fontSize={11} fontWeight={700} fill={node.role === "leader" ? VIZ_COLORS.teal : VIZ_COLORS.ink} fontFamily="ui-monospace, monospace">
                t{node.term}
              </text>
            </Box>
          );
        })}
        <Label x={CENTRE[0]} y={CENTRE[1] - 4} anchor="middle" tone="ink" weight={600} size={12}>
          term {state.term}
        </Label>
        <Label x={CENTRE[0]} y={CENTRE[1] + 12} anchor="middle" tone={state.candidate !== null ? "accent" : "muted"}>
          {state.candidate !== null ? `votes ${state.votes} / ${state.majority} needed` : state.leader !== null ? `leader: node ${state.leader}` : "no leader"}
        </Label>
        <Label x={12} y={HEIGHT - 8} tone={leaderCount > 1 ? "coral" : "muted"}>
          {leaderCount > 1 ? "two nodes claim to lead, one has a stale term" : `majority = ${state.majority} of ${count}`}
        </Label>
      </Frame>
      <Legend items={[{ tone: "teal", label: "leader / heartbeat" }, { tone: "accent", label: "candidate / vote request (dashed: vote)" }, { tone: "coral", label: "down, cut off, or stale" }]} />
    </div>
  );
}

export const raftElectionViz: VizDefinition<RaftParams, RaftState> = {
  id: "raft-election",
  title: "Raft leader election",
  summary: "A leader fails, one follower's timer fires, votes are counted, and the old leader comes back with a stale term.",
  fields: [
    {
      key: "nodes",
      label: "Nodes",
      kind: "select",
      options: [
        { value: "3", label: "3 nodes (majority 2)" },
        { value: "5", label: "5 nodes (majority 3)" },
      ],
    },
    { key: "first", label: "Whose timer fires first", kind: "number", hint: "node number; node 1 is the old leader" },
    {
      key: "failure",
      label: "How the leader fails",
      kind: "select",
      options: [
        { value: "crash", label: "Crashes, then restarts" },
        { value: "partition", label: "Partitioned, then reconnects" },
      ],
    },
  ],
  defaults: DEFAULTS,
  parse: (raw) => {
    const nodes = asNumber(raw.nodes, DEFAULTS.nodes) <= 3 ? 3 : 5;
    const first = Math.round(asNumber(raw.first, DEFAULTS.first, 2, nodes));
    const legacy = raw.partitioned === true || raw.partitioned === "true" || raw.partitioned === "yes";
    const failure = asChoice(raw.failure, ["crash", "partition"] as const, legacy ? "partition" : DEFAULTS.failure);
    return { nodes, first, failure };
  },
  steps: raftElectionSteps,
  View: RaftView,
};
