import { ArrowDefs, Box, Edge, Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asChoice, type VizDefinition, type VizStep } from "./types";

/**
 * Two-phase commit versus a saga, on the same order: create the order, charge the card,
 * reserve stock. 2PC shows prepare, votes with locks held, a dead coordinator, and the
 * decision. The saga shows local commits in order and compensations in reverse.
 * Nothing moves on its own; the reader steps.
 */

export type TxMode = "2pc" | "saga";
export type TxFail = "none" | "payment" | "inventory";
export type TwoPhaseVsSagaParams = { mode: TxMode; fail: TxFail };

export type ParticipantId = "order" | "payment" | "inventory";
export type BoxTone = "idle" | "active" | "hot" | "ok";
export type EdgeTone = "idle" | "active" | "hot" | "ok";

export type TxParticipant = { id: ParticipantId; status: string; note: string; tone: BoxTone; edge: EdgeTone };
export type TwoPhaseVsSagaState = {
  coordinatorTitle: string;
  coordinatorStatus: string;
  coordinatorTone: BoxTone;
  message: string;
  participants: TxParticipant[];
  footer: string;
  locksHeld: number;
  compensations: number;
};

const DEFAULTS: TwoPhaseVsSagaParams = { mode: "2pc", fail: "none" };
const IDS: ParticipantId[] = ["order", "payment", "inventory"];
const NAME: Record<ParticipantId, string> = { order: "Order service", payment: "Payment service", inventory: "Inventory service" };
const COMPENSATION: Record<ParticipantId, string> = { order: "C1: cancel order", payment: "C2: refund card", inventory: "C3: release stock" };
const LOCAL_TX: Record<ParticipantId, string> = { order: "T1: create order", payment: "T2: charge card", inventory: "T3: reserve stock" };

function snapshot(state: TwoPhaseVsSagaState): TwoPhaseVsSagaState {
  return { ...state, participants: state.participants.map((p) => ({ ...p })) };
}

function frame(state: TwoPhaseVsSagaState, kind: VizStep<TwoPhaseVsSagaState>["kind"], title: string, explain: string, interview: string): VizStep<TwoPhaseVsSagaState> {
  return { title, explain, interview, kind, state: snapshot(state) };
}

function setAll(state: TwoPhaseVsSagaState, patch: Partial<Omit<TxParticipant, "id">>) {
  state.participants = state.participants.map((p) => ({ ...p, ...patch }));
}

function setOne(state: TwoPhaseVsSagaState, id: ParticipantId, patch: Partial<Omit<TxParticipant, "id">>) {
  state.participants = state.participants.map((p) => (p.id === id ? { ...p, ...patch } : p));
}

