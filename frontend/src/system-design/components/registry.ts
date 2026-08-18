import { TIER_RANK, type ComponentType, type Difficulty, type FieldSpec } from "../models/types";
import type { ComponentKind } from "./kind";
import { ALL_KINDS } from "./library";

const registry = new Map<ComponentType, ComponentKind>();

export function registerKind(kind: ComponentKind): void {
  registry.set(kind.type, kind);
}

export function getKind(type: ComponentType): ComponentKind {
  const kind = registry.get(type);
  if (!kind) throw new Error(`Unknown component type: ${type}`);
  return kind;
}

export function listKinds(): ComponentKind[] {
  return [...registry.values()];
}

export function kindsByCategory(): { category: ComponentKind["category"]; label: string; items: ComponentKind[] }[] {
  const order: { category: ComponentKind["category"]; label: string }[] = [
    { category: "clients", label: "Clients" },
    { category: "networking", label: "Networking" },
    { category: "compute", label: "Compute" },
    { category: "cache", label: "Cache" },
    { category: "database", label: "Database" },
    { category: "messaging", label: "Messaging" },
    { category: "storage", label: "Storage" },
    { category: "reliability", label: "Reliability" },
  ];
  return order
    .map((group) => ({ ...group, items: listKinds().filter((item) => item.category === group.category) }))
    .filter((group) => group.items.length > 0);
}

export function visibleFields(kind: ComponentKind, difficulty: Difficulty): FieldSpec[] {
  const rank = TIER_RANK[difficulty];
  return kind.fields.filter((field) => TIER_RANK[field.tier] <= rank);
}

for (const kind of ALL_KINDS) registerKind(kind);
