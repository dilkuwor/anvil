import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import { GLIDE } from "./view-kit";

/**
 * A one-lane road with cars driving right towards the finish. Each car shows its speed inside and,
 * once worked out, its arrival time above. Brackets under the road group the cars into fleets.
 * Beside the road: the stack of fleet arrival times, newest on top. Draws state only.
 */

export type RoadCar = { id: number; pos: number; speed: number; tone: CellTone; time: string | null };

export type CarFleetState = {
  target: number;
  cars: RoadCar[];
  /** Fleets found so far, each a list of car ids, for the brackets under the road. */
  fleets: number[][];
  /** Fleet arrival times, bottom first: the last one is the top. `null` hides the stack. */
  stack: { label: string; tone: CellTone }[] | null;
  /** A car and the car it drives with. */
  link?: { from: number; to: number } | null;
  /** The trap: comparing with the car just ahead and its own time, drawn as a coral dashed arc. */
  wrongLink?: { from: number; to: number; label: string } | null;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 250;
const ROAD_L = 84;
const ROAD_R = 396;
const ROAD_Y = 100;
const ROAD_H = 40;
const CAR_W = 28;
const CAR_H = 22;
const TIME_Y = 92;
const MILE_Y = 158;
const FLEET_Y = 174;
const STACK_X = 432;
const STACK_W = 76;
const STACK_BOTTOM = 232;
const BOX_H = 26;
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

const FILL: Record<CellTone, string> = {
  idle: "color-mix(in srgb, var(--steel-700) 30%, transparent)",
  window: "color-mix(in srgb, var(--accent) 18%, transparent)",
  edge: "color-mix(in srgb, var(--accent) 45%, transparent)",
  hit: "color-mix(in srgb, var(--teal) 22%, transparent)",
  miss: "color-mix(in srgb, var(--coral) 30%, transparent)",
  done: "color-mix(in srgb, var(--teal) 48%, transparent)",
  faded: "transparent",
};

const STROKE: Record<CellTone, string> = {
  idle: VIZ_COLORS.line,
  window: VIZ_COLORS.accent,
  edge: VIZ_COLORS.accent,
  hit: VIZ_COLORS.teal,
  miss: VIZ_COLORS.coral,
  done: VIZ_COLORS.teal,
  faded: VIZ_COLORS.line,
};

export function CarFleetView({ state }: { state: CarFleetState }) {
  const { target, cars, stack } = state;
  const mileX = (mile: number) => ROAD_L + (mile / Math.max(target, 1)) * (ROAD_R - ROAD_L);
  const byId = new Map(cars.map((car) => [car.id, car]));
  const carY = ROAD_Y + (ROAD_H - CAR_H) / 2;

  // Mile labels: the start, every car, and the finish. A label too close to the one before it is left out.
  const miles = [...new Set([0, ...cars.map((car) => car.pos), target])].sort((a, b) => a - b);
  const shownMiles: number[] = [];
  for (const mile of miles) {
    const last = shownMiles.at(-1);
    if (last === undefined || mileX(mile) - mileX(last) >= 18 || mile === target) {
      if (mile === target && last !== undefined && mileX(mile) - mileX(last) < 18) shownMiles.pop();
      shownMiles.push(mile);
    }
  }

  const arc = (from: RoadCar, to: RoadCar, color: string, dashed: boolean, text: string | null, key: string) => {
    const x1 = mileX(from.pos);
    const x2 = mileX(to.pos);
    const top = 44;
    return (
      <g key={key}>
        <path d={`M${x1} ${TIME_Y - 16} Q${(x1 + x2) / 2} ${top - 10} ${x2} ${TIME_Y - 16}`} fill="none" stroke={color} strokeWidth={2.25} strokeDasharray={dashed ? "5 4" : undefined} />
        {text ? (
          <text x={Math.min(ROAD_R - 30, Math.max(ROAD_L + 30, (x1 + x2) / 2))} y={top - 4} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={color}>
            {text}
          </text>
        ) : null}
      </g>
    );
  };

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Cars on a one-lane road driving to the finish, grouped into fleets, beside a stack of fleet arrival times">
      {state.counter ? (
        <Label x={12} y={20} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}

      <text x={8} y={TIME_Y} fontSize={11} fontWeight={600} fill={VIZ_COLORS.muted}>
        arrives
      </text>
      <text x={8} y={ROAD_Y + ROAD_H / 2 + 4} fontSize={11} fontWeight={600} fill={VIZ_COLORS.muted}>
        speed
      </text>
      <text x={8} y={MILE_Y} fontSize={11} fontWeight={600} fill={VIZ_COLORS.muted}>
        mile
      </text>

      {/* The road, and the finish line at its right end. */}
      <rect x={ROAD_L - 20} y={ROAD_Y} width={ROAD_R - ROAD_L + 20} height={ROAD_H} rx={6} fill="color-mix(in srgb, var(--steel-900) 55%, transparent)" stroke={VIZ_COLORS.line} />
      <line x1={ROAD_L - 16} y1={ROAD_Y + ROAD_H / 2} x2={ROAD_R - 4} y2={ROAD_Y + ROAD_H / 2} stroke={VIZ_COLORS.line} strokeDasharray="8 8" strokeOpacity={0.6} />
      <line x1={ROAD_R} y1={ROAD_Y - 10} x2={ROAD_R} y2={ROAD_Y + ROAD_H + 6} stroke={VIZ_COLORS.teal} strokeWidth={3} />
      <text x={ROAD_R} y={ROAD_Y - 14} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.teal}>
        finish
      </text>

      {shownMiles.map((mile) => (
        <text key={`mile-${mile}`} x={mileX(mile)} y={MILE_Y} textAnchor="middle" fontSize={10.5} fill={VIZ_COLORS.muted} fontFamily={MONO}>
          {mile}
        </text>
      ))}

      {/* Fleet brackets under the road. */}
      {state.fleets.map((ids, index) => {
        const members = ids.map((id) => byId.get(id)).filter((car): car is RoadCar => Boolean(car));
        if (members.length === 0) return null;
        const left = Math.min(...members.map((car) => mileX(car.pos))) - CAR_W / 2;
        const right = Math.max(...members.map((car) => mileX(car.pos))) + CAR_W / 2;
        return (
          <g key={`fleet-${index}`} className={GLIDE}>
            <path d={`M${left} ${FLEET_Y - 5} L${left} ${FLEET_Y} L${right} ${FLEET_Y} L${right} ${FLEET_Y - 5}`} fill="none" stroke={VIZ_COLORS.teal} strokeWidth={2} />
            <text x={(left + right) / 2} y={FLEET_Y + 14} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={VIZ_COLORS.teal}>
              fleet {index + 1}
            </text>
          </g>
        );
      })}

      {state.link && byId.get(state.link.from) && byId.get(state.link.to) ? arc(byId.get(state.link.from)!, byId.get(state.link.to)!, VIZ_COLORS.teal, false, null, "link") : null}
      {state.wrongLink && byId.get(state.wrongLink.from) && byId.get(state.wrongLink.to) ? arc(byId.get(state.wrongLink.from)!, byId.get(state.wrongLink.to)!, VIZ_COLORS.coral, true, state.wrongLink.label, "wrong") : null}

      {cars.map((car) => {
        const x = mileX(car.pos) - CAR_W / 2;
        return (
          <g key={car.id} className={GLIDE} opacity={car.tone === "faded" ? 0.4 : 1}>
            <rect x={x} y={carY} width={CAR_W} height={CAR_H} rx={6} fill={FILL[car.tone]} stroke={STROKE[car.tone]} strokeWidth={car.tone === "idle" ? 1.25 : 2} />
            {/* A small nose shows which way the car drives. */}
            <path d={`M${x + CAR_W} ${carY + 6} l5 5 l-5 5 Z`} fill={STROKE[car.tone]} />
            <text x={x + CAR_W / 2} y={carY + 15.5} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily={MONO}>
              {car.speed}
            </text>
            {car.time !== null ? (
              <text x={mileX(car.pos)} y={TIME_Y} textAnchor="middle" fontSize={11} fontWeight={700} fill={car.tone === "miss" ? VIZ_COLORS.coral : VIZ_COLORS.ink} fontFamily={MONO}>
                {car.time}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* The stack of fleet arrival times, newest on top. */}
      {stack ? (
        <g>
          <text x={STACK_X + STACK_W / 2} y={34} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={VIZ_COLORS.ink}>
            fleet times
          </text>
          <path d={`M${STACK_X - 4} 44 L${STACK_X - 4} ${STACK_BOTTOM + 4} L${STACK_X + STACK_W + 4} ${STACK_BOTTOM + 4} L${STACK_X + STACK_W + 4} 44`} fill="none" stroke={VIZ_COLORS.line} strokeWidth={1.5} />
          {stack.length === 0 ? (
            <text x={STACK_X + STACK_W / 2} y={STACK_BOTTOM - 8} textAnchor="middle" fontSize={11} fill={VIZ_COLORS.muted}>
              (empty)
            </text>
          ) : null}
          {stack.map((entry, index) => {
            const y = STACK_BOTTOM - (index + 1) * (BOX_H + 4);
            const isTop = index === stack.length - 1;
            return (
              <g key={index} className={GLIDE} opacity={entry.tone === "faded" ? 0.4 : 1}>
                <rect x={STACK_X} y={y} width={STACK_W} height={BOX_H} rx={6} fill={FILL[entry.tone]} stroke={STROKE[entry.tone]} strokeWidth={entry.tone === "idle" ? 1.25 : 2} />
                <text x={STACK_X + STACK_W / 2} y={y + 17} textAnchor="middle" fontSize={12.5} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily={MONO}>
                  {entry.label}
                </text>
                {isTop ? (
                  <text x={STACK_X + STACK_W + 10} y={y + 17} fontSize={11} fontWeight={700} fill={VIZ_COLORS.accent}>
                    top
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      ) : null}
    </Frame>
  );
}