function twoPhaseSteps(fail: TxFail): VizStep<TwoPhaseVsSagaState>[] {
  const steps: VizStep<TwoPhaseVsSagaState>[] = [];
  const state: TwoPhaseVsSagaState = {
    coordinatorTitle: "Coordinator",
    coordinatorStatus: "idle",
    coordinatorTone: "idle",
    message: "",
    participants: IDS.map((id) => ({ id, status: "waiting", note: "", tone: "idle", edge: "idle" })),
    footer: "Two-phase commit: nothing is visible until everyone commits",
    locksHeld: 0,
    compensations: 0,
  };
  steps.push(
    frame(
      state,
      "setup",
      "One order, three databases, no shared transaction",
      "Placing an order must create the order, charge the card, and reserve stock. Each lives in its own service and database, so no single transaction can wrap all three.",
      "Start with the shape of the problem: 'this operation spans three services, so a local database transaction cannot make it all-or-nothing'. Then name the three options in order: avoid it by moving the boundary, use a saga, or use two-phase commit.",
    ),
  );

  state.coordinatorStatus = "phase 1";
  state.coordinatorTone = "active";
  state.message = "PREPARE →";
  setAll(state, { status: "preparing", note: "writing to disk, taking locks", tone: "active", edge: "active" });
  state.locksHeld = 3;
  state.footer = "3 participants taking locks";
  steps.push(
    frame(
      state,
      "decision",
      "Phase 1: coordinator sends PREPARE",
      "The coordinator asks every participant to prepare. Each one writes the change durably and takes its locks, but does not commit yet.",
      "'Prepare means: write it to disk, hold the locks, and promise you can commit.' Say that the promise is the whole point: a participant that voted yes is no longer allowed to change its mind.",
    ),
  );

  state.message = "← votes";
  if (fail === "none") {
    setAll(state, { status: "voted YES", note: "locks held", tone: "ok", edge: "ok" });
    state.footer = "3 of 3 voted yes · 3 holding locks";
    steps.push(
      frame(
        state,
        "invariant",
        "Every participant votes YES, locks held",
        "All three answered yes. Each is now holding row locks and waiting for the coordinator to decide.",
        "Name the invariant: 'between the vote and the decision, a participant cannot commit or abort on its own'. That waiting window is where every 2PC problem lives.",
      ),
    );
  } else {
    setAll(state, { status: "voted YES", note: "locks held", tone: "ok", edge: "ok" });
    setOne(state, fail, { status: "voted NO", note: fail === "payment" ? "card declined" : "out of stock", tone: "hot", edge: "hot" });
    state.footer = `1 no vote from ${fail} · 3 holding locks`;
    steps.push(
      frame(
        state,
        "decision",
        `${NAME[fail]} votes NO`,
        `The ${fail} service cannot do its part and votes no. The other two already voted yes and are holding locks while they wait.`,
        "'One no vote means the whole operation aborts.' Say that the participants that voted yes still hold their locks until they hear the abort, so a slow coordinator keeps rows locked for everyone.",
      ),
    );
  }

  state.coordinatorTitle = "Coordinator ✕";
  state.coordinatorStatus = "down";
  state.coordinatorTone = "hot";
  state.message = "no decision";
  setAll(state, { status: "BLOCKED", note: "locks held, cannot decide", tone: "hot", edge: "idle" });
  state.footer = "3 of 3 participants blocked, locks held";
  steps.push(
    frame(
      state,
      "tradeoff",
      "Coordinator dies between the phases",
      "The coordinator crashes after collecting votes and before sending the decision. Every participant is stuck holding locks. None of them may decide alone.",
      "This is why 2PC is called blocking: 'if the coordinator fails between phases, participants hold their locks with no authority to decide, until it recovers or a human steps in'. Say that every other transaction touching those rows now waits too.",
    ),
  );

  state.coordinatorTitle = "Coordinator";
  state.coordinatorStatus = "recovered from log";
  state.coordinatorTone = "active";
  if (fail === "none") {
    state.message = "COMMIT →";
    setAll(state, { status: "committed", note: "locks released", tone: "ok", edge: "ok" });
    state.locksHeld = 0;
    state.footer = "3 of 3 committed · 0 locks held";
    steps.push(
      frame(
        state,
        "decision",
        "Phase 2: coordinator recovers, broadcasts COMMIT",
        "The coordinator comes back, reads its log, sees three yes votes, and tells everyone to commit. Locks are released.",
        "'The decision is logged before it is sent, so a recovered coordinator repeats the same decision.' Then say the availability cost: the operation only succeeds when every participant and the coordinator are all up at once.",
      ),
    );
    state.coordinatorStatus = "done";
    state.coordinatorTone = "ok";
    state.message = "";
    steps.push(
      frame(
        state,
        "result",
        "2PC: atomic, but blocking",
        "All three changes became visible together. The price was locks held across network round trips, and a full stall while the coordinator was down.",
        "Close with the trade: '2PC buys atomicity with availability. Locks are held across network hops, a dead coordinator blocks everyone, and third-party APIs cannot join. I use it only inside one trusted boundary; across services I use a saga.'",
      ),
    );
  } else {
    state.message = "ABORT →";
    setAll(state, { status: "aborted", note: "rolled back, locks released", tone: "idle", edge: "hot" });
    setOne(state, fail, { status: "aborted", note: "nothing to undo", tone: "idle", edge: "hot" });
    state.locksHeld = 0;
    state.footer = "3 of 3 aborted · 0 locks held";
    steps.push(
      frame(
        state,
        "decision",
        "Phase 2: coordinator recovers, broadcasts ABORT",
        "The coordinator comes back, reads its log, sees the no vote, and tells everyone to abort. The prepared changes are rolled back and locks are released.",
        "'Abort is the safe default: nothing became visible, and the locks were the only cost.' Then say the availability cost: the operation only succeeds when every participant and the coordinator are all up at once.",
      ),
    );
    state.coordinatorStatus = "done";
    state.coordinatorTone = "idle";
    state.message = "";
    steps.push(
      frame(
        state,
        "result",
        "2PC: atomic, but blocking",
        "Nothing was applied anywhere, which is the all-or-nothing promise. The price was locks held across network round trips, and a full stall while the coordinator was down.",
        "Close with the trade: '2PC buys atomicity with availability. Locks are held across network hops, a dead coordinator blocks everyone, and third-party APIs cannot join. I use it only inside one trusted boundary; across services I use a saga.'",
      ),
    );
  }
  return steps;
}

