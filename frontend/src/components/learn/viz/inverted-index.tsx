import { Box, Cell, Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { type VizDefinition, type VizStep } from "./types";

/**
 * An inverted index built from a few short documents, then a two-word AND query
 * answered by intersecting two posting lists. Nothing moves on its own: one document
 * is tokenised per step, one document is merged into the index per step, and the
 * query is answered one lookup at a time.
 */

export type InvertedIndexParams = { docs: string[]; query: string };
export type Posting = { term: string; docs: number[] };
export type InvertedIndexState = {
  /** Tokens per document; null until that document has been tokenised. */
  tokens: (string[] | null)[];
  /** How many documents have been merged into the index so far. */
  indexed: number;
  /** The document id merged in the current step, for the highlight. */
  justAdded: number | null;
  /** Sorted by term. Doc ids inside each list are sorted too. */
  postings: Posting[];
  /** The query after the same normalisation as the documents. */
  queryTerms: string[];
  /** Posting list fetched per query term; null until looked up. */
  lookups: (number[] | null)[];
  /** Doc ids that contain every query term; null until intersected. */
  result: number[] | null;
};

const MAX_DOCS = 4;
const MAX_TOKENS_PER_DOC = 6;
const MAX_DOC_CHARS = 48;

const DEFAULTS: InvertedIndexParams = {
  docs: ["The cat runs in the park", "Dogs love running on the beach", "A quiet park by the beach"],
  query: "running park",
};

const STOP_WORDS = new Set(["the", "a", "an", "in", "on", "at", "to", "of", "is", "and", "by", "for", "with", "it", "this", "that", "are", "was", "or"]);

/** A tiny stemmer, enough for the picture. Real engines use Porter or Snowball. */
export function stem(word: string): string {
  let out = word;
  if (out.length > 5 && out.endsWith("ing")) {
    out = out.slice(0, -3);
    const last = out[out.length - 1];
    if (out.length > 2 && last === out[out.length - 2] && !"aeiou".includes(last)) out = out.slice(0, -1);
  } else if (out.length > 3 && out.endsWith("s") && !out.endsWith("ss") && !out.endsWith("us")) {
    out = out.slice(0, -1);
  }
  return out;
}

/** Lowercase, strip punctuation, drop stop words, stem. Returns null for a dropped word. */
export function normalise(word: string): string | null {
  const clean = word.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!clean || STOP_WORDS.has(clean)) return null;
  return stem(clean);
}

export function tokenise(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\s+/)) {
    const term = normalise(raw);
    if (term) out.push(term);
    if (out.length >= MAX_TOKENS_PER_DOC) break;
  }
  return out;
}

function asDocs(value: unknown): string[] {
  let items: string[] = [];
  if (Array.isArray(value)) items = value.map((item) => String(item).trim());
  else if (typeof value === "string") items = value.split(/[,;|\n]+/).map((item) => item.trim());
  items = items.filter(Boolean).map((item) => item.slice(0, MAX_DOC_CHARS)).slice(0, MAX_DOCS);
  return items.length ? items : [...DEFAULTS.docs];
}

function asQuery(value: unknown): string {
  if (typeof value !== "string") return DEFAULTS.query;
  const words = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const usable = words.filter((word) => normalise(word) !== null);
  return usable.length ? words.join(" ") : DEFAULTS.query;
}

function frame(state: InvertedIndexState, kind: VizStep<InvertedIndexState>["kind"], title: string, explain: string, interview: string): VizStep<InvertedIndexState> {
  return {
    title,
    explain,
    interview,
    kind,
    state: {
      ...state,
      tokens: state.tokens.map((list) => (list ? [...list] : null)),
      postings: state.postings.map((posting) => ({ term: posting.term, docs: [...posting.docs] })),
      queryTerms: [...state.queryTerms],
      lookups: state.lookups.map((list) => (list ? [...list] : null)),
      result: state.result ? [...state.result] : null,
    },
  };
}

