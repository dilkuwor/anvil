import { Box, Cell, Frame, Label, Legend, VIZ_COLORS, type CellTone } from "./primitives";
import { asNumber, asStringList, type VizDefinition, type VizStep } from "./types";

/**
 * Log-structured storage (the engine under Cassandra, RocksDB, LevelDB). Every write is
 * appended to a commit log and put in a sorted in-memory table; a full memtable is flushed
 * to an immutable sorted file on disk; a read checks memory first, then the files newest
 * first, skipping any file whose Bloom filter says "not here"; compaction merges files
 * and drops old versions. Three lanes, one change per step.
 *
 *   :::viz lsm-tree {"writes": ["a=1", "b=2", "c=3", "a=4", "d=5", "e=6"], "memtableSize": 3, "read": "b"}
 */

export type LsmParams = { writes: string[]; memtableSize: number; read: string };

export type LsmRow = { key: string; value: string };
export type LsmLogEntry = LsmRow & { flushed: boolean };
export type LsmTable = { id: number; rows: LsmRow[]; bloom: string[] };

export type LsmRead = {
  key: string;
  /** Which place is being looked at right now. */
  at: "memtable" | number | null;
  skipped: number[];
  found: { value: string; where: "memtable" | number } | null;
  done: boolean;
};

export type LsmState = {
  log: LsmLogEntry[];
  memtable: LsmRow[];
  tables: LsmTable[]; // oldest first
  focus: "log" | "memtable" | "flush" | "read" | "compact" | null;
  write: LsmRow | null;
  read: LsmRead | null;
  dropped: LsmRow[];
};

const DEFAULTS: LsmParams = { writes: ["a=1", "b=2", "c=3", "a=4", "d=5", "e=6"], memtableSize: 3, read: "b" };

export function parseWrite(raw: string): LsmRow {
  const [key, ...rest] = raw.split("=");
  const k = (key ?? "").trim().slice(0, 3) || "k";
  const v = rest.join("=").trim().slice(0, 3) || "1";
  return { key: k, value: v };
}