function sagaSteps(fail: TxFail): VizStep<TwoPhaseVsSagaState>[] {
  const steps: VizStep<TwoPhaseVsSagaState>[] = [];
  const state: TwoPhaseVsSagaState = {
    coordinatorTitle: "Orchestrator",
    coordinatorStatus: "saga state: step 0",
    coordinatorTone: "idle",
    message: "",
    participants: IDS.map((id) => ({ id, status: "waiting", note: COMPENSATION[id], tone: "idle", edge: "idle" })),
    footer: "Saga: each step commits on its own, no global lock",
    locksHeld: 0,
    compensations: 0,
  };
  steps.push(
    frame(
      state,
      "setup",
      "Same order, run as a saga",
      "The orchestrator runs three local transactions in order: T1 create the order, T2 charge the card, T3 reserve stock. Each has a compensating action that undoes it.",
      "'A saga is a sequence of local transactions, each with a compensation. There is no global lock; the price is a visible in-between state.' Then say you would orchestrate it, because a coordinator that holds saga state is debuggable.",
    ),
  );

  state.coordinatorStatus = "saga state: step 1 done";
  state.coordinatorTone = "active";
  state.message = LOCAL_TX.order;
  setOne(state, "order", { status: "committed · PENDING", tone: "ok", edge: "ok" });
  state.footer = "order: PENDING · 0 locks held";
  steps.push(
    frame(
      state,
      "decision",
      "T1: order created as PENDING",
      "The order service commits a local transaction and the orchestrator writes down that step 1 is done. No locks are held anywhere.",
      "'Each step commits and releases right away; nothing waits on anyone else.' Say the saga state is stored durably after every step, so a crashed orchestrator resumes instead of forgetting.",
    ),
  );

  setOne(state, "order", { edge: "idle" });
  state.message = LOCAL_TX.payment;
  if (fail === "payment") {
    setOne(state, "payment", { status: "FAILED · card declined", tone: "hot", edge: "hot" });
    state.coordinatorStatus = "saga state: step 2 failed";
    state.footer = "order: PENDING · compensating";
    steps.push(
      frame(
        state,
        "decision",
        "T2: payment fails",
        "The card is declined. The order is already committed, so the saga cannot just stop; it has to undo step 1.",
        "'On failure at step k, run the compensations for steps k-1 down to 1, in reverse.' Say that a compensation is a new business action, not a rollback: the customer can see it.",
      ),
    );
  } else {
    state.coordinatorStatus = "saga state: step 2 done";
    setOne(state, "payment", { status: "committed · charged", tone: "ok", edge: "ok" });
    steps.push(
      frame(
        state,
        "decision",
        "T2: card charged",
        "The payment service commits its own local transaction. The order is still PENDING, and the user can see that.",
        "Point at the visible intermediate state: 'the order is pending while the saga runs, and the product must show that honestly'. Say the charge is an authorisation hold captured at the end, so a later failure costs nothing.",
      ),
    );
    setOne(state, "payment", { edge: "idle" });
    state.message = LOCAL_TX.inventory;
    if (fail === "inventory") {
      setOne(state, "inventory", { status: "FAILED · out of stock", tone: "hot", edge: "hot" });
      state.coordinatorStatus = "saga state: step 3 failed";
      state.footer = "order: PENDING · compensating";
      steps.push(
        frame(
          state,
          "decision",
          "T3: inventory fails",
          "There is no stock left. Two steps are already committed, so two compensations must run, newest first.",
          "'On failure at step k, run the compensations for steps k-1 down to 1, in reverse.' Say that a compensation is a new business action, not a rollback: a refund is visible to the customer.",
        ),
      );
    } else {
      state.coordinatorStatus = "saga state: step 3 done";
      setOne(state, "inventory", { status: "committed · reserved", tone: "ok", edge: "ok" });
      steps.push(
        frame(
          state,
          "decision",
          "T3: stock reserved",
          "Inventory commits a reservation with a short expiry rather than a final sale. If the saga is abandoned, the hold expires on its own.",
          "'Reserve, do not commit: a hold with an expiry gives the saga isolation with a bounded blast radius.' Say the ordering rule too: the least reversible step goes last.",
        ),
      );
    }
  }

  if (fail !== "none") {
    if (fail === "inventory") {
      setOne(state, "inventory", { edge: "idle" });
      state.message = COMPENSATION.payment;
      state.compensations = 1;
      setOne(state, "payment", { status: "compensated · refunded", tone: "active", edge: "active" });
      steps.push(
        frame(
          state,
          "tradeoff",
          "C2: refund the payment",
          "The orchestrator asks the payment service to refund. That is a new transaction with its own effects; the customer may see a refund line.",
          "'Compensations must be idempotent because retries are guaranteed; a refund that runs twice is a real bug.' Say what happens when a compensation itself fails: retry, then an exception queue and a human.",
        ),
      );
      setOne(state, "payment", { edge: "idle" });
    }
    state.message = COMPENSATION.order;
    state.compensations += 1;
    setOne(state, "order", { status: "compensated · CANCELLED", tone: "active", edge: "active" });
    state.footer = "order: CANCELLED · 0 locks held";
    steps.push(
      frame(
        state,
        "tradeoff",
        "C1: cancel the order",
        "The order is marked cancelled. Nothing is left half-done, and no locks were ever held across services.",
        "'The end state is consistent, reached eventually, with every compensation keyed by saga id and step so retries are safe.' Then say the ordering rule: put the least reversible step last so the common failures cost nothing.",
      ),
    );
    state.coordinatorStatus = "saga state: compensated";
    state.coordinatorTone = "idle";
    state.message = "";
    setOne(state, "order", { edge: "idle", tone: "idle" });
    setOne(state, "payment", { tone: "idle" });
    steps.push(
      frame(
        state,
        "result",
        "Saga: available, eventually consistent",
        `The order ended CANCELLED after ${state.compensations} compensation${state.compensations === 1 ? "" : "s"} ran in reverse. No service ever waited on another; the cost was a visible pending state and the compensation logic.`,
        "Close with the trade: 'a saga stays available and holds no global lock, but it is only eventually consistent. Users see a pending state, and every step and every compensation must be idempotent because retries will happen.'",
      ),
    );
    return steps;
  }

  setOne(state, "inventory", { edge: "idle" });
  setOne(state, "order", { status: "committed · CONFIRMED" });
  state.coordinatorStatus = "saga state: complete";
  state.coordinatorTone = "ok";
  state.message = "";
  state.footer = "order: CONFIRMED · 0 locks held";
  steps.push(
    frame(
      state,
      "result",
      "Saga: available, eventually consistent",
      "The order moved to CONFIRMED. Every step committed on its own, so no service ever waited on another, and users saw PENDING in between.",
      "Close with the trade: 'a saga stays available and holds no global lock, but it is only eventually consistent. Users see a pending state, and every step and every compensation must be idempotent because retries will happen.'",
    ),
  );
  return steps;
}

