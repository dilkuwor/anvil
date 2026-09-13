import type { ComponentType } from "react";

/**
 * A visualizer is a pure step generator plus a view.
 *
 * `steps()` turns parameters into an ordered list of frames. Every frame carries the
 * sentence the candidate should be able to say at that moment: the invariant that holds,
 * the decision being made, or the trade-off being accepted. The view only draws state;
 * it never decides anything, which keeps the teaching content testable without a DOM.
 */

export type StepKind = "setup" | "invariant" | "decision" | "tradeoff" | "result";

export type VizStep<S> = {
  /** Short label for the step list, e.g. "Expand right". */
  title: string;
  /** What just happened, in plain words. */
  explain: string;
  /** What an interviewer expects the candidate to articulate here. */
  interview: string;
  kind: StepKind;
  state: S;
};

export type VizField = {
  key: string;
  label: string;
  kind: "text" | "number" | "select";
  hint?: string;
  options?: { value: string; label: string }[];
};

export type VizDefinition<P extends Record<string, unknown>, S> = {
  id: string;
  title: string;
  /** One line under the title saying what the reader is looking at. */
  summary: string;
  fields: VizField[];
  defaults: P;
  /** Normalizes user-supplied values. Must never throw; fall back to defaults per field. */
  parse: (raw: Record<string, unknown>) => P;
  /** Pure. Same params, same frames. */
  steps: (params: P) => VizStep<S>[];
  View: ComponentType<{ state: S; params: P }>;
  /** Optional deep link into the simulator for system design visuals. */
  simulatorHref?: string;
};

// A definition with its generics erased, for the registry and the player.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyVizDefinition = VizDefinition<any, any>;

export const STEP_KIND_LABEL: Record<StepKind, string> = {
  setup: "Setup",
  invariant: "Invariant",
  decision: "Decision",
  tradeoff: "Trade-off",
  result: "Result",
};

export function asNumberList(value: unknown, fallback: number[]): number[] {
  if (Array.isArray(value)) {
    const items = value.map(Number).filter((item) => Number.isFinite(item));
    return items.length ? items : fallback;
  }
  if (typeof value === "string") {
    const items = value
      .split(/[,\s]+/)
      .filter(Boolean)
      .map(Number)
      .filter((item) => Number.isFinite(item));
    return items.length ? items : fallback;
  }
  return fallback;
}

export function asStringList(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean);
    return items.length ? items : fallback;
  }
  if (typeof value === "string") {
    const items = value
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length ? items : fallback;
  }
  return fallback;
}

export function asNumber(value: unknown, fallback: number, min?: number, max?: number): number {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(number)) return fallback;
  let result = number;
  if (min !== undefined) result = Math.max(min, result);
  if (max !== undefined) result = Math.min(max, result);
  return result;
}

export function asChoice<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : fallback;
}