function sortRows(rows: LsmRow[]): LsmRow[] {
  return [...rows].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

function frame(state: LsmState, kind: VizStep<LsmState>["kind"], title: string, explain: string, interview: string): VizStep<LsmState> {
  return {
    title,
    explain,
    interview,
    kind,
    state: {
      ...state,
      log: state.log.map((entry) => ({ ...entry })),
      memtable: state.memtable.map((row) => ({ ...row })),
      tables: state.tables.map((table) => ({ ...table, rows: table.rows.map((row) => ({ ...row })), bloom: [...table.bloom] })),
      write: state.write ? { ...state.write } : null,
      read: state.read ? { ...state.read, skipped: [...state.read.skipped], found: state.read.found ? { ...state.read.found } : null } : null,
      dropped: state.dropped.map((row) => ({ ...row })),
    },
  };
}

export function lsmTreeSteps(params: LsmParams): VizStep<LsmState>[] {
  const steps: VizStep<LsmState>[] = [];
  const state: LsmState = { log: [], memtable: [], tables: [], focus: null, write: null, read: null, dropped: [] };
  let nextId = 1;

  steps.push(
    frame(
      state,
      "setup",
      "Three places a value can live",
      `Top: the commit log on disk, append-only. Middle: the memtable in memory, kept sorted, holding at most ${params.memtableSize} keys. Bottom: SSTables on disk, sorted and never edited. Everything starts empty.`,
      "Open with the one-line idea: an LSM engine never updates a value in place; it appends the new version and cleans up later. Then say what that buys, sequential writes that are very fast, and what it costs, reads that may look in several files and background compaction.",
    ),
  );

  for (const raw of params.writes) {
    const row = parseWrite(raw);
    state.write = row;
    state.log = [...state.log, { ...row, flushed: false }];
    const previous = state.memtable.find((item) => item.key === row.key);
    state.memtable = sortRows([...state.memtable.filter((item) => item.key !== row.key), row]);
    state.focus = "memtable";
    steps.push(
      frame(
        state,
        "invariant",
        `Write ${row.key}=${row.value}`,
        `First append ${row.key}=${row.value} to the commit log, so it survives a crash. Then put it in the memtable, which stays sorted by key${previous ? ` and replaces the older ${row.key}=${previous.value}` : ""}. Nothing on disk was rewritten.`,
        "Say the write path out loud: append to the log, then insert into a sorted in-memory structure. Both are cheap, the log is sequential and the memtable is a small red-black tree or skip list, so writes never wait for a disk seek. The log exists only for crash recovery.",
      ),
    );

    if (state.memtable.length >= params.memtableSize) {
      const table: LsmTable = { id: nextId, rows: sortRows(state.memtable), bloom: state.memtable.map((item) => item.key) };
      nextId += 1;
      state.tables = [...state.tables, table];
      state.memtable = [];
      state.log = state.log.map((entry) => ({ ...entry, flushed: true }));
      state.focus = "flush";
      state.write = null;
      steps.push(
        frame(
          state,
          "decision",
          `Memtable full: flush to SSTable ${table.id}`,
          `The memtable holds ${params.memtableSize} keys, so it is written to disk in one sequential pass as SSTable ${table.id}: ${table.rows.map((item) => `${item.key}=${item.value}`).join(", ")}. The file is sorted and will never change. The log entries it covers can now be discarded.`,
          "Say that a flush is one sequential write of an already-sorted file, which is why LSM engines take writes so fast. Add that the file gets a Bloom filter of its keys, so a later read can skip it without opening it. And say that a fresh, empty memtable takes writes while the flush runs.",
        ),
      );
    }
  }

  const key = params.read.trim().slice(0, 3);
  if (key) {
    const read: LsmRead = { key, at: "memtable", skipped: [], found: null, done: false };
    state.read = read;
    state.focus = "read";
    state.write = null;
    const inMemory = state.memtable.find((item) => item.key === key);
    if (inMemory) {
      read.found = { value: inMemory.value, where: "memtable" };
      read.done = true;
      steps.push(
        frame(
          state,
          "invariant",
          `Read ${key}: found in the memtable`,
          `The newest version of any key is always the first one found, and the memtable is the newest place. ${key}=${inMemory.value} is there, so the read touches no file at all.`,
          "Say the read order: memtable first, then SSTables from newest to oldest, and stop at the first match. That order is what makes the latest write win without ever rewriting old files.",
        ),
      );
    } else {
      steps.push(
        frame(
          state,
          "decision",
          `Read ${key}: not in the memtable`,
          `The memtable is checked first because it holds the newest writes. ${key} is not there, so the read moves to the SSTables on disk, newest first.`,
          "Say that a read may have to look in several places, which is the price of never updating in place. Then say the two things that keep it cheap: check newest first and stop at the first hit, and use a Bloom filter per file to avoid opening files that cannot contain the key.",
        ),
      );
      for (let index = state.tables.length - 1; index >= 0; index -= 1) {
        const table = state.tables[index];
        read.at = table.id;
        if (!table.bloom.includes(key)) {
          read.skipped = [...read.skipped, table.id];
          steps.push(
            frame(
              state,
              "invariant",
              `Bloom filter: ${key} is not in SSTable ${table.id}`,
              `SSTable ${table.id} has a small Bloom filter of its keys. It says ${key} is definitely not there, so the file is skipped without reading it from disk.`,
              "Say what a Bloom filter promises: a 'no' is certain, a 'yes' is only probable. So it can never hide a key that exists; at worst it makes you open one file for nothing. That is why every SSTable carries one.",
            ),
          );
          continue;
        }
        // The filter here is exact, so "maybe" always means the key is in the file.
        const hit = table.rows.find((item) => item.key === key);
        if (!hit) continue;
        read.found = { value: hit.value, where: table.id };
        read.done = true;
        steps.push(
          frame(
            state,
            "invariant",
            `Read ${key}: found ${key}=${hit.value} in SSTable ${table.id}`,
            `The Bloom filter says ${key} may be here, and it is. SSTable ${table.id} is sorted, so a binary search or a sparse index finds ${key} in a few page reads. The read stops here; older files are not opened.`,
            "Say that a sorted file is what makes the lookup cheap: a small index in memory points to the block, and one block read finishes it. And say that stopping at the newest match is the rule that keeps old versions from being served.",
          ),
        );
        break;
      }
      if (!read.found) {
        read.at = null;
        read.done = true;
        steps.push(
          frame(
            state,
            "tradeoff",
            `Read ${key}: not found anywhere`,
            `The memtable and every SSTable were checked, and ${key} was never written. A read for a missing key is the worst case: it visits every place a value could be.`,
            "Say that a miss is the most expensive read in an LSM engine because nothing lets it stop early, and that Bloom filters exist mostly for this case, they turn most of those file visits into a cheap 'no'.",
          ),
        );
      }
    }
  }

  if (state.tables.length >= 2) {
    const [older, newer] = state.tables.slice(0, 2);
    const merged = new Map<string, LsmRow>();
    const dropped: LsmRow[] = [];
    for (const row of older.rows) merged.set(row.key, row);
    for (const row of newer.rows) {
      const old = merged.get(row.key);
      if (old) dropped.push(old);
      merged.set(row.key, row);
    }
    const compacted: LsmTable = { id: nextId, rows: sortRows([...merged.values()]), bloom: [...merged.keys()].sort() };
    nextId += 1;
    state.tables = [compacted, ...state.tables.slice(2)];
    state.dropped = dropped;
    state.read = state.read ? { ...state.read, at: null } : null;
    state.focus = "compact";
    steps.push(
      frame(
        state,
        "tradeoff",
        `Compaction: merge SSTable ${older.id} + ${newer.id} into ${compacted.id}`,
        `In the background, the two sorted files are merged into one sorted file. Where a key appears in both, the newer value wins${dropped.length ? `: ${dropped.map((row) => `${row.key}=${row.value}`).join(", ")} ${dropped.length === 1 ? "is" : "are"} dropped` : ""}. Reads now have one file to check instead of two.`,
        "Say what compaction is for: fewer files to read and space back from old versions, and what it costs: disk I/O and CPU in the background, which is where LSM latency spikes come from. Then name the knob: leveled compaction for read-heavy, size-tiered for write-heavy.",
      ),
    );
  }

  state.focus = null;
  state.write = null;
  const files = state.tables.length;
  const readSummary = state.read
    ? state.read.found
      ? `The read of ${state.read.key} found ${state.read.key}=${state.read.found.value} ${state.read.found.where === "memtable" ? "in memory" : `in SSTable ${state.read.found.where}`}${state.read.skipped.length ? ` after skipping ${state.read.skipped.length} file${state.read.skipped.length === 1 ? "" : "s"} by Bloom filter` : ""}.`
      : `The read of ${state.read.key} checked everything and found nothing.`
    : "";
  steps.push(
    frame(
      state,
      "result",
      `${params.writes.length} writes, all sequential; ${files} file${files === 1 ? "" : "s"} on disk`,
      `Every write was an append plus an in-memory insert; disk was only ever written in sorted, sequential passes. ${readSummary}${state.dropped.length ? ` Compaction dropped ${state.dropped.length} old version${state.dropped.length === 1 ? "" : "s"}.` : ""}`,
      "Close with the sentence from the lesson: write-heavy workloads lean LSM, read-heavy and range-query workloads lean B-tree. Then give the two follow-ups before they are asked: reads cost more because they may touch several files, and compaction can cause tail-latency spikes, so you watch the number of files per read and the compaction backlog.",
    ),
  );
  return steps;
}

const WIDTH = 520;
const LANE_X = 16;
const LANE_W = WIDTH - 32;
const LANE_H = 84;
const GAP = 8;
const CELL = 40;
const CELL_GAP = 6;

function rowLabel(row: LsmRow): string {
  return `${row.key}=${row.value}`;
}

export function LsmTreeView({ state, params }: { state: LsmState; params: LsmParams }) {
  const height = 16 + LANE_H * 3 + GAP * 2 + 8;
  const logY = 12;
  const memY = logY + LANE_H + GAP;
  const diskY = memY + LANE_H + GAP;
  const cellY = (laneY: number) => laneY + 26;
  const readKey = state.read?.key ?? null;
  const readAt = state.read?.at ?? null;

  const logTone: "idle" | "active" | "hot" | "ok" = state.focus === "memtable" ? "active" : "idle";
  const memTone: "idle" | "active" | "hot" | "ok" = state.focus === "memtable" ? "active" : state.focus === "flush" ? "hot" : readAt === "memtable" ? (state.read?.found?.where === "memtable" ? "ok" : "hot") : "idle";
  const diskTone: "idle" | "active" | "hot" | "ok" = state.focus === "flush" || state.focus === "compact" ? "active" : typeof readAt === "number" ? "active" : "idle";

  const droppedKeys = new Set(state.dropped.map(rowLabel));

  return (
    <div>
      <Frame width={WIDTH} height={height} label="Commit log, memtable, and SSTables">
        <Box x={LANE_X} y={logY} width={LANE_W} height={LANE_H} title="Commit log · disk · append-only" tone={logTone}>
          {state.log.length ? (
            state.log.map((entry, index) => {
              const isNew = state.write !== null && index === state.log.length - 1;
              const tone: CellTone = isNew ? "edge" : entry.flushed ? "faded" : "idle";
              return <Cell key={`${index}-${entry.key}`} x={LANE_X + 10 + index * (CELL + CELL_GAP)} y={cellY(logY)} size={CELL} value={rowLabel(entry)} tone={tone} />;
            })
          ) : (
            <text x={LANE_X + 10} y={cellY(logY) + 24} fontSize={11} fill={VIZ_COLORS.muted}>
              empty
            </text>
          )}
          {state.log.some((entry) => entry.flushed) ? (
            <text x={LANE_X + LANE_W - 10} y={logY + 17} textAnchor="end" fontSize={10} fill={VIZ_COLORS.muted}>
              faded = flushed, can be discarded
            </text>
          ) : null}
        </Box>

        <Box x={LANE_X} y={memY} width={LANE_W} height={LANE_H} title={`Memtable · memory · sorted · max ${params.memtableSize}`} tone={memTone}>
          {state.memtable.length ? (
            state.memtable.map((row, index) => {
              const isNew = state.write !== null && row.key === state.write.key;
              const isRead = readAt === "memtable" && row.key === readKey;
              const tone: CellTone = isRead ? "hit" : isNew ? "edge" : "idle";
              return <Cell key={row.key} x={LANE_X + 10 + index * (CELL + CELL_GAP)} y={cellY(memY)} size={CELL} value={rowLabel(row)} tone={tone} />;
            })
          ) : (
            <text x={LANE_X + 10} y={cellY(memY) + 24} fontSize={11} fill={state.focus === "flush" ? VIZ_COLORS.coral : readAt === "memtable" ? VIZ_COLORS.coral : VIZ_COLORS.muted}>
              {state.focus === "flush" ? "flushed to disk, now empty" : readAt === "memtable" && readKey ? `${readKey} not here, check disk` : "empty"}
            </text>
          )}
        </Box>

        <Box x={LANE_X} y={diskY} width={LANE_W} height={LANE_H} title="SSTables · disk · sorted · immutable" tone={diskTone}>
          {state.tables.length ? (
            (() => {
              let cursor = LANE_X + 10;
              return state.tables.map((table) => {
                const x = cursor;
                const width = table.rows.length * (CELL + CELL_GAP) - CELL_GAP;
                cursor += width + 22;
                const checking = readAt === table.id;
                const skipped = state.read?.skipped.includes(table.id) ?? false;
                const foundHere = state.read?.found?.where === table.id;
                const isNewest = state.focus === "flush" && table.id === state.tables[state.tables.length - 1].id;
                const isCompacted = state.focus === "compact" && table.id === state.tables[0].id;
                const headerColor = skipped ? VIZ_COLORS.coral : foundHere ? VIZ_COLORS.teal : checking || isNewest || isCompacted ? VIZ_COLORS.accent : VIZ_COLORS.muted;
                return (
                  <g key={table.id}>
                    <text x={x} y={diskY + 17} fontSize={10} fontWeight={600} fill={headerColor}>
                      {`SST ${table.id}`}
                      {skipped ? " · bloom: no, skipped" : checking && !foundHere ? " · bloom: maybe" : ""}
                    </text>
                    {table.rows.map((row, index) => {
                      const label = rowLabel(row);
                      const isFound = foundHere && row.key === readKey;
                      const tone: CellTone = skipped ? "faded" : isFound ? "hit" : isNewest || isCompacted ? "edge" : "idle";
                      return <Cell key={label} x={x + index * (CELL + CELL_GAP)} y={cellY(diskY)} size={CELL} value={label} tone={tone} />;
                    })}
                  </g>
                );
              });
            })()
          ) : (
            <text x={LANE_X + 10} y={cellY(diskY) + 24} fontSize={11} fill={VIZ_COLORS.muted}>
              no files yet
            </text>
          )}
          {state.dropped.length ? (
            <text x={LANE_X + LANE_W - 10} y={diskY + 17} textAnchor="end" fontSize={10} fill={VIZ_COLORS.coral}>
              dropped {[...droppedKeys].join(", ")}
            </text>
          ) : null}
        </Box>

        <Label x={LANE_X} y={height - 4} tone="ink" weight={600}>
          {state.write ? `write ${rowLabel(state.write)}` : state.read && !state.read.done ? `read ${state.read.key}…` : state.read?.found ? `read ${state.read.key} → ${state.read.found.value}` : state.read ? `read ${state.read.key} → not found` : "log → memtable → SSTables"}
        </Label>
      </Frame>
      <Legend items={[{ tone: "accent", label: "just written / flushed" }, { tone: "teal", label: "read found here" }, { tone: "coral", label: "skipped or dropped" }]} />
    </div>
  );
}

export const lsmTreeViz: VizDefinition<LsmParams, LsmState> = {
  id: "lsm-tree",
  title: "LSM tree: append now, tidy later",
  summary: "Writes go to a log and a sorted memtable, get flushed to immutable files, and compaction merges the files. A read checks newest first.",
  fields: [
    { key: "writes", label: "Writes", kind: "text", hint: "key=value, comma-separated. Write the same key twice to see the old version dropped." },
    { key: "memtableSize", label: "Memtable size", kind: "number", hint: "Keys held in memory before a flush." },
    { key: "read", label: "Then read key", kind: "text", hint: "A key that only lives in an older file shows the Bloom filter skip." },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({
    writes: asStringList(raw.writes, DEFAULTS.writes).slice(0, 9),
    memtableSize: asNumber(raw.memtableSize, DEFAULTS.memtableSize, 2, 4),
    read: typeof raw.read === "string" ? raw.read.trim().slice(0, 3) : DEFAULTS.read,
  }),
  steps: lsmTreeSteps,
  View: LsmTreeView,
};
