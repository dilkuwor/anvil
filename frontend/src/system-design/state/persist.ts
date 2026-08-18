import { getKind } from "../components/registry";
import { DEFAULT_SLO, DEFAULT_WORKLOAD } from "../models/workload";
import type { Difficulty, SimulationResult, SystemDesign } from "../models/types";
import { uid } from "../utils/ids";

const DESIGNS_KEY = "ia:sd-designs";
const CURRENT_KEY = "ia:sd-current";
const RESULTS_KEY = "ia:sd-results";

export function newDesign(name = "Untitled architecture"): SystemDesign {
  const now = new Date().toISOString();
  const client = getKind("client");
  return {
    id: uid("d"),
    name,
    nodes: [{ id: uid("n"), type: "client", label: client.defaultLabel, x: 80, y: 180, config: { ...client.defaultConfig } }],
    edges: [],
    workload: { ...DEFAULT_WORKLOAD },
    slo: { ...DEFAULT_SLO },
    difficulty: "intermediate",
    createdAt: now,
    updatedAt: now,
  };
}

export function loadCurrent(): SystemDesign | null {
  return read(CURRENT_KEY);
}

export function saveCurrent(design: SystemDesign): void {
  write(CURRENT_KEY, { ...design, updatedAt: new Date().toISOString() });
}

export function listDesigns(): SystemDesign[] {
  return read<SystemDesign[]>(DESIGNS_KEY) ?? [];
}

export function saveDesign(design: SystemDesign): SystemDesign {
  const next = { ...design, updatedAt: new Date().toISOString() };
  const all = listDesigns().filter((item) => item.id !== next.id);
  write(DESIGNS_KEY, [next, ...all].slice(0, 40));
  saveCurrent(next);
  return next;
}

export function deleteDesign(id: string): void {
  write(DESIGNS_KEY, listDesigns().filter((item) => item.id !== id));
}

export function listResults(designId?: string): SimulationResult[] {
  const all = read<SimulationResult[]>(RESULTS_KEY) ?? [];
  return designId ? all.filter((item) => item.designId === designId) : all;
}

export function saveResult(result: SimulationResult): void {
  write(RESULTS_KEY, [result, ...listResults()].slice(0, 80));
}

export function setDifficulty(design: SystemDesign, difficulty: Difficulty): SystemDesign {
  return { ...design, difficulty, updatedAt: new Date().toISOString() };
}

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}
