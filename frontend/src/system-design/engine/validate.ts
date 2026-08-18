import { getKind } from "../components/registry";
import type { SystemDesign } from "../models/types";

export function validateDesign(design: SystemDesign): string[] {
  const warnings: string[] = [];
  if (!design.nodes.length) {
    return ["Add at least a Users node and one service before simulating."];
  }
  const ids = new Set(design.nodes.map((node) => node.id));
  const inbound = new Map<string, number>();
  const outbound = new Map<string, number>();
  for (const node of design.nodes) {
    inbound.set(node.id, 0);
    outbound.set(node.id, 0);
  }
  for (const edge of design.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      warnings.push("A connection points at a missing component.");
      continue;
    }
    outbound.set(edge.source, (outbound.get(edge.source) ?? 0) + 1);
    inbound.set(edge.target, (inbound.get(edge.target) ?? 0) + 1);
    if (edge.source === edge.target) warnings.push("A component connects to itself.");
  }

  const hasClient = design.nodes.some((node) => node.type === "client");
  if (!hasClient) warnings.push("No traffic source. Add a Users / Client node.");

  const isolated = design.nodes.filter((node) => (inbound.get(node.id) ?? 0) + (outbound.get(node.id) ?? 0) === 0);
  if (isolated.length && design.nodes.length > 1) {
    warnings.push(`${isolated.length} component${isolated.length === 1 ? "" : "s"} are disconnected.`);
  }

  if (hasCycle(design)) warnings.push("The graph has a cycle. Traffic still flows, but latency can look optimistic.");

  const stores = design.nodes.filter((node) => ["postgresql", "mysql", "nosql", "object_storage", "kafka"].includes(node.type));
  if (!stores.length) warnings.push("No durable store. Data will have nowhere to live.");

  const apis = design.nodes.filter((node) => node.type === "api_server");
  const lbs = design.nodes.filter((node) => node.type === "load_balancer");
  if (apis.length > 1 && !lbs.length) warnings.push("Multiple API servers without a load balancer.");

  const primaries = design.nodes.filter((node) => ["postgresql", "mysql", "nosql"].includes(node.type));
  if (primaries.length === 1) {
    const replicas = Number(primaries[0].config.readReplicas ?? 0);
    if (replicas < 1) warnings.push("Single database with no replicas — a single point of failure.");
  }

  for (const node of design.nodes) {
    try {
      getKind(node.type);
    } catch {
      warnings.push(`Unknown component type ${node.type}.`);
    }
  }
  return warnings;
}

function hasCycle(design: SystemDesign): boolean {
  const adj = new Map<string, string[]>();
  for (const node of design.nodes) adj.set(node.id, []);
  for (const edge of design.edges) adj.get(edge.source)?.push(edge.target);
  const state = new Map<string, number>();
  function visit(id: string): boolean {
    const current = state.get(id) ?? 0;
    if (current === 1) return true;
    if (current === 2) return false;
    state.set(id, 1);
    for (const next of adj.get(id) ?? []) {
      if (visit(next)) return true;
    }
    state.set(id, 2);
    return false;
  }
  return design.nodes.some((node) => visit(node.id));
}
