import { Cell, Frame, Label, Legend, Pointer, VIZ_COLORS, type CellTone } from "./primitives";
import { asNumber, asStringList, type VizDefinition, type VizStep } from "./types";

/**
 * Tumbling event-time windows over an out-of-order stream. The watermark trails the newest
 * event time by the allowed lateness; when it passes a window's end, the window closes and
 * emits. Events for a closed window are dropped.
 */

export type StreamWindowParams = { events: string[]; windowSec: number; lateness: number };

export type StreamEvent = { t: number; v: number; status: "pending" | "accepted" | "late" | "dropped" };
export type StreamWindow = { start: number; end: number; count: number; sum: number; status: "open" | "closed" };
export type StreamWindowState = {
  /** Index of the event that just arrived, -1 before any. */
  i: number;
  maxSeen: number;
  watermark: number;
  events: StreamEvent[];
  windows: StreamWindow[];
  emitted: { start: number; end: number; count: number; sum: number }[];
  dropped: number;
};

const DEFAULTS: StreamWindowParams = {
  events: ["1:4", "3:2", "2:5", "6:1", "5:3", "8:2", "4:7", "9:1", "13:2", "10:2", "12:4"],
  windowSec: 5,
  lateness: 2,
};

const EVENT_RE = /^-?\d+(\.\d+)?:-?\d+(\.\d+)?$/;

export function parseEvents(value: unknown): string[] {
  const items = asStringList(value, DEFAULTS.events).filter((item) => EVENT_RE.test(item));
  return items.length ? items.slice(0, 16) : DEFAULTS.events;
}

function toEvent(raw: string): StreamEvent {
  const [t, v] = raw.split(":").map(Number);
  return { t: Math.max(0, t), v, status: "pending" };
}

function snapshot(state: StreamWindowState): StreamWindowState {
  return { ...state, events: state.events.map((e) => ({ ...e })), windows: state.windows.map((w) => ({ ...w })), emitted: state.emitted.map((w) => ({ ...w })) };
}

function frame(state: StreamWindowState, kind: VizStep<StreamWindowState>["kind"], title: string, explain: string, interview: string): VizStep<StreamWindowState> {
  return { title, explain, interview, kind, state: snapshot(state) };
}

function windowFor(windows: StreamWindow[], t: number, size: number): StreamWindow {
  const start = Math.floor(t / size) * size;
  let found = windows.find((w) => w.start === start);
  if (!found) {
    found = { start, end: start + size, count: 0, sum: 0, status: "open" };
    windows.push(found);
    windows.sort((a, b) => a.start - b.start);
  }
  return found;
}