function list(ids: number[]): string {
  return ids.length ? `[${ids.join(", ")}]` : "[] (empty)";
}

export function invertedIndexSteps(params: InvertedIndexParams): VizStep<InvertedIndexState>[] {
  const steps: VizStep<InvertedIndexState>[] = [];
  const docs = params.docs.slice(0, MAX_DOCS);
  const queryTerms = params.query
    .split(/\s+/)
    .map((word) => normalise(word))
    .filter((term): term is string => term !== null)
    .slice(0, 2);
  const state: InvertedIndexState = {
    tokens: docs.map(() => null),
    indexed: 0,
    justAdded: null,
    postings: [],
    queryTerms,
    lookups: queryTerms.map(() => null),
    result: null,
  };

  steps.push(
    frame(
      state,
      "setup",
      `${docs.length} documents, query "${params.query}"`,
      `Each document is a short piece of text with an id. The goal is a structure that answers "which documents contain these words" without reading every document.`,
      "Start by naming the problem with LIKE: 'a WHERE body LIKE \"%park%\" scan reads every row and cannot use a B-tree, so it is linear in the table size'. Then say the fix: 'I turn the data inside out, so the key is the word and the value is the list of documents that contain it'.",
    ),
  );

  docs.forEach((doc, i) => {
    const tokens = tokenise(doc);
    state.tokens[i] = tokens;
    const dropped = doc
      .split(/\s+/)
      .filter((word) => normalise(word) === null)
      .map((word) => word.toLowerCase().replace(/[^a-z0-9]/g, ""))
      .filter(Boolean);
    steps.push(
      frame(
        state,
        "decision",
        `Tokenise D${i + 1}: ${tokens.join(" ") || "(no tokens)"}`,
        `Split on spaces, lowercase, drop stop words${dropped.length ? ` (${dropped.join(", ")})` : ""}, and stem so "running" and "runs" both become "run".`,
        "Say that the same analyser must run on documents and on queries: 'if I stem \"running\" to \"run\" at index time, the query \"running\" must stem the same way, or nothing matches'. Mention that stop words and stemming are language-specific choices, not free.",
      ),
    );
  });

  docs.forEach((_, i) => {
    const id = i + 1;
    for (const term of state.tokens[i] ?? []) {
      let posting = state.postings.find((entry) => entry.term === term);
      if (!posting) {
        posting = { term, docs: [] };
        state.postings.push(posting);
        state.postings.sort((a, b) => (a.term < b.term ? -1 : a.term > b.term ? 1 : 0));
      }
      if (!posting.docs.includes(id)) posting.docs.push(id);
    }
    state.indexed = id;
    state.justAdded = id;
    steps.push(
      frame(
        state,
        "invariant",
        `Add D${id} to the index (${state.postings.length} terms)`,
        `Each token of D${id} gets D${id} appended to its posting list. Lists stay sorted by doc id because documents are added in id order.`,
        "State the invariant: 'every posting list is sorted by document id, so I can intersect two lists with two pointers in one pass'. Then the write path: 'a real engine buffers new documents in memory, writes them as an immutable segment, and merges segments in the background'.",
      ),
    );
  });
  state.justAdded = null;

  queryTerms.forEach((term, k) => {
    const posting = state.postings.find((entry) => entry.term === term);
    const ids = posting ? [...posting.docs] : [];
    state.lookups[k] = ids;
    steps.push(
      frame(
        state,
        "decision",
        `Look up "${term}" → ${list(ids)}`,
        posting ? `One dictionary lookup. The posting list for "${term}" is read as a whole; no document text is touched.` : `"${term}" is not in the dictionary, so its posting list is empty. An AND query with this term can return nothing.`,
        "Explain the cost: 'a query touches only the posting lists of its terms, not the documents, so cost is the sum of those list lengths, not the corpus size'. Note that a missing term is a fast empty answer, which is why users see \"no results\" instantly.",
      ),
    );
  });

  const lists = state.lookups.map((ids) => ids ?? []);
  const intersection = lists.length ? lists.reduce((acc, ids) => acc.filter((id) => ids.includes(id))) : [];
  const union = [...new Set(lists.flat())].sort((a, b) => a - b);
  state.result = intersection;
  steps.push(
    frame(
      state,
      "invariant",
      `Intersect → ${list(intersection)}`,
      `Walk both sorted lists together. Keep an id only when it appears in every list. ${lists.length > 1 ? `${list(lists[0])} ∩ ${list(lists[1])} = ${list(intersection)}.` : ""}`,
      "Say how AND is computed: 'two sorted lists, two pointers, advance the smaller id; this is linear in the shorter list if I skip ahead'. Add that OR is a merge of the same lists, and NOT filters one list by another.",
    ),
  );
  steps.push(
    frame(
      state,
      "tradeoff",
      `AND gives ${intersection.length}, OR would give ${union.length}`,
      `AND is the intersection ${list(intersection)}; OR is the union ${list(union)}. Positions would be needed to check a phrase like "${queryTerms.join(" ")}" in that exact order.`,
      "Name the trade-off: 'storing positions in each posting makes phrase and proximity queries possible but roughly doubles the index size; storing only doc ids is smaller but can only answer bag-of-words queries'. Say which one the product needs before choosing.",
    ),
  );
  steps.push(
    frame(
      state,
      "result",
      `Result: ${intersection.length ? intersection.map((id) => `D${id}`).join(", ") : "no documents"}`,
      intersection.length ? `These documents contain every query term. The next stage scores them (TF-IDF or BM25) and returns the top ones.` : `No document contains every query term. A product would fall back to OR, or suggest a spelling fix.`,
      "Close with ranking and scale: 'matching gives a candidate set; BM25 scores each candidate by how rare the term is and how often it appears; at scale the index is sharded by document, every shard answers the query, and a coordinator merges the top-k'.",
    ),
  );
  return steps;
}