export function twoPhaseVsSagaSteps(params: TwoPhaseVsSagaParams): VizStep<TwoPhaseVsSagaState>[] {
  return params.mode === "saga" ? sagaSteps(params.fail) : twoPhaseSteps(params.fail);
}

const WIDTH = 480;
const HEIGHT = 240;
const COORD = { x: 170, y: 14, w: 140, h: 52 };
const SERVICE_W = 144;
const SERVICE_H = 66;
const SERVICE_Y = 138;
const SERVICE_X: Record<ParticipantId, number> = { order: 12, payment: 168, inventory: 324 };

export function TwoPhaseVsSagaView({ state, params }: { state: TwoPhaseVsSagaState; params: TwoPhaseVsSagaParams }) {
  const coordCenterX = COORD.x + COORD.w / 2;
  return (
    <div>
      <Frame width={WIDTH} height={HEIGHT} label={params.mode === "saga" ? "Saga with compensations" : "Two-phase commit"}>
        <ArrowDefs />
        {state.participants.map((p) => {
          const x = SERVICE_X[p.id] + SERVICE_W / 2;
          const dashed = params.mode === "saga";
          return <Edge key={`edge-${p.id}`} from={[coordCenterX + (x - coordCenterX) * 0.25, COORD.y + COORD.h]} to={[x, SERVICE_Y]} tone={p.edge} dashed={dashed && p.edge === "idle"} />;
        })}
        <Box x={COORD.x} y={COORD.y} width={COORD.w} height={COORD.h} title={state.coordinatorTitle} tone={state.coordinatorTone}>
          <text x={COORD.x + 10} y={COORD.y + 33} fontSize={10} fill={VIZ_COLORS.muted}>
            {state.coordinatorStatus}
          </text>
          <text x={COORD.x + 10} y={COORD.y + 46} fontSize={10} fontWeight={600} fill={state.coordinatorTone === "hot" ? VIZ_COLORS.coral : VIZ_COLORS.accent} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
            {state.message}
          </text>
        </Box>
        {state.participants.map((p) => {
          const x = SERVICE_X[p.id];
          const statusColor = p.tone === "hot" ? VIZ_COLORS.coral : p.tone === "ok" ? VIZ_COLORS.teal : p.tone === "active" ? VIZ_COLORS.accent : VIZ_COLORS.muted;
          return (
            <Box key={p.id} x={x} y={SERVICE_Y} width={SERVICE_W} height={SERVICE_H} title={NAME[p.id]} tone={p.tone}>
              <text x={x + 10} y={SERVICE_Y + 35} fontSize={10.5} fontWeight={600} fill={statusColor}>
                {p.status}
              </text>
              <text x={x + 10} y={SERVICE_Y + 51} fontSize={9.5} fill={VIZ_COLORS.muted}>
                {p.note}
              </text>
            </Box>
          );
        })}
        <Label x={16} y={HEIGHT - 10} tone="ink" weight={600}>
          {state.footer}
        </Label>
      </Frame>
      <Legend items={[{ tone: "accent", label: "message in flight" }, { tone: "teal", label: "voted yes / committed" }, { tone: "coral", label: "failed / blocked" }]} />
    </div>
  );
}

export const twoPhaseVsSagaViz: VizDefinition<TwoPhaseVsSagaParams, TwoPhaseVsSagaState> = {
  id: "two-phase-vs-saga",
  title: "Two-phase commit versus a saga",
  summary: "One order across three services. Watch 2PC hold locks and block, then run the same order as a saga with compensations.",
  fields: [
    {
      key: "mode",
      label: "Strategy",
      kind: "select",
      options: [
        { value: "2pc", label: "Two-phase commit" },
        { value: "saga", label: "Saga (orchestrated)" },
      ],
    },
    {
      key: "fail",
      label: "Which participant fails",
      kind: "select",
      options: [
        { value: "none", label: "None (happy path)" },
        { value: "payment", label: "Payment" },
        { value: "inventory", label: "Inventory" },
      ],
    },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({
    mode: asChoice(raw.mode, ["2pc", "saga"] as const, DEFAULTS.mode),
    fail: asChoice(raw.fail, ["none", "payment", "inventory"] as const, DEFAULTS.fail),
  }),
  steps: twoPhaseVsSagaSteps,
  View: TwoPhaseVsSagaView,
};
