import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Two number-strings and the product digit row they write into. Draws state only. */

export type GrokDigitGridState = {
  num1: string;
  num2: string;
  i: number | null;
  j: number | null;
  digits: number[];
  digitTones: CellTone[];
  /** Coral: the wrong slot for the ones digit. */
  trapSlot: number | null;
  product: string | null;
  note: string | null;
  trapNote: string | null;
  counter: { label: string; value: string } | null;
};

const WIDTH = 560;
const HEIGHT = 236;
const SIZE = 36;
const GAP = 6;

export function GrokDigitGridView({ state, pick }: { state: GrokDigitGridState; pick?: CellPick }) {
  const topX = (count: number) => (WIDTH - (count * (SIZE + GAP) - GAP)) / 2;
  const num1X = topX(state.num1.length);
  const num2X = topX(state.num2.length);
  const digitX = topX(Math.max(state.digits.length, 1));
  const low = state.i !== null && state.j !== null ? state.i + state.j + 1 : null;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Digit-by-digit multiply into a row of places">
      {state.counter ? (
        <Label x={16} y={20} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.product !== null ? (
        <Label x={WIDTH - 16} y={20} size={13} weight={600} tone="teal" anchor="end">
          product: {state.product}
        </Label>
      ) : null}

      <Label x={16} y={52} size={12} weight={600}>
        first
      </Label>
      {state.num1.split("").map((digit, index) => (
        <Cell key={`a-${index}`} x={num1X + index * (SIZE + GAP)} y={36} size={SIZE} value={digit} tone={index === state.i ? "edge" : "idle"} caption={String(index)} />
      ))}

      <Label x={16} y={104} size={12} weight={600}>
        second
      </Label>
      {state.num2.split("").map((digit, index) => (
        <Cell key={`b-${index}`} x={num2X + index * (SIZE + GAP)} y={88} size={SIZE} value={digit} tone={index === state.j ? "edge" : "idle"} caption={String(index)} />
      ))}

      <Label x={16} y={164} size={12} weight={600}>
        places
      </Label>
      {state.digits.map((digit, index) => (
        <g key={`d-${index}`}>
          <Cell
            x={digitX + index * (SIZE + GAP)}
            y={148}
            size={SIZE}
            value={digit}
            tone={pickTone(pick, index, index === state.trapSlot ? "miss" : index === low ? "edge" : (state.digitTones[index] ?? "idle"))}
            caption={String(index)}
          />
          <RejectedMark pick={pick} index={index} x={digitX + index * (SIZE + GAP) + SIZE - 8} y={156} />
        </g>
      ))}

      {state.i !== null && state.j !== null && low !== null && low < state.digits.length ? (
        <path
          className={GLIDE}
          d={`M${num1X + state.i * (SIZE + GAP) + SIZE / 2} ${36 + SIZE} L${digitX + low * (SIZE + GAP) + SIZE / 2} 148`}
          fill="none"
          stroke={VIZ_COLORS.accent}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      ) : null}

      {state.note ? (
        <Label x={WIDTH / 2} y={HEIGHT - 12} size={12} weight={600} tone="teal" anchor="middle">
          {state.note}
        </Label>
      ) : null}
      {state.trapNote ? (
        <Label x={WIDTH / 2} y={HEIGHT - 12} size={12} weight={700} tone="coral" anchor="middle">
          {state.trapNote}
        </Label>
      ) : null}

      {state.digits.map((_, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={digitX + index * (SIZE + GAP) - 3} y={148} width={SIZE + GAP} height={SIZE + 16} label={`Choose place ${index}`} />
      ))}
    </Frame>
  );
}