function shorten(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function InvertedIndexView({ state, params }: { state: InvertedIndexState; params: InvertedIndexParams }) {
  const width = 560;
  const height = 286;
  const docs = params.docs.slice(0, MAX_DOCS);
  const terms = state.postings;
  const columns = terms.length > 8 ? 2 : 1;
  const rowsPerColumn = Math.ceil(terms.length / columns) || 1;
  const columnWidth = 286 / columns;
  const lookedUp = new Set(state.queryTerms.filter((_, k) => state.lookups[k] !== null));
  const resultSet = new Set(state.result ?? []);
  const cellSize = 18;
  const chipWidth = (term: string) => term.length * 6.6 + 10;
  const queryY = 40 + docs.length * 40;
  const querySeen = state.lookups.some((ids) => ids !== null);

  return (
    <div>
      <Frame width={width} height={height} label="Documents on the left, the inverted index on the right, and a two-word AND query underneath">
        <Label x={12} y={18} weight={600}>
          DOCUMENTS
        </Label>
        {docs.map((doc, i) => {
          const y = 40 + i * 40;
          const tokens = state.tokens[i];
          let x = 40;
          return (
            <g key={i} opacity={state.justAdded !== null && state.justAdded !== i + 1 ? 0.55 : 1}>
              <Label x={12} y={y} tone="ink" weight={700}>
                D{i + 1}
              </Label>
              <Label x={40} y={y} size={10}>
                {shorten(doc, 36)}
              </Label>
              {tokens ? (
                tokens.map((term) => {
                  const w = chipWidth(term);
                  const cx = x;
                  x += w + 4;
                  const isQuery = state.queryTerms.includes(term);
                  return (
                    <g key={`${i}-${term}-${cx}`}>
                      <rect x={cx} y={y + 6} width={w} height={16} rx={4} fill={isQuery ? "color-mix(in srgb, var(--accent) 18%, transparent)" : "transparent"} stroke={isQuery ? VIZ_COLORS.accent : VIZ_COLORS.line} />
                      <text x={cx + w / 2} y={y + 17.5} textAnchor="middle" fontSize={10} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                        {term}
                      </text>
                    </g>
                  );
                })
              ) : (
                <Label x={40} y={y + 17} size={10}>
                  not tokenised yet
                </Label>
              )}
            </g>
          );
        })}

        <Box x={12} y={queryY} width={243} height={height - queryY - 8} title="query" tone={state.result ? "ok" : querySeen ? "active" : "idle"}>
          <Label x={22} y={queryY + 34} tone="ink" weight={600}>
            {state.queryTerms.join("  AND  ") || "(no query terms)"}
          </Label>
          {state.queryTerms.map((term, k) => {
            const y = queryY + 44 + k * 22;
            const ids = state.lookups[k];
            return (
              <g key={term + k}>
                <Label x={22} y={y + 13} size={10}>
                  {term} →
                </Label>
                {ids ? (
                  ids.length ? (
                    ids.map((id, j) => <Cell key={id} x={90 + j * (cellSize + 4)} y={y} size={cellSize} value={id} tone={resultSet.has(id) && state.result ? "done" : "hit"} />)
                  ) : (
                    <Label x={90} y={y + 13} size={10} tone="coral">
                      empty
                    </Label>
                  )
                ) : (
                  <Label x={90} y={y + 13} size={10}>
                    not looked up yet
                  </Label>
                )}
              </g>
            );
          })}
          {state.result ? (
            <g>
              <Label x={22} y={queryY + 44 + state.queryTerms.length * 22 + 13} size={10} tone="teal" weight={600}>
                both →
              </Label>
              {state.result.length ? (
                state.result.map((id, j) => <Cell key={id} x={90 + j * (cellSize + 4)} y={queryY + 44 + state.queryTerms.length * 22} size={cellSize} value={id} tone="done" />)
              ) : (
                <Label x={90} y={queryY + 44 + state.queryTerms.length * 22 + 13} size={10} tone="coral">
                  no match
                </Label>
              )}
            </g>
          ) : null}
        </Box>

        <Label x={270} y={18} weight={600}>
          INVERTED INDEX
        </Label>
        <Label x={372} y={18} size={10}>
          term → doc ids
        </Label>
        {terms.length === 0 ? (
          <Label x={270} y={44} size={10}>
            empty until a document is added
          </Label>
        ) : null}
        {terms.map((posting, n) => {
          const column = Math.floor(n / rowsPerColumn);
          const row = n % rowsPerColumn;
          const x = 270 + column * columnWidth;
          const y = 44 + row * 26;
          const isQuery = state.queryTerms.includes(posting.term);
          const active = isQuery && lookedUp.has(posting.term);
          return (
            <g key={posting.term}>
              <Label x={x} y={y + 13} size={10} tone={active ? "accent" : "ink"} weight={active ? 700 : 500}>
                {shorten(posting.term, 9)}
              </Label>
              {posting.docs.map((id, j) => {
                const tone = active && state.result && resultSet.has(id) ? "done" : active ? "hit" : state.justAdded === id ? "window" : "idle";
                return <Cell key={id} x={x + 64 + j * (cellSize + 3)} y={y} size={cellSize} value={id} tone={tone} />;
              })}
            </g>
          );
        })}
      </Frame>
      <Legend
        items={[
          { tone: "window", label: "just added" },
          { tone: "hit", label: "posting list looked up" },
          { tone: "done", label: "in the AND result" },
        ]}
      />
    </div>
  );
}

export const invertedIndexViz: VizDefinition<InvertedIndexParams, InvertedIndexState> = {
  id: "inverted-index",
  title: "Inverted index and a two-word query",
  summary: "Documents become term → doc-id lists; an AND query is the intersection of two of those lists.",
  fields: [
    { key: "docs", label: "Documents", kind: "text", hint: "Up to four short sentences, separated by commas." },
    { key: "query", label: "Query", kind: "text", hint: "Two words, matched with AND." },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({ docs: asDocs(raw.docs), query: asQuery(raw.query) }),
  steps: invertedIndexSteps,
  View: InvertedIndexView,
};