export function streamWindowSteps(params: StreamWindowParams): VizStep<StreamWindowState>[] {
  const size = params.windowSec;
  const lateness = params.lateness;
  const steps: VizStep<StreamWindowState>[] = [];
  const state: StreamWindowState = { i: -1, maxSeen: 0, watermark: 0, events: params.events.map(toEvent), windows: [], emitted: [], dropped: 0 };

  steps.push(
    frame(
      state,
      "setup",
      `Windows of ${size}s, lateness ${lateness}s`,
      `${state.events.length} events will arrive in the order shown on the top row. Each is placed on the timeline by its event time, not by when it arrives. The watermark stays ${lateness}s behind the newest event time seen.`,
      "Name the two clocks first: 'I count by event time, the time stamped on the event, not by processing time, when my pipeline saw it. The watermark is my estimate of how far event time has progressed, and allowed lateness is how long I wait for stragglers.'",
    ),
  );

  for (let i = 0; i < state.events.length; i += 1) {
    const event = state.events[i];
    state.i = i;
    const outOfOrder = i > 0 && event.t < state.maxSeen;
    const window = windowFor(state.windows, event.t, size);

    if (window.status === "closed") {
      event.status = "dropped";
      state.dropped += 1;
      steps.push(
        frame(
          state,
          "tradeoff",
          `t=${event.t}: dropped, window [${window.start}, ${window.end}) already closed`,
          `This event belongs to a window that already emitted. It is later than the allowed lateness, so the count cannot include it without changing a result already sent downstream.`,
          "Own the loss out loud: 'anything later than my allowed lateness is dropped or routed to a side output; if the number is billing-grade I recount that window in a nightly batch job and overwrite the row'. Say which, and why the lateness was chosen from measured delay.",
        ),
      );
      continue;
    }

    const behindWatermark = event.t < state.watermark;
    event.status = behindWatermark ? "late" : "accepted";
    window.count += 1;
    window.sum += event.v;
    const before = state.watermark;
    state.maxSeen = Math.max(state.maxSeen, event.t);
    state.watermark = Math.max(0, state.maxSeen - lateness);
    const moved = state.watermark > before;

    let title: string;
    let explain: string;
    let interview: string;
    let kind: VizStep<StreamWindowState>["kind"];
    if (behindWatermark) {
      kind = "decision";
      title = `t=${event.t}: late but accepted into [${window.start}, ${window.end})`;
      explain = `Event time ${event.t} is behind the watermark (${before}), but its window has not closed yet. It is counted. Window now count ${window.count}, sum ${window.sum}.`;
      interview = "This is what allowed lateness buys you: 'an event behind the watermark still counts as long as its window is open; I keep window state around for the lateness period so stragglers land in the right bucket instead of the wrong hour'.";
    } else if (outOfOrder) {
      kind = "decision";
      title = `t=${event.t}: out of order, placed in [${window.start}, ${window.end})`;
      explain = `Arrived after an event with time ${state.maxSeen}, but event time ${event.t} puts it in an earlier window. Counted there. Window now count ${window.count}, sum ${window.sum}.`;
      interview = "Show you expect disorder: 'events arrive out of order whenever a phone is offline or a partition lags; because I bucket by event time, the click at 09:59 still lands in the 09:00 window even if it shows up at 10:01'.";
    } else {
      kind = "invariant";
      title = `t=${event.t}: counted in [${window.start}, ${window.end})`;
      explain = `Event time ${event.t}, value ${event.v}. Window now count ${window.count}, sum ${window.sum}.${moved ? ` Watermark moves to ${state.watermark}.` : ""}`;
      interview = "State the running invariant: 'every open window holds a count and a sum keyed by its start time; that is the operator state, and it is checkpointed with the log offsets so a crash replays into the same numbers'.";
    }
    steps.push(frame(state, kind, title, explain, interview));

    const closing = state.windows.filter((w) => w.status === "open" && state.watermark >= w.end);
    for (const w of closing) {
      w.status = "closed";
      state.emitted.push({ start: w.start, end: w.end, count: w.count, sum: w.sum });
      steps.push(
        frame(
          state,
          "decision",
          `Watermark ${state.watermark} passes ${w.end}: emit [${w.start}, ${w.end}) count ${w.count}, sum ${w.sum}`,
          `Newest event time is ${state.maxSeen}, so the watermark is ${state.maxSeen} − ${lateness} = ${state.watermark}. That is past the window's end, so the window closes and its result is written downstream.`,
          "Explain the close rule and the write: 'a window closes when the watermark passes its end, and I write its result as an upsert keyed by window start and key, so if the job restarts from a checkpoint and emits the same window again the row simply overwrites itself'.",
        ),
      );
    }
  }

  const open = state.windows.filter((w) => w.status === "open");
  steps.push(
    frame(
      state,
      "result",
      `Emitted ${state.emitted.length} window${state.emitted.length === 1 ? "" : "s"}, dropped ${state.dropped}, ${open.length} still open`,
      `${state.emitted.map((w) => `[${w.start}, ${w.end}) → count ${w.count}, sum ${w.sum}`).join("; ") || "No window closed yet"}. ${open.length ? `Open windows wait for the watermark to reach ${open.map((w) => w.end).join(", ")}.` : "Nothing is left open."}`,
      "Close with the dial: 'lateness is the trade-off between correctness and freshness; a larger value drops fewer events and delays every result. I pick it from the measured arrival-delay distribution, say the 99th percentile, and route anything later to a side output for batch correction'.",
    ),
  );
  return steps;
}

function eventTone(event: StreamEvent, current: boolean): CellTone {
  if (event.status === "pending") return "faded";
  if (event.status === "dropped") return "miss";
  if (current) return "edge";
  return event.status === "late" ? "window" : "hit";
}

