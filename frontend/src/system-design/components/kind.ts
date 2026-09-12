import type {
  ComponentCategory,
  ComponentSimResult,
  ComponentType,
  FieldSpec,
  SimContext,
  Traffic,
} from "../models/types";

/** What to say about this component in an interview: when it belongs, what it costs you, what you will be asked. */
export type InterviewNotes = {
  whenToUse: string;
  tradeoffs: string[];
  questions: string[];
};

export type ComponentKind = {
  type: ComponentType;
  label: string;
  category: ComponentCategory;
  description: string;
  icon: string;
  defaultLabel: string;
  interview: InterviewNotes;
  defaultConfig: Record<string, string | number | boolean>;
  fields: FieldSpec[];
  simulate: (
    config: Record<string, string | number | boolean>,
    incoming: Traffic,
    context: SimContext,
  ) => ComponentSimResult;
};

export function result(partial: Partial<ComponentSimResult> & Pick<ComponentSimResult, "processedRps" | "latency">): ComponentSimResult {
  return {
    droppedRps: 0,
    rejectedRps: 0,
    utilization: {},
    outgoing: [],
    notes: [],
    ...partial,
  };
}
