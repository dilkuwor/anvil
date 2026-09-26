import { Cell, Frame, Label, Legend, type CellTone } from "./primitives";
import { asNumber, asStringList, type VizDefinition, type VizStep } from "./types";

/** A Bloom filter: a bit array plus k hashes, showing "definitely not" versus "probably yes" and one false positive. */

export type BloomFilterParams = { bits: number; hashes: number; inserts: string[]; queries: string[] };

export type BloomVerdict = "absent" | "present" | "false-positive";

export type BloomFilterState = {
  /** 0 or 1 per slot. */
  bits: number[];
  /** Which inserted items set each slot; empty when the slot is still 0. */
  owners: string[][];
  phase: "setup" | "insert" | "query" | "result";
  /** The item being inserted or queried on this frame. */
  current: string | null;
  /** The slots the current item hashes to. */
  indexes: number[];
  verdict: BloomVerdict | null;
  inserted: string[];
  results: { item: string; verdict: BloomVerdict }[];
};

const DEFAULTS: BloomFilterParams = { bits: 16, hashes: 3, inserts: ["red", "green", "blue"], queries: ["fig", "red", "pear"] };

/** FNV-1a style 32-bit hash with a per-function seed, then a final mix. Pure, so frames are reproducible. */
export function bloomHash(item: string, seed: number): number {
  let h = (0x811c9dc5 ^ Math.imul(seed + 1, 0x9e3779b1)) >>> 0;
  for (let i = 0; i < item.length; i += 1) {
    h ^= item.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

export function bloomIndexes(item: string, hashes: number, bits: number): number[] {
  return Array.from({ length: hashes }, (_, seed) => bloomHash(item, seed) % bits);
}

function frame(state: BloomFilterState, kind: VizStep<BloomFilterState>["kind"], title: string, explain: string, interview: string): VizStep<BloomFilterState> {
  return {
    title,
    explain,
    interview,
    kind,
    state: { ...state, bits: [...state.bits], owners: state.owners.map((list) => [...list]), indexes: [...state.indexes], inserted: [...state.inserted], results: state.results.map((entry) => ({ ...entry })) },
  };
}

function list(values: number[]): string {
  return values.join(", ");
}

export function bloomFilterSteps(params: BloomFilterParams): VizStep<BloomFilterState>[] {
  const { bits: m, hashes: k } = params;
  const steps: VizStep<BloomFilterState>[] = [];
  const state: BloomFilterState = {
    bits: new Array(m).fill(0),
    owners: Array.from({ length: m }, () => []),
    phase: "setup",
    current: null,
    indexes: [],
    verdict: null,
    inserted: [],
    results: [],
  };

  steps.push(
    frame(
      state,
      "setup",
      `${m} bits, all zero, ${k} hash functions`,
      `The filter is just ${m} bits and ${k} hash functions. Nothing is stored yet. No item names, no keys: only bits.`,
      `Open with the shape: 'a Bloom filter is a bit array of m bits and k hash functions. Insert sets k bits; lookup checks k bits. It never stores the items, which is why it is so small, and why it can be wrong in exactly one direction.'`,
    ),
  );

  for (const item of params.inserts) {
    const indexes = bloomIndexes(item, k, m);
    state.phase = "insert";
    state.current = item;
    state.indexes = indexes;
    state.verdict = null;
    const alreadySet = indexes.filter((index) => state.bits[index] === 1);
    for (const index of indexes) {
      state.bits[index] = 1;
      if (!state.owners[index].includes(item)) state.owners[index].push(item);
    }
    state.inserted.push(item);
    const unique = new Set(indexes).size;
    steps.push(
      frame(
        state,
        "invariant",
        `Insert "${item}" → bits ${list(indexes)}`,
        `Hash "${item}" ${k} times. Each hash picks one slot. Set those slots to 1.${alreadySet.length ? ` Slot${alreadySet.length > 1 ? "s" : ""} ${list(alreadySet)} ${alreadySet.length > 1 ? "were" : "was"} already 1 from an earlier item; bits are shared, never owned.` : ""}${unique < k ? ` Two hashes landed on the same slot, which is allowed.` : ""}`,
        `Say the invariant: 'after an insert, every one of the item's k bits is 1, and that stays true forever because bits are only ever set, never cleared. That is what makes "no" a guarantee.' Then note the cost: 'inserting is O(k) and touches no memory but the bits.'`,
      ),
    );
  }

  for (const item of params.queries) {
    const indexes = bloomIndexes(item, k, m);
    state.phase = "query";
    state.current = item;
    state.indexes = indexes;
    const zeros = indexes.filter((index) => state.bits[index] === 0);
    let verdict: BloomVerdict;
    if (zeros.length) verdict = "absent";
    else if (state.inserted.includes(item)) verdict = "present";
    else verdict = "false-positive";
    state.verdict = verdict;
    state.results.push({ item, verdict });

    if (verdict === "absent") {
      steps.push(
        frame(
          state,
          "invariant",
          `Query "${item}": bit ${zeros[0]} is 0 → definitely not`,
          `Hash "${item}" to slots ${list(indexes)}. Slot ${zeros[0]} is still 0. If "${item}" had been inserted, that bit would be 1. So it was never inserted. No guess involved.`,
          `State the guarantee: 'a Bloom filter has no false negatives. If any of the k bits is 0, the item was never added, full stop.' This is the direction the whole design relies on: it can safely skip the expensive lookup.`,
        ),
      );
    } else if (verdict === "present") {
      steps.push(
        frame(
          state,
          "decision",
          `Query "${item}": all bits 1 → probably yes`,
          `Slots ${list(indexes)} are all 1. The filter answers "probably yes". Here it is right: "${item}" was inserted earlier. But the filter itself cannot tell that; it only sees bits.`,
          `Be precise with the wording: 'all k bits set means "probably present", not "present". The caller must now do the real lookup to confirm.' Interviewers listen for whether you say "probably".`,
        ),
      );
    } else {
      const setters = [...new Set(indexes.flatMap((index) => state.owners[index]))];
      steps.push(
        frame(
          state,
          "tradeoff",
          `Query "${item}": all bits 1, but it was never inserted`,
          `Slots ${list(indexes)} are all 1, so the filter says "probably yes". But "${item}" was never added. Those bits were set by ${setters.map((name) => `"${name}"`).join(" and ")}. This is a false positive.`,
          `Name it and price it: 'this is a false positive. It costs one wasted real lookup, nothing more. The rate is tuned by m and k: about 10 bits per item with 7 hashes gives roughly 1%.' Then the trade: 'I accept a small rate of wasted lookups to avoid storing every key.'`,
        ),
      );
    }
  }

  state.phase = "result";
  state.current = null;
  state.indexes = [];
  state.verdict = null;
  const setCount = state.bits.filter((bit) => bit === 1).length;
  const falsePositives = state.results.filter((entry) => entry.verdict === "false-positive").length;
  const absent = state.results.filter((entry) => entry.verdict === "absent").length;
  const n = state.inserted.length;
  const rate = Math.pow(1 - Math.exp((-k * n) / m), k);
  steps.push(
    frame(
      state,
      "result",
      `${setCount} of ${m} bits set; ${falsePositives} false positive${falsePositives === 1 ? "" : "s"} in ${state.results.length} queries`,
      `${n} item${n === 1 ? "" : "s"} used ${setCount} bits. ${absent} quer${absent === 1 ? "y" : "ies"} got a certain "no". With ${m} bits, ${k} hashes and ${n} items, the expected false-positive rate is about ${(rate * 100).toFixed(0)}%. More bits per item lowers it; more items raises it.`,
      `Close with sizing and limits: 'false-positive rate is about (1 − e^(−kn/m))^k, so I pick m from the item count and the rate I can afford. It cannot delete, because clearing a bit could break another item; if I need deletes I use a counting Bloom filter. And I never use it where a wrong "yes" costs money.'`,
    ),
  );

  return steps;
}

function toneFor(state: BloomFilterState, index: number): CellTone {
  const bit = state.bits[index];
  const probed = state.indexes.includes(index);
  if (state.phase === "insert" && probed) return "edge";
  if (state.phase === "query" && probed) {
    if (bit === 0) return "miss";
    return state.verdict === "false-positive" ? "miss" : "hit";
  }
  return bit === 1 ? "done" : "idle";
}

export function BloomFilterView({ state, params }: { state: BloomFilterState; params: BloomFilterParams }) {
  const m = params.bits;
  const size = m > 24 ? 22 : 30;
  const gap = m > 24 ? 4 : 6;
  const perRow = Math.min(m, 16);
  const rows = Math.ceil(m / perRow);
  const left = 20;
  const top = 44;
  const rowHeight = size + 26;
  const width = Math.max(360, left * 2 + perRow * (size + gap) - gap);
  const height = top + rows * rowHeight + 34;
  const headline =
    state.phase === "setup"
      ? "empty filter"
      : state.phase === "result"
        ? `${state.inserted.length} inserted: ${state.inserted.join(", ")}`
        : `${state.phase === "insert" ? "insert" : "query"} "${state.current}" → hash to ${state.indexes.join(", ")}`;
  const verdictLabel = state.verdict === "absent" ? "definitely not" : state.verdict === "present" ? "probably yes (true)" : state.verdict === "false-positive" ? "probably yes (false positive)" : null;
  const verdictTone = state.verdict === "absent" ? "coral" : state.verdict === "present" ? "teal" : state.verdict === "false-positive" ? "coral" : "muted";

  return (
    <div>
      <Frame width={width} height={height} label="Bloom filter bit array">
        <Label x={left} y={20} tone="ink" weight={600} size={12}>
          {headline}
        </Label>
        {verdictLabel ? (
          <Label x={width - left} y={20} anchor="end" tone={verdictTone} weight={600} size={12}>
            {verdictLabel}
          </Label>
        ) : null}
        {state.bits.map((bit, index) => {
          const row = Math.floor(index / perRow);
          const column = index % perRow;
          return <Cell key={index} x={left + column * (size + gap)} y={top + row * rowHeight} size={size} value={bit} tone={toneFor(state, index)} caption={String(index)} />;
        })}
        <Label x={left} y={height - 10}>
          {m} bits, {params.hashes} hashes, {state.inserted.length} items inserted
        </Label>
      </Frame>
      <Legend
        items={[
          { tone: "done", label: "bit set" },
          { tone: "edge", label: "being set" },
          { tone: "hit", label: "checked, is 1" },
          { tone: "miss", label: "checked, 0 or false positive" },
        ]}
      />
    </div>
  );
}

export const bloomFilterViz: VizDefinition<BloomFilterParams, BloomFilterState> = {
  id: "bloom-filter",
  title: "Bloom filter: definitely not, or probably yes",
  summary: "k hashes light bits on insert; a 0 bit on lookup is a certain no; all 1s is only a probable yes.",
  fields: [
    { key: "bits", label: "Bit array size", kind: "number", hint: "4 to 64." },
    { key: "hashes", label: "Hash functions", kind: "number", hint: "1 to 6." },
    { key: "inserts", label: "Items to insert", kind: "text", hint: "Comma-separated words." },
    { key: "queries", label: "Items to query", kind: "text", hint: "Comma-separated words." },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({
    bits: Math.round(asNumber(raw.bits, DEFAULTS.bits, 4, 64)),
    hashes: Math.round(asNumber(raw.hashes, DEFAULTS.hashes, 1, 6)),
    inserts: asStringList(raw.inserts, DEFAULTS.inserts).slice(0, 8),
    queries: asStringList(raw.queries, DEFAULTS.queries).slice(0, 8),
  }),
  steps: bloomFilterSteps,
  View: BloomFilterView,
};