export function StreamWindowView({ state, params }: { state: StreamWindowState; params: StreamWindowParams }) {
  const width = 560;
  const height = 250;
  const size = params.windowSec;
  const maxT = Math.max(size, ...state.events.map((e) => e.t));
  const spanEnd = (Math.floor(maxT / size) + 1) * size;
  const left = 40;
  const right = width - 30;
  const x = (t: number) => left + (t / spanEnd) * (right - left);
  const windowCount = Math.ceil(spanEnd / size);
  const cell = 22;
  const arrivalY = 34;
  const windowY = 96;
  const windowH = 70;
  const eventY = windowY + 30;
  const axisY = windowY + windowH + 12;

  return (
    <div>
      <Frame width={width} height={height} label="Events arriving over time, bucketed into tumbling event-time windows">
        <Label x={left} y={arrivalY - 10} size={9}>
          arrival order
        </Label>
        {state.events.map((event, i) => (
          <Cell key={i} x={left + i * (cell + 6)} y={arrivalY} size={cell} value={event.t} tone={eventTone(event, i === state.i)} caption={i === state.i ? "now" : undefined} />
        ))}

        <Label x={left} y={windowY - 8} size={9}>
          event time
        </Label>
        {Array.from({ length: windowCount }, (_, k) => {
          const start = k * size;
          const w = state.windows.find((item) => item.start === start);
          const tone = w?.status === "closed" ? VIZ_COLORS.teal : w?.status === "open" ? VIZ_COLORS.accent : VIZ_COLORS.line;
          const fill = w?.status === "closed" ? "color-mix(in srgb, var(--teal) 12%, transparent)" : w?.status === "open" ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent";
          return (
            <g key={start}>
              <rect x={x(start) + 1} y={windowY} width={x(start + size) - x(start) - 2} height={windowH} rx={8} fill={fill} stroke={tone} strokeWidth={w ? 1.5 : 1} strokeDasharray={w ? undefined : "3 3"} />
              <text x={x(start) + 6} y={windowY + 13} fontSize={9} fontWeight={600} fill={VIZ_COLORS.ink}>
                [{start}, {start + size})
              </text>
              {w ? (
                <text x={x(start + size) - 6} y={windowY + windowH - 6} textAnchor="end" fontSize={9} fill={w.status === "closed" ? VIZ_COLORS.teal : VIZ_COLORS.muted}>
                  {w.status === "closed" ? "emitted " : ""}n={w.count} Σ={w.sum}
                </text>
              ) : null}
            </g>
          );
        })}
        {state.events.map((event, i) =>
          event.status === "pending" ? null : <Cell key={i} x={x(event.t) - cell / 2} y={eventY} size={cell} value={event.v} tone={eventTone(event, i === state.i)} />,
        )}

        <line x1={left} y1={axisY} x2={right} y2={axisY} stroke={VIZ_COLORS.line} />
        {Array.from({ length: windowCount + 1 }, (_, k) => (
          <text key={k} x={x(k * size)} y={axisY + 14} textAnchor="middle" fontSize={9} fill={VIZ_COLORS.muted}>
            {k * size}s
          </text>
        ))}
        {state.i >= 0 ? (
          <g>
            <line x1={x(state.watermark)} y1={windowY - 4} x2={x(state.watermark)} y2={axisY} stroke={VIZ_COLORS.coral} strokeWidth={1.5} strokeDasharray="4 3" />
            <Pointer x={x(state.watermark)} y={axisY + 30} label={`watermark ${state.watermark}`} tone="coral" />
          </g>
        ) : null}
        <Label x={right} y={height - 6} anchor="end">
          window {size}s, lateness {params.lateness}s, newest event time {state.maxSeen}
        </Label>
      </Frame>
      <Legend
        items={[
          { tone: "hit", label: "counted" },
          { tone: "window", label: "late, still counted" },
          { tone: "miss", label: "dropped" },
          { tone: "coral", label: "watermark = newest − lateness" },
          { tone: "teal", label: "closed window" },
        ]}
      />
    </div>
  );
}

export const streamWindowViz: VizDefinition<StreamWindowParams, StreamWindowState> = {
  id: "stream-window",
  title: "Event-time windows and the watermark",
  summary: "Out-of-order events land in the right window by event time; the watermark decides when a window closes and what counts as too late.",
  fields: [
    { key: "events", label: "Events (eventTime:value, in arrival order)", kind: "text", hint: "Comma-separated, e.g. 1:4, 3:2, 2:5" },
    { key: "windowSec", label: "Window size (s)", kind: "number" },
    { key: "lateness", label: "Allowed lateness (s)", kind: "number" },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({
    events: parseEvents(raw.events),
    windowSec: asNumber(raw.windowSec, DEFAULTS.windowSec, 1, 60),
    lateness: asNumber(raw.lateness, DEFAULTS.lateness, 0, 60),
  }),
  steps: streamWindowSteps,
  View: StreamWindowView,
};
