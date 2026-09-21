import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * A pile of plates (last set down sits on top), with the input as a row of boxes.
 * Optional second pile, a root floor, kind-counts, and a "none" box. Draws state only.
 *
 * Click indices, bottom of the pile first:
 *   tokens 0..n-1, none = n if askNone, then main plates, then other plates.
 */

export type Plate = {
  label: string;
  note?: string;
  tone?: CellTone;
};

export type PlateStackState = {
  tokens: string[];
  tokenTones: CellTone[];
  cursor: number | null;
  plates: Plate[];
  stackTitle: string;
  otherPlates?: Plate[];
  otherTitle?: string;
  floor?: string | null;
  floorTone?: CellTone;
  held?: string | null;
  heldTone?: CellTone;
  current?: string | null;
  countBuild?: number | null;
  result?: string | null;
  counter?: { label: string; value: number } | null;
  banner?: string | null;
  counts?: { label: string; value: number; tone?: CellTone }[] | null;
  ghostLabel?: string | null;
  xMark?: boolean;
  askNone?: boolean;
  noneLabel?: string;
  pileLit?: boolean;
  minField?: { value: string; tone?: CellTone } | null;
};

const WIDTH = 560;
const HEIGHT = 300;

const FILL: Record<CellTone, string> = {
  idle: "color-mix(in srgb, var(--steel-700) 28%, transparent)",
  window: "color-mix(in srgb, var(--accent) 18%, transparent)",
  edge: "color-mix(in srgb, var(--accent) 42%, transparent)",
  hit: "color-mix(in srgb, var(--teal) 24%, transparent)",
  miss: "color-mix(in srgb, var(--coral) 30%, transparent)",
  done: "color-mix(in srgb, var(--teal) 46%, transparent)",
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

export function pickCount(state: PlateStackState): number {
  return state.tokens.length + (state.askNone ? 1 : 0) + state.plates.length + (state.otherPlates?.length ?? 0);
}

export function nonePick(state: PlateStackState): number {
  return state.tokens.length;
}

export function platePick(state: PlateStackState, fromBottom: number): number {
  return state.tokens.length + (state.askNone ? 1 : 0) + fromBottom;
}

export function topPlatePick(state: PlateStackState): number {
  return platePick(state, Math.max(0, state.plates.length - 1));
}

export function otherPick(state: PlateStackState, fromBottom: number): number {
  return state.tokens.length + (state.askNone ? 1 : 0) + state.plates.length + fromBottom;
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`;
}

function PlateBody({
  x,
  y,
  w,
  h,
  plate,
  tone,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  plate: Plate;
  tone: CellTone;
}) {
  const font = h < 20 ? 10 : plate.label.length > 8 ? 11 : 13;
  return (
    <g className={GLIDE} style={{ transform: `translate(${x}px, ${y}px)`, opacity: tone === "faded" ? 0.4 : 1 }}>
      <rect width={w} height={h - 2} rx={h * 0.45} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1 : 2} />
      <ellipse cx={w / 2} cy={4} rx={w / 2 - 3} ry={Math.min(6, h * 0.22)} fill="color-mix(in srgb, var(--steel-900) 35%, transparent)" />
      <text x={w / 2} y={h * 0.62} textAnchor="middle" fontSize={font} fontWeight={700} fill={VIZ_COLORS.ink}>
        {clip(plate.label, 10)}
      </text>
      {plate.note ? (
        <text x={w + 6} y={h * 0.58} fontSize={10} fontWeight={600} fill={VIZ_COLORS.muted}>
          {clip(plate.note, 14)}
        </text>
      ) : null}
    </g>
  );
}

function Pile({
  cx,
  top,
  bottom,
  plates,
  title,
  floor,
  floorTone,
  lit,
  pick,
  indexOf,
}: {
  cx: number;
  top: number;
  bottom: number;
  plates: Plate[];
  title: string;
  floor?: string | null;
  floorTone?: CellTone;
  lit?: boolean;
  pick?: CellPick;
  indexOf: (fromBottom: number) => number;
}) {
  const w = 128;
  const x = cx - w / 2;
  const floorH = floor ? 18 : 0;
  const room = Math.max(24, bottom - top - floorH - 8);
  const h = Math.min(28, Math.max(16, Math.floor(room / Math.max(plates.length, 1))));
  const floorY = bottom - floorH;
  return (
    <g>
      <rect
        x={x - 14}
        y={top - 22}
        width={w + 28}
        height={bottom - top + 28}
        rx={12}
        fill={lit ? "color-mix(in srgb, var(--teal) 12%, transparent)" : "color-mix(in srgb, var(--steel-900) 40%, transparent)"}
        stroke={lit ? VIZ_COLORS.teal : VIZ_COLORS.line}
        strokeWidth={1.25}
      />
      <text x={cx} y={top - 8} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.accent}>
        {title}
      </text>
      {floor ? (
        <g className={GLIDE} style={{ transform: `translate(${x}px, ${floorY}px)` }}>
          <rect width={w} height={floorH} rx={6} fill={FILL[floorTone ?? "done"]} stroke={STROKE[floorTone ?? "done"]} strokeWidth={1.5} />
          <text x={w / 2} y={13} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.ink}>
            {floor}
          </text>
        </g>
      ) : null}
      {plates.length === 0 && !floor ? (
        <text x={cx} y={(top + bottom) / 2} textAnchor="middle" fontSize={12} fill={VIZ_COLORS.muted}>
          (empty)
        </text>
      ) : null}
      {plates.map((plate, fromBottom) => {
        const y = floorY - (fromBottom + 1) * h;
        const tone = pickTone(pick, indexOf(fromBottom), plate.tone ?? "idle");
        const idx = indexOf(fromBottom);
        return (
          <g key={`p-${fromBottom}`}>
            <PlateBody x={x} y={y} w={w} h={h} plate={plate} tone={tone} />
            <RejectedMark pick={pick} index={idx} x={x + w - 8} y={y + 12} />
          </g>
        );
      })}
    </g>
  );
}

export function GrokPlateStackView({ state, pick }: { state: PlateStackState; pick?: CellPick }) {
  const { tokens, plates } = state;
  const n = Math.max(tokens.length, 1);
  const gap = tokens.length > 10 ? 4 : 6;
  const tokenW = Math.min(52, Math.max(22, (WIDTH - 36 - gap * (n - 1)) / n));
  const rowW = tokens.length * tokenW + Math.max(0, tokens.length - 1) * gap;
  const startX = (WIDTH - rowW) / 2;
  const tokenX = (index: number) => startX + index * (tokenW + gap);
  const twoPiles = Boolean(state.otherPlates);
  const showAux = state.held != null || state.current != null || state.countBuild != null;
  const pileTop = showAux ? 124 : 102;
  const pileBottom = state.askNone ? 236 : 254;
  const mainCx = twoPiles ? 390 : state.counts || state.minField ? 340 : 280;
  const otherCx = 160;
  const noneY = 268;
  const noneLabel = state.noneLabel ?? "none";
  const noneIndex = nonePick(state);
  const nonePicked = pick?.picked === noneIndex;
  const noneWrong = (nonePicked && pick?.answer !== noneIndex) || (pick?.rejected?.includes(noneIndex) ?? false);

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A pile of plates, last one set down sitting on top">
      {state.banner ? (
        <Label x={16} y={18} size={13} weight={600} tone="accent">
          {state.banner}
        </Label>
      ) : null}
      {state.result != null ? (
        <Label x={WIDTH - 16} y={18} size={13} weight={600} tone="teal" anchor="end">
          {clip(state.result, 28)}
        </Label>
      ) : null}

      {tokens.map((token, index) => {
        const tone = pickTone(pick, index, state.tokenTones[index] ?? "idle");
        const x = tokenX(index);
        return (
          <g key={`t-${index}`} className={GLIDE} style={{ opacity: tone === "faded" ? 0.4 : 1 }}>
            <rect
              className={GLIDE}
              x={x}
              y={32}
              width={tokenW}
              height={36}
              rx={7}
              fill={FILL[tone]}
              stroke={STROKE[tone]}
              strokeWidth={tone === "idle" || tone === "faded" ? 1 : 2}
            />
            <text x={x + tokenW / 2} y={54} textAnchor="middle" fontSize={tokenW < 28 || token.length > 4 ? 10 : 13} fontWeight={700} fill={VIZ_COLORS.ink}>
              {clip(token, tokenW < 30 ? 3 : 6)}
            </text>
            <text x={x + tokenW / 2} y={80} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
              {index}
            </text>
            {state.cursor === index ? (
              <text x={x + tokenW / 2} y={28} textAnchor="middle" fontSize={10} fontWeight={700} fill={VIZ_COLORS.accent}>
                now
              </text>
            ) : null}
            <RejectedMark pick={pick} index={index} x={x + tokenW - 6} y={44} />
          </g>
        );
      })}

      {showAux ? (
        <g>
          {state.countBuild != null ? (
            <Label x={24} y={100} size={13} weight={700} tone="accent">
              count {state.countBuild}
            </Label>
          ) : null}
          {state.current != null ? (
            <g>
              <rect x={twoPiles ? 300 : 160} y={88} width={220} height={24} rx={8} fill={FILL.window} stroke={STROKE.window} strokeWidth={1.5} />
              <text x={twoPiles ? 410 : 270} y={105} textAnchor="middle" fontSize={12} fontWeight={600} fill={VIZ_COLORS.ink}>
                tray {clip(state.current === "" ? "(empty)" : state.current, 18)}
              </text>
            </g>
          ) : null}
          {state.held != null ? (
            <g className={GLIDE} style={{ transform: `translate(${mainCx + 78}px, ${pileTop + 8}px)` }}>
              <rect width={44} height={28} rx={12} fill={FILL[state.heldTone ?? "edge"]} stroke={STROKE[state.heldTone ?? "edge"]} strokeWidth={2} />
              <text x={22} y={19} textAnchor="middle" fontSize={13} fontWeight={700} fill={VIZ_COLORS.ink}>
                {clip(state.held, 4)}
              </text>
            </g>
          ) : null}
        </g>
      ) : null}

      {state.counts ? (
        <g>
          <Label x={16} y={pileTop - 8} size={11} weight={700}>
            kind counts
          </Label>
          {state.counts.map((row, index) => (
            <g key={row.label} className={GLIDE} style={{ transform: `translate(16px, ${pileTop + 6 + index * 22}px)` }}>
              <rect width={72} height={20} rx={6} fill={FILL[row.tone ?? "idle"]} stroke={STROKE[row.tone ?? "idle"]} />
              <text x={36} y={14} textAnchor="middle" fontSize={11} fontWeight={600} fill={VIZ_COLORS.ink}>
                {row.label} {row.value}
              </text>
            </g>
          ))}
        </g>
      ) : null}

      {state.minField ? (
        <g className={GLIDE} style={{ transform: "translate(16px, 140px)" }}>
          <rect width={88} height={40} rx={8} fill={FILL[state.minField.tone ?? "miss"]} stroke={STROKE[state.minField.tone ?? "miss"]} strokeWidth={1.75} />
          <text x={44} y={16} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
            min field
          </text>
          <text x={44} y={32} textAnchor="middle" fontSize={14} fontWeight={700} fill={VIZ_COLORS.ink}>
            {state.minField.value}
          </text>
        </g>
      ) : null}

      {state.ghostLabel ? (
        <g className={GLIDE} style={{ transform: `translate(${mainCx - 64}px, ${pileTop - 4}px)` }}>
          <rect width={128} height={24} rx={12} fill="transparent" stroke={VIZ_COLORS.coral} strokeWidth={1.75} strokeDasharray="5 4" />
          <text x={64} y={16} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
            {clip(state.ghostLabel, 16)}
          </text>
        </g>
      ) : null}

      {state.xMark ? (
        <text x={mainCx + 70} y={pileTop + 36} textAnchor="middle" fontSize={18} fontWeight={700} fill={VIZ_COLORS.coral}>
          ✕
        </text>
      ) : null}

      {twoPiles ? (
        <Pile
          cx={otherCx}
          top={pileTop}
          bottom={pileBottom}
          plates={state.otherPlates ?? []}
          title={state.otherTitle ?? "second pile"}
          lit={state.pileLit}
          pick={pick}
          indexOf={(fromBottom) => otherPick(state, fromBottom)}
        />
      ) : null}

      <Pile
        cx={mainCx}
        top={pileTop}
        bottom={pileBottom}
        plates={plates}
        title={state.stackTitle}
        floor={state.floor}
        floorTone={state.floorTone}
        lit={state.pileLit}
        pick={pick}
        indexOf={(fromBottom) => platePick(state, fromBottom)}
      />

      {state.askNone && pick ? (
        <g>
          <rect
            x={WIDTH / 2 - 54}
            y={noneY}
            width={108}
            height={26}
            rx={8}
            strokeDasharray="5 4"
            strokeWidth={1.5}
            stroke={noneWrong ? VIZ_COLORS.coral : nonePicked ? VIZ_COLORS.teal : VIZ_COLORS.muted}
            fill={noneWrong ? FILL.miss : nonePicked ? FILL.done : "transparent"}
          />
          <text x={WIDTH / 2} y={noneY + 18} textAnchor="middle" fontSize={12} fontWeight={600} fill={VIZ_COLORS.ink}>
            {noneLabel}
          </text>
          <RejectedMark pick={pick} index={noneIndex} x={WIDTH / 2 + 42} y={noneY + 18} />
        </g>
      ) : null}

      {state.counter ? (
        <Label x={16} y={HEIGHT - 8} size={12} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}

      {tokens.map((token, index) => (
        <PickTarget
          key={`pt-${index}`}
          pick={pick}
          index={index}
          x={tokenX(index)}
          y={30}
          width={tokenW}
          height={52}
          label={`Choose mark ${index}, ${token}`}
        />
      ))}
      {state.askNone ? <PickTarget pick={pick} index={noneIndex} x={WIDTH / 2 - 54} y={noneY} width={108} height={26} label={`Choose ${noneLabel}`} /> : null}
      {plates.map((plate, fromBottom) => {
        const w = 128;
        const floorH = state.floor ? 18 : 0;
        const room = Math.max(24, pileBottom - pileTop - floorH - 8);
        const h = Math.min(28, Math.max(16, Math.floor(room / Math.max(plates.length, 1))));
        const x = mainCx - w / 2;
        const y = pileBottom - floorH - (fromBottom + 1) * h;
        return (
          <PickTarget
            key={`pp-${fromBottom}`}
            pick={pick}
            index={platePick(state, fromBottom)}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={h * 0.45}
            label={`Choose plate ${plate.label}`}
          />
        );
      })}
      {(state.otherPlates ?? []).map((plate, fromBottom) => {
        const w = 128;
        const room = Math.max(24, pileBottom - pileTop - 8);
        const h = Math.min(28, Math.max(16, Math.floor(room / Math.max(state.otherPlates?.length ?? 1, 1))));
        const x = otherCx - w / 2;
        const y = pileBottom - (fromBottom + 1) * h;
        return (
          <PickTarget
            key={`po-${fromBottom}`}
            pick={pick}
            index={otherPick(state, fromBottom)}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={h * 0.45}
            label={`Choose other plate ${plate.label}`}
          />
        );
      })}
    </Frame>
  );
}
