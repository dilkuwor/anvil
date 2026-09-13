import { binarySearchViz } from "./binary-search";
import { cacheAsideViz } from "./cache-aside";
import { consistentHashingViz } from "./consistent-hashing";
import { graphTraversalViz } from "./graph-traversal";
import { slidingWindowViz } from "./sliding-window";
import type { AnyVizDefinition } from "./types";

/**
 * Lessons reference a visualizer by id on a single directive line:
 *
 *     :::viz sliding-window {"array": [2,3,1,2,4,3], "target": 7}
 *
 * Adding a visual is adding a definition here. Nothing else in the app needs to change.
 */
const DEFINITIONS: AnyVizDefinition[] = [slidingWindowViz, binarySearchViz, graphTraversalViz, cacheAsideViz, consistentHashingViz];

const REGISTRY = new Map<string, AnyVizDefinition>(DEFINITIONS.map((definition) => [definition.id, definition]));

export function getViz(id: string): AnyVizDefinition | undefined {
  return REGISTRY.get(id.trim().toLowerCase());
}

export function listViz(): AnyVizDefinition[] {
  return [...REGISTRY.values()];
}

export type VizDirective = { id: string; params: Record<string, unknown> };

/**
 * Parses a visualizer directive. Lessons write it as one line, `:::viz <id> {json?}`;
 * the leading colons are optional so the info string of a fence parses too.
 * Returns null when the text is not a viz directive.
 */
export function parseVizDirective(info: string): VizDirective | null {
  const trimmed = info.trim().replace(/^:::\s*/, "");
  if (!/^viz(\s|$)/i.test(trimmed)) return null;
  const rest = trimmed.replace(/^viz\s*/i, "");
  const match = rest.match(/^([a-z0-9-]+)\s*(\{[\s\S]*\})?\s*$/i);
  if (!match) return { id: rest.split(/\s+/)[0] ?? "", params: {} };
  let params: Record<string, unknown> = {};
  if (match[2]) {
    try {
      const parsed = JSON.parse(match[2]);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) params = parsed as Record<string, unknown>;
    } catch {
      params = {};
    }
  }
  return { id: match[1].toLowerCase(), params };
}
