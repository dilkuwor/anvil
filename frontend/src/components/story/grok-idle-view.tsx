import { Cell, Frame, Label, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** A calendar of task letters with idle slots left by the busiest letter. Draws state only. */

export type GrokIdleSlot = { text: string; idle: boolean; tone: CellTone };

export type GrokIdleState = {
  tasks: string[];
  taskTones: CellTone[];
  slots: GrokIdleSlot[];
  columns: number;
  maxCount: number | null;
  ties: number | null;
  frame: number | null;
  answer: number | null;
  note: string | null;
  trapNote: string | null;
  counter: { label: string; value: string } | null;
  pickOn: "tasks" | "slots";
};

const WIDTH = 560;
const HEIGHT = 248;

export function GrokIdleView({ state, pick }: { state: GrokIdleState; pick?: CellPick }) {
  const taskSize = Math.min(36, (WIDTH - 80) / Math.max(state.tasks.length, 1) - 6);
  const taskX = (WIDTH - (state.tasks.length * (taskSize + 6) - 6)) / 2;
  const columns = Math.max(state.columns, 1);
  const slotSize = Math.min(34, (WIDTH - 100) / columns - 6);
  const gridW = columns * (slotSize + 6) - 6;
  const gridX = (WIDTH - gridW) / 2;
  const gridY = 92;

  const slotPos = (index: number) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    return { x: gridX + col * (slotSize + 6), y: gridY + row * (slotSize + 10) };
  };

  const pickCount = state.pickOn === "tasks" ? state.tasks.length : state.slots.length;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A calendar of tasks with idle slots between repeats">
      {state.counter ? (
        <Label x={16} y={20} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.answer !== null ? (
        <Label x={WIDTH - 16} y={20} size={13} weight={600} tone="teal" anchor="end">
          length: {state.answer}
        </Label>
      ) : state.frame !== null ? (
        <Label x={WIDTH - 16} y={20} size={13} weight={600} tone="teal" anchor="end">
          frame: {state.frame}
        </Label>
      ) : null}

      {state.tasks.map((task, index) => (
        <g key={`t-${index}`}>
          <Cell
            x={taskX + index * (taskSize + 6)}
            y={36}
            size={taskSize}
            value={task}
            tone={pickTone(pick, state.pickOn === "tasks" ? index : -1, state.taskTones[index] ?? "idle")}
          />
          <RejectedMark pick={state.pickOn === "tasks" ? pick : undefined} index={index} x={taskX + index * (taskSize + 6) + taskSize - 8} y={44} />
        </g>
      ))}

      {state.maxCount !== null ? (
        <Label x={16} y={84} size={12} weight={600}>
          busiest {state.maxCount}
          {state.ties !== null ? ` · ties ${state.ties}` : ""}
        </Label>
      ) : (
        <Label x={16} y={84} size={12} weight={600}>
          calendar
        </Label>
      )}

      {state.slots.map((slot, index) => {
        const { x, y } = slotPos(index);
        const tone = pickTone(pick, state.pickOn === "slots" ? index : -1, slot.tone);
        return (
          <g key={`s-${index}`} className={GLIDE}>
            <Cell x={x} y={y} size={slotSize} value={slot.idle ? "·" : slot.text} tone={slot.idle && tone === "idle" ? "miss" : tone} />
            <RejectedMark pick={state.pickOn === "slots" ? pick : undefined} index={index} x={x + slotSize - 8} y={y + 10} />
          </g>
        );
      })}

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

      {Array.from({ length: pickCount }, (_, index) => {
        if (state.pickOn === "tasks") {
          return <PickTarget key={`pick-${index}`} pick={pick} index={index} x={taskX + index * (taskSize + 6) - 3} y={36} width={taskSize + 6} height={taskSize + 8} label={`Choose task ${index}`} />;
        }
        const { x, y } = slotPos(index);
        return <PickTarget key={`pick-${index}`} pick={pick} index={index} x={x - 3} y={y} width={slotSize + 6} height={slotSize + 8} label={`Choose slot ${index}`} />;
      })}
    </Frame>
  );
}
