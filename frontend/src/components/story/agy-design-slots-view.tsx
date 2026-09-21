import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Visual for system design data structures:
 * Hash maps, random sets, hit counters, freq stacks, time maps, twitter.
 * Draws key-value slots, bucket chains, operations, and state notes.
 * Respects reduced motion and uses shared click targets.
 */

export type DesignSlot = {
  id: string | number;
  key: string;
  val: string;
  sub?: string;
  tone?: CellTone;
};

export type DesignBucket = {
  id: string | number;
  label: string;
  items: { text: string; tone?: CellTone }[];
  tone?: CellTone;
};

export type DesignSlotsState = {
  slots?: DesignSlot[];
  buckets?: DesignBucket[];
  activeOp?: string | null;
  counter?: { label: string; value: string | number } | null;
  status?: { text: string; tone: "accent" | "coral" | "teal" } | null;
  note?: { text: string; tone: "accent" | "coral" | "teal" } | null;
};

const WIDTH = 560;
const HEIGHT = 248;
const GAP = 8;

export function AgyDesignSlotsView({
  state,
  pick,
}: {
  state: DesignSlotsState;
  pick?: CellPick;
}) {
  const slots = state.slots ?? [];
  const slotCount = Math.max(slots.length, 1);
  const slotSize = Math.min(64, Math.floor((WIDTH - 48) / slotCount - GAP));
  const slotStartX = (WIDTH - (slotCount * (slotSize + GAP) - GAP)) / 2;
  const slotX = (index: number) => slotStartX + index * (slotSize + GAP);

  const buckets = state.buckets ?? [];
  const bucketCount = Math.max(buckets.length, 1);
  const bucketW = Math.min(160, Math.floor((WIDTH - 40) / bucketCount - 10));
  const bucketStartX = (WIDTH - (bucketCount * (bucketW + 10) - 10)) / 2;
  const bucketX = (index: number) => bucketStartX + index * (bucketW + 10);
  const bucketY = slots.length > 0 ? 122 : 54;
  const bucketH = slots.length > 0 ? 70 : 130;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Design data structure state with key-value slots and buckets">
      {state.counter ? (
        <Label
          x={16}
          y={20}
          size={13}
          weight={600}
          tone={state.counter.label.toLowerCase().includes("trap") ? "coral" : "teal"}
        >
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}

      {state.activeOp ? (
        <Label x={WIDTH / 2} y={20} size={13} weight={700} tone="accent" anchor="middle">
          {state.activeOp}
        </Label>
      ) : null}

      {state.status ? (
        <Label x={WIDTH - 16} y={20} size={13} weight={600} tone={state.status.tone} anchor="end">
          {state.status.text}
        </Label>
      ) : null}

      {/* Slots row */}
      {slots.map((slot, index) => {
        const x = slotX(index);
        const y = 40;
        const tone = pickTone(pick, index, slot.tone ?? "idle");
        return (
          <g key={`slot-${index}`}>
            <Cell x={x} y={y} size={slotSize} value={slot.val} tone={tone} />
            <text
              x={x + slotSize / 2}
              y={y + slotSize + 13}
              fontSize={10}
              fontWeight={600}
              fill={VIZ_COLORS.ink}
              textAnchor="middle"
            >
              {slot.key}
            </text>
            {slot.sub ? (
              <text
                x={x + slotSize / 2}
                y={y + slotSize + 25}
                fontSize={9}
                fill={VIZ_COLORS.muted}
                textAnchor="middle"
              >
                {slot.sub}
              </text>
            ) : null}
            <RejectedMark pick={pick} index={index} x={x + slotSize - 6} y={y + 8} />
          </g>
        );
      })}

      {/* Buckets row */}
      {buckets.map((b, index) => {
        const bx = bucketX(index);
        const isCoral = b.tone === "miss";
        const strokeColor = isCoral ? VIZ_COLORS.coral : VIZ_COLORS.teal;
        const fillColor = isCoral
          ? "color-mix(in srgb, var(--coral) 12%, transparent)"
          : "color-mix(in srgb, var(--teal) 10%, transparent)";

        return (
          <g key={`bucket-${index}`} className={GLIDE}>
            <rect
              x={bx}
              y={bucketY}
              width={bucketW}
              height={bucketH}
              rx={8}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={1.5}
            />
            <text
              x={bx + 8}
              y={bucketY + 16}
              fontSize={11}
              fontWeight={600}
              fill={isCoral ? VIZ_COLORS.coral : VIZ_COLORS.teal}
            >
              {b.label}
            </text>
            {b.items.map((item, itemIdx) => (
              <text
                key={`item-${itemIdx}`}
                x={bx + 8}
                y={bucketY + 34 + itemIdx * 16}
                fontSize={10}
                fill={VIZ_COLORS.ink}
              >
                {item.text}
              </text>
            ))}
          </g>
        );
      })}

      {/* Bottom note */}
      {state.note ? (
        <Label
          x={WIDTH / 2}
          y={HEIGHT - 12}
          size={12}
          weight={600}
          tone={state.note.tone}
          anchor="middle"
        >
          {state.note.text}
        </Label>
      ) : null}

      {/* Interactive pick targets */}
      {slots.map((slot, index) => (
        <PickTarget
          key={`pick-${index}`}
          pick={pick}
          index={index}
          x={slotX(index) - 2}
          y={38}
          width={slotSize + 4}
          height={slotSize + 4}
          label={`Select slot ${slot.key}`}
        />
      ))}
    </Frame>
  );
}
